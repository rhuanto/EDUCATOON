import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, run, get, all } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'educatoon-demo-secret';
const PORT = Number(process.env.PORT || 3000);
const reset = process.argv.includes('--reset');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage });

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    rol: row.rol,
    estado: row.estado,
    nombres: row.nombres,
    apellidos: row.apellidos,
    apellido_paterno: row.apellido_paterno || '',
    apellido_materno: row.apellido_materno || '',
    dni: row.dni || '',
    edad: row.edad ?? null,
    telefono: row.telefono || '',
    direccion: row.direccion || ''
  };
}

function tokenFor(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, rol: user.rol, estado: user.estado },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

async function userById(id) {
  return get(`
    SELECT u.id, u.email, u.password_hash, u.estado, r.nombre AS rol,
           p.nombres, p.apellidos, p.apellido_paterno, p.apellido_materno, p.dni, p.edad, p.telefono, p.direccion
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    JOIN perfiles p ON p.usuario_id = u.id
    WHERE u.id = ?
  `, [id]);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token requerido.' });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth.rol)) {
      return res.status(403).json({ message: 'No tienes permisos para esta operación.' });
    }
    next();
  };
}

async function canAccessSection(userId, role, sectionId) {
  if (['ADMINISTRADOR', 'COORDINADOR'].includes(role)) return true;
  if (role === 'DOCENTE') {
    const row = await get('SELECT id FROM secciones WHERE id = ? AND docente_id = ?', [sectionId, userId]);
    return Boolean(row);
  }
  const enrollment = await get('SELECT id FROM matriculas WHERE seccion_id = ? AND alumno_id = ? AND estado = ?', [sectionId, userId, 'ACTIVA']);
  return Boolean(enrollment);
}



async function taskById(taskId) {
  return get('SELECT * FROM tareas WHERE id = ?', [taskId]);
}

async function deliveryById(deliveryId) {
  return get(`
    SELECT e.*, t.seccion_id, t.docente_id AS tarea_docente_id
    FROM entregas_tarea e
    JOIN tareas t ON t.id = e.tarea_id
    WHERE e.id = ?
  `, [deliveryId]);
}

async function canAccessAsesoria(userId, role, asesoriaId) {
  if (['ADMINISTRADOR', 'COORDINADOR'].includes(role)) return true;
  const row = await get('SELECT id FROM asesorias WHERE id = ? AND (alumno_id = ? OR docente_id = ?)', [asesoriaId, userId, userId]);
  return Boolean(row);
}

async function main() {
  await initDb({ reset });
  if (reset) {
    console.log('Base de datos reiniciada correctamente.');
    process.exit(0);
  }

  const app = express();
  const allowedOrigins = new Set([
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    process.env.FRONTEND_ORIGIN
  ].filter(Boolean));

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true
  }));
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));
  app.use(morgan('dev'));

  app.get('/', (req, res) => {
    res.json({
      ok: true,
      service: 'educatoon-api',
      message: 'API de Educatoon activa'
    });
  });

  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'educatoon-api', database: 'sqlite' }));

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });

    const row = await get(`
      SELECT u.id, u.email, u.password_hash, u.estado, r.nombre AS rol,
             p.nombres, p.apellidos, p.apellido_paterno, p.apellido_materno, p.dni, p.edad, p.telefono, p.direccion
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      JOIN perfiles p ON p.usuario_id = u.id
      WHERE lower(u.email) = lower(?)
    `, [email]);

    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    if (row.estado !== 'APROBADO') {
      return res.status(403).json({ message: 'Tu perfil está pendiente de aprobación.' });
    }

    const user = publicUser(row);
    res.json({ token: tokenFor(user), user });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { nombres, apellidos, email, password, dni, telefono, direccion } = req.body || {};
    if (!nombres || !apellidos || !email || !password) {
      return res.status(400).json({ message: 'Nombres, apellidos, correo y contraseña son obligatorios.' });
    }
    const existing = await get('SELECT id FROM usuarios WHERE lower(email) = lower(?)', [email]);
    if (existing) return res.status(409).json({ message: 'El correo ya se encuentra registrado.' });

    const role = await get('SELECT id FROM roles WHERE nombre = ?', ['ALUMNO']);
    const hash = await bcrypt.hash(password, 10);
    const created = await run('INSERT INTO usuarios(email, password_hash, rol_id, estado) VALUES (?, ?, ?, ?)', [email, hash, role.id, 'PENDIENTE']);
    const parts = (apellidos || '').trim().split(/\s+/);
    const apellido_paterno = parts[0] || '';
    const apellido_materno = parts.slice(1).join(' ');
    await run(
      'INSERT INTO perfiles(usuario_id, nombres, apellidos, apellido_paterno, apellido_materno, dni, edad, telefono, direccion, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [created.lastID, nombres, apellidos, apellido_paterno, apellido_materno, dni || '', null, telefono || '', direccion || '', 'PENDIENTE']
    );
    res.status(201).json({ message: 'Registro creado. Tu perfil queda en estado PENDIENTE hasta ser aprobado.', id: created.lastID });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    const row = await userById(req.auth.sub);
    res.json(publicUser(row));
  });

  app.put('/api/me/perfil', requireAuth, async (req, res) => {
    const { nombres, apellidos, dni, telefono, direccion } = req.body || {};
    if (!nombres || !apellidos) {
      return res.status(400).json({ message: 'Nombres y apellidos son obligatorios.' });
    }
    const parts = (apellidos || '').trim().split(/\s+/);
    const apellido_paterno = parts[0] || '';
    const apellido_materno = parts.slice(1).join(' ');
    await run(
      'UPDATE perfiles SET nombres = ?, apellidos = ?, apellido_paterno = ?, apellido_materno = ?, dni = ?, telefono = ?, direccion = ? WHERE usuario_id = ?',
      [nombres, apellidos, apellido_paterno, apellido_materno, dni || '', telefono || '', direccion || '', req.auth.sub]
    );
    const row = await userById(req.auth.sub);
    res.json(publicUser(row));
  });

  app.get('/api/bootstrap', requireAuth, async (req, res) => {
    const role = req.auth.rol;
    const userId = req.auth.sub;

    let seccionesSql = `
      SELECT s.*, c.nombre AS curso, c.descripcion AS curso_descripcion, p.nombres || ' ' || p.apellidos AS docente,
             (SELECT COUNT(*) FROM matriculas m2 WHERE m2.seccion_id = s.id AND m2.estado = 'ACTIVA') AS matriculados
      FROM secciones s
      JOIN cursos c ON c.id = s.curso_id
      LEFT JOIN perfiles p ON p.usuario_id = s.docente_id
    `;
    const params = [];
    if (role === 'ALUMNO') {
      seccionesSql += ' JOIN matriculas m ON m.seccion_id = s.id WHERE m.alumno_id = ? AND m.estado = ?';
      params.push(userId, 'ACTIVA');
    } else if (role === 'DOCENTE') {
      seccionesSql += ' WHERE s.docente_id = ?';
      params.push(userId);
    }
    seccionesSql += ' ORDER BY c.nombre, s.codigo';

    const [roles, cursos, secciones] = await Promise.all([
      all('SELECT * FROM roles ORDER BY id'),
      all('SELECT * FROM cursos ORDER BY nombre'),
      all(seccionesSql, params)
    ]);

    const accessibleIds = secciones.map((s) => s.id);
    const ids = accessibleIds.length ? accessibleIds : [-1];
    const placeholders = ids.map(() => '?').join(',');

    const [materiales, tareas, entregas, reuniones, evaluaciones, progreso, asesorias] = await Promise.all([
      all(`
        SELECT m.*, s.codigo AS seccion_codigo, c.nombre AS curso, p.nombres || ' ' || p.apellidos AS docente
        FROM materiales m
        JOIN secciones s ON s.id = m.seccion_id
        JOIN cursos c ON c.id = s.curso_id
        JOIN perfiles p ON p.usuario_id = m.docente_id
        WHERE m.seccion_id IN (${placeholders})
        ORDER BY m.created_at DESC
      `, ids),
      all(`
        SELECT t.*, s.codigo AS seccion_codigo, c.nombre AS curso, p.nombres || ' ' || p.apellidos AS docente
        FROM tareas t
        JOIN secciones s ON s.id = t.seccion_id
        JOIN cursos c ON c.id = s.curso_id
        JOIN perfiles p ON p.usuario_id = t.docente_id
        WHERE t.seccion_id IN (${placeholders})
        ORDER BY t.fecha_entrega ASC, t.id ASC
      `, ids),
      all(`
        SELECT e.*, t.titulo AS tarea, t.seccion_id, t.semana, t.fecha_entrega, c.nombre AS curso,
               s.codigo AS seccion_codigo, p.nombres || ' ' || p.apellidos AS alumno, u.email AS alumno_email
        FROM entregas_tarea e
        JOIN tareas t ON t.id = e.tarea_id
        JOIN secciones s ON s.id = t.seccion_id
        JOIN cursos c ON c.id = s.curso_id
        JOIN usuarios u ON u.id = e.alumno_id
        JOIN perfiles p ON p.usuario_id = e.alumno_id
        WHERE t.seccion_id IN (${placeholders}) AND (? != 'ALUMNO' OR e.alumno_id = ?)
        ORDER BY e.created_at DESC, e.id DESC
      `, [...ids, role, userId]),
      all(`
        SELECT r.*, s.codigo AS seccion_codigo, c.nombre AS curso
        FROM reuniones r
        JOIN secciones s ON s.id = r.seccion_id
        JOIN cursos c ON c.id = s.curso_id
        WHERE r.seccion_id IN (${placeholders})
        ORDER BY r.fecha ASC
      `, ids),
      all(`
        SELECT e.*, s.codigo AS seccion_codigo, c.nombre AS curso
        FROM evaluaciones e
        JOIN secciones s ON s.id = e.seccion_id
        JOIN cursos c ON c.id = s.curso_id
        WHERE e.seccion_id IN (${placeholders})
        ORDER BY e.fecha ASC
      `, ids),
      all(`
        SELECT pa.*, s.codigo AS seccion_codigo, c.nombre AS curso
        FROM progreso_academico pa
        JOIN secciones s ON s.id = pa.seccion_id
        JOIN cursos c ON c.id = s.curso_id
        WHERE pa.seccion_id IN (${placeholders}) AND (? != 'ALUMNO' OR pa.alumno_id = ?)
        ORDER BY c.nombre
      `, [...ids, role, userId]),
      all(`
        SELECT a.*, c.nombre AS curso,
               alumno.nombres || ' ' || alumno.apellidos AS alumno,
               docente.nombres || ' ' || docente.apellidos AS docente
        FROM asesorias a
        JOIN cursos c ON c.id = a.curso_id
        JOIN perfiles alumno ON alumno.usuario_id = a.alumno_id
        JOIN perfiles docente ON docente.usuario_id = a.docente_id
        WHERE (? NOT IN ('ALUMNO', 'DOCENTE') OR a.alumno_id = ? OR a.docente_id = ?)
        ORDER BY a.fecha_programada ASC
      `, [role, userId, userId])
    ]);

    res.json({ roles, cursos, secciones, materiales, tareas, entregas, reuniones, evaluaciones, progreso, asesorias });
  });

  app.get('/api/secciones/:id/canales', requireAuth, async (req, res) => {
    const sectionId = Number(req.params.id);
    if (!(await canAccessSection(req.auth.sub, req.auth.rol, sectionId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta sección.' });
    }
    const canales = await all('SELECT * FROM canales WHERE seccion_id = ? ORDER BY id', [sectionId]);
    res.json(canales);
  });

  app.get('/api/canales/:id/mensajes', requireAuth, async (req, res) => {
    const channel = await get('SELECT * FROM canales WHERE id = ?', [req.params.id]);
    if (!channel) return res.status(404).json({ message: 'Canal no encontrado.' });
    if (!(await canAccessSection(req.auth.sub, req.auth.rol, channel.seccion_id))) {
      return res.status(403).json({ message: 'No tienes acceso a este canal.' });
    }
    const mensajes = await all(`
      SELECT m.*, u.email, r.nombre AS rol, p.nombres || ' ' || p.apellidos AS autor
      FROM mensajes m
      JOIN usuarios u ON u.id = m.usuario_id
      JOIN roles r ON r.id = u.rol_id
      JOIN perfiles p ON p.usuario_id = u.id
      WHERE m.canal_id = ?
      ORDER BY m.created_at ASC, m.id ASC
    `, [req.params.id]);
    res.json(mensajes);
  });

  app.post('/api/canales/:id/mensajes', requireAuth, async (req, res) => {
    const { contenido } = req.body || {};
    if (!contenido || contenido.trim().length < 1) return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
    const channel = await get('SELECT * FROM canales WHERE id = ?', [req.params.id]);
    if (!channel) return res.status(404).json({ message: 'Canal no encontrado.' });
    if (!(await canAccessSection(req.auth.sub, req.auth.rol, channel.seccion_id))) {
      return res.status(403).json({ message: 'No tienes acceso a este canal.' });
    }
    const created = await run('INSERT INTO mensajes(canal_id, usuario_id, contenido) VALUES (?, ?, ?)', [req.params.id, req.auth.sub, contenido.trim()]);
    const mensaje = await get(`
      SELECT m.*, u.email, r.nombre AS rol, p.nombres || ' ' || p.apellidos AS autor
      FROM mensajes m
      JOIN usuarios u ON u.id = m.usuario_id
      JOIN roles r ON r.id = u.rol_id
      JOIN perfiles p ON p.usuario_id = u.id
      WHERE m.id = ?
    `, [created.lastID]);
    res.status(201).json(mensaje);
  });

  app.post('/api/usuarios', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res) => {
    const { nombres, apellido_paterno, apellido_materno, email, password, rol, estado, dni, edad, telefono, direccion } = req.body || {};
    if (!nombres || !apellido_paterno || !apellido_materno || !email || !password || !rol) {
      return res.status(400).json({ message: 'Nombres, apellidos, correo, contraseña y rol son obligatorios.' });
    }
    const allowedRoles = ['ALUMNO', 'DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'];
    if (!allowedRoles.includes(rol)) return res.status(400).json({ message: 'Rol no válido.' });
    const existing = await get('SELECT id FROM usuarios WHERE lower(email) = lower(?)', [email]);
    if (existing) return res.status(409).json({ message: 'El correo ya se encuentra registrado.' });
    const role = await get('SELECT id FROM roles WHERE nombre = ?', [rol]);
    if (!role) return res.status(400).json({ message: 'Rol no encontrado.' });
    const hash = await bcrypt.hash(password, 10);
    const normalizedStatus = estado === 'PENDIENTE' ? 'PENDIENTE' : 'APROBADO';
    const apellidos = `${apellido_paterno} ${apellido_materno}`.trim();
    const created = await run('INSERT INTO usuarios(email, password_hash, rol_id, estado) VALUES (?, ?, ?, ?)', [email, hash, role.id, normalizedStatus]);
    await run(
      'INSERT INTO perfiles(usuario_id, nombres, apellidos, apellido_paterno, apellido_materno, dni, edad, telefono, direccion, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [created.lastID, nombres, apellidos, apellido_paterno, apellido_materno, dni || '', edad || null, telefono || '', direccion || '', normalizedStatus]
    );
    res.status(201).json({ message: 'Usuario creado correctamente.', id: created.lastID });
  });


  app.put('/api/usuarios/:id', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res) => {
    const userId = Number(req.params.id);
    const { nombres, apellido_paterno, apellido_materno, email, password, rol, estado, dni, edad, telefono, direccion } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'Usuario no válido.' });
    if (!nombres || !apellido_paterno || !apellido_materno || !email || !rol) {
      return res.status(400).json({ message: 'Nombres, apellidos, correo y rol son obligatorios.' });
    }
    const allowedRoles = ['ALUMNO', 'DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'];
    if (!allowedRoles.includes(rol)) return res.status(400).json({ message: 'Rol no válido.' });
    const user = await get('SELECT id FROM usuarios WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    const duplicated = await get('SELECT id FROM usuarios WHERE lower(email) = lower(?) AND id <> ?', [email, userId]);
    if (duplicated) return res.status(409).json({ message: 'El correo ya se encuentra registrado por otro usuario.' });
    const roleRow = await get('SELECT id FROM roles WHERE nombre = ?', [rol]);
    if (!roleRow) return res.status(400).json({ message: 'Rol no encontrado.' });
    const normalizedStatus = estado === 'PENDIENTE' ? 'PENDIENTE' : 'APROBADO';
    if (password && String(password).trim().length > 0) {
      const hash = await bcrypt.hash(password, 10);
      await run('UPDATE usuarios SET email = ?, password_hash = ?, rol_id = ?, estado = ? WHERE id = ?', [email, hash, roleRow.id, normalizedStatus, userId]);
    } else {
      await run('UPDATE usuarios SET email = ?, rol_id = ?, estado = ? WHERE id = ?', [email, roleRow.id, normalizedStatus, userId]);
    }
    const apellidos = `${apellido_paterno} ${apellido_materno}`.trim();
    await run(
      'UPDATE perfiles SET nombres = ?, apellidos = ?, apellido_paterno = ?, apellido_materno = ?, dni = ?, edad = ?, telefono = ?, direccion = ?, estado = ? WHERE usuario_id = ?',
      [nombres, apellidos, apellido_paterno, apellido_materno, dni || '', edad || null, telefono || '', direccion || '', normalizedStatus, userId]
    );
    res.json({ message: 'Usuario actualizado correctamente.' });
  });

  app.delete('/api/usuarios/:id', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res) => {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ message: 'Usuario no válido.' });
    if (userId === Number(req.auth.sub)) return res.status(400).json({ message: 'No puedes eliminar el usuario con sesión activa.' });
    const user = await get('SELECT id FROM usuarios WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

    // Limpieza explícita para que el borrado funcione en la demo con SQLite y claves foráneas.
    await run('DELETE FROM entregas_tarea WHERE alumno_id = ? OR docente_id = ?', [userId, userId]);
    await run('DELETE FROM tareas WHERE docente_id = ?', [userId]);
    await run('DELETE FROM mensajes WHERE usuario_id = ?', [userId]);
    await run('DELETE FROM materiales WHERE docente_id = ?', [userId]);
    await run('DELETE FROM asesorias WHERE alumno_id = ? OR docente_id = ?', [userId, userId]);
    await run('DELETE FROM progreso_academico WHERE alumno_id = ?', [userId]);
    await run('DELETE FROM matriculas WHERE alumno_id = ?', [userId]);
    await run('UPDATE secciones SET docente_id = NULL WHERE docente_id = ?', [userId]);
    await run('DELETE FROM perfiles WHERE usuario_id = ?', [userId]);
    await run('DELETE FROM usuarios WHERE id = ?', [userId]);
    res.json({ message: 'Usuario eliminado correctamente.' });
  });

  app.get('/api/usuarios/:id/detalle', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res) => {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ message: 'Usuario no válido.' });

    const usuario = await get(`
      SELECT u.id AS usuario_id, u.email, u.estado AS usuario_estado, r.nombre AS rol,
             p.id AS perfil_id, p.nombres, p.apellidos, p.apellido_paterno, p.apellido_materno,
             p.dni, p.edad, p.telefono, p.direccion, p.estado AS perfil_estado
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      JOIN perfiles p ON p.usuario_id = u.id
      WHERE u.id = ?
    `, [userId]);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });

    let cursos = [];
    if (usuario.rol === 'ALUMNO') {
      cursos = await all(`
        SELECT s.id AS seccion_id, c.id AS curso_id, c.nombre AS curso, s.codigo AS seccion_codigo,
               s.modalidad, s.aula, s.horario, COALESCE(pd.nombres || ' ' || pd.apellidos, 'Sin docente') AS docente,
               m.estado, 'MATRICULADO' AS tipo_vinculo
        FROM matriculas m
        JOIN secciones s ON s.id = m.seccion_id
        JOIN cursos c ON c.id = s.curso_id
        LEFT JOIN perfiles pd ON pd.usuario_id = s.docente_id
        WHERE m.alumno_id = ?
        ORDER BY c.nombre, s.codigo
      `, [userId]);
    } else if (usuario.rol === 'DOCENTE') {
      cursos = await all(`
        SELECT s.id AS seccion_id, c.id AS curso_id, c.nombre AS curso, s.codigo AS seccion_codigo,
               s.modalidad, s.aula, s.horario, COALESCE(pd.nombres || ' ' || pd.apellidos, 'Sin docente') AS docente,
               s.estado, 'DOCENTE ASIGNADO' AS tipo_vinculo
        FROM secciones s
        JOIN cursos c ON c.id = s.curso_id
        LEFT JOIN perfiles pd ON pd.usuario_id = s.docente_id
        WHERE s.docente_id = ?
        ORDER BY c.nombre, s.codigo
      `, [userId]);
    } else if (usuario.rol === 'COORDINADOR' || usuario.rol === 'ADMINISTRADOR') {
      cursos = await all(`
        SELECT s.id AS seccion_id, c.id AS curso_id, c.nombre AS curso, s.codigo AS seccion_codigo,
               s.modalidad, s.aula, s.horario, COALESCE(pd.nombres || ' ' || pd.apellidos, 'Sin docente') AS docente,
               s.estado, 'ACCESO ADMINISTRATIVO' AS tipo_vinculo
        FROM secciones s
        JOIN cursos c ON c.id = s.curso_id
        LEFT JOIN perfiles pd ON pd.usuario_id = s.docente_id
        ORDER BY c.nombre, s.codigo
      `);
    }

    res.json({ usuario, cursos });
  });

  app.get('/api/perfiles', requireAuth, requireRoles('ADMINISTRADOR', 'COORDINADOR'), async (req, res) => {
    const rows = await all(`
      SELECT u.id AS usuario_id, u.email, u.estado AS usuario_estado, r.nombre AS rol,
             p.id AS perfil_id, p.nombres, p.apellidos, p.apellido_paterno, p.apellido_materno, p.dni, p.edad, p.telefono, p.direccion, p.estado AS perfil_estado
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      JOIN perfiles p ON p.usuario_id = u.id
      ORDER BY u.estado DESC, p.apellidos
    `);
    res.json(rows);
  });

  app.put('/api/perfiles/:usuarioId/aprobar', requireAuth, requireRoles('ADMINISTRADOR', 'COORDINADOR'), async (req, res) => {
    const user = await get('SELECT id FROM usuarios WHERE id = ?', [req.params.usuarioId]);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    await run('UPDATE usuarios SET estado = ? WHERE id = ?', ['APROBADO', req.params.usuarioId]);
    await run('UPDATE perfiles SET estado = ? WHERE usuario_id = ?', ['APROBADO', req.params.usuarioId]);
    res.json({ message: 'Perfil aprobado correctamente.' });
  });

  app.post('/api/materiales', requireAuth, requireRoles('DOCENTE', 'ADMINISTRADOR'), upload.single('archivo'), async (req, res) => {
    const { seccion_id, titulo, tipo, descripcion, semana } = req.body || {};
    const sectionId = Number(seccion_id);
    if (!sectionId || !titulo || !tipo) {
      return res.status(400).json({ message: 'Sección, título y tipo son obligatorios.' });
    }
    if (!(await canAccessSection(req.auth.sub, req.auth.rol, sectionId))) {
      return res.status(403).json({ message: 'No tienes permisos para cargar material en esta sección.' });
    }
    const archivoUrl = req.file ? `/uploads/${req.file.filename}` : '#';
    const created = await run(
      'INSERT INTO materiales(seccion_id, docente_id, semana, titulo, tipo, archivo_url, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sectionId, req.auth.sub, semana || 'semana1', titulo, tipo, archivoUrl, descripcion || 'Material cargado desde la demo local.']
    );
    res.status(201).json({ message: 'Material cargado correctamente.', id: created.lastID, archivo_url: archivoUrl });
  });




  app.post('/api/tareas', requireAuth, requireRoles('DOCENTE', 'ADMINISTRADOR'), upload.single('archivo'), async (req, res) => {
    const { seccion_id, semana, titulo, instruccion, fecha_entrega, tipo } = req.body || {};
    const sectionId = Number(seccion_id);
    if (!sectionId || !titulo || !instruccion || !fecha_entrega) {
      return res.status(400).json({ message: 'Sección, título, instrucción y fecha de entrega son obligatorios.' });
    }
    if (!(await canAccessSection(req.auth.sub, req.auth.rol, sectionId))) {
      return res.status(403).json({ message: 'No tienes permisos para crear tareas en esta sección.' });
    }
    const archivoUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const created = await run(
      'INSERT INTO tareas(seccion_id, docente_id, semana, titulo, instruccion, fecha_entrega, tipo, archivo_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sectionId, req.auth.sub, semana || 'semana1', titulo.trim(), instruccion.trim(), fecha_entrega, tipo || 'TAREA', archivoUrl, 'ABIERTA']
    );
    res.status(201).json({ message: 'Tarea creada correctamente.', id: created.lastID, archivo_url: archivoUrl });
  });

  app.post('/api/tareas/:id/entregas', requireAuth, requireRoles('ALUMNO'), upload.single('archivo'), async (req, res) => {
    const tareaId = Number(req.params.id);
    const { comentario } = req.body || {};
    const tarea = await taskById(tareaId);
    if (!tarea) return res.status(404).json({ message: 'Tarea no encontrada.' });
    if (!(await canAccessSection(req.auth.sub, req.auth.rol, tarea.seccion_id))) {
      return res.status(403).json({ message: 'No tienes acceso a esta tarea.' });
    }
    const archivoUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const existing = await get('SELECT id FROM entregas_tarea WHERE tarea_id = ? AND alumno_id = ?', [tareaId, req.auth.sub]);
    if (existing) {
      await run(
        "UPDATE entregas_tarea SET archivo_url = COALESCE(NULLIF(?, ''), archivo_url), comentario = ?, estado = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
        [archivoUrl, comentario || '', 'ENTREGADA', existing.id]
      );
      return res.json({ message: 'Entrega actualizada correctamente.', id: existing.id });
    }
    const created = await run(
      'INSERT INTO entregas_tarea(tarea_id, alumno_id, archivo_url, comentario, estado) VALUES (?, ?, ?, ?, ?)',
      [tareaId, req.auth.sub, archivoUrl, comentario || '', 'ENTREGADA']
    );
    res.status(201).json({ message: 'Tarea entregada correctamente.', id: created.lastID, archivo_url: archivoUrl });
  });

  app.put('/api/entregas/:id/calificar', requireAuth, requireRoles('DOCENTE', 'ADMINISTRADOR'), async (req, res) => {
    const entregaId = Number(req.params.id);
    const { nota, retroalimentacion } = req.body || {};
    const entrega = await deliveryById(entregaId);
    if (!entrega) return res.status(404).json({ message: 'Entrega no encontrada.' });
    if (!(await canAccessSection(req.auth.sub, req.auth.rol, entrega.seccion_id))) {
      return res.status(403).json({ message: 'No tienes permisos para calificar esta entrega.' });
    }
    const score = Number(nota);
    if (Number.isNaN(score) || score < 0 || score > 20) {
      return res.status(400).json({ message: 'La nota debe ser un número entre 0 y 20.' });
    }
    await run(
      'UPDATE entregas_tarea SET nota = ?, retroalimentacion = ?, docente_id = ?, estado = ?, calificado_at = CURRENT_TIMESTAMP WHERE id = ?',
      [score, retroalimentacion || '', req.auth.sub, 'CALIFICADA', entregaId]
    );
    res.json({ message: 'Nota registrada correctamente.' });
  });

  app.get('/api/asesorias/:id', requireAuth, async (req, res) => {
    const asesoriaId = Number(req.params.id);
    if (!asesoriaId) return res.status(400).json({ message: 'Asesoría no válida.' });
    if (!(await canAccessAsesoria(req.auth.sub, req.auth.rol, asesoriaId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta asesoría.' });
    }
    const asesoria = await get(`
      SELECT a.*, c.nombre AS curso,
             alumno.nombres || ' ' || alumno.apellidos AS alumno,
             docente.nombres || ' ' || docente.apellidos AS docente
      FROM asesorias a
      JOIN cursos c ON c.id = a.curso_id
      JOIN perfiles alumno ON alumno.usuario_id = a.alumno_id
      JOIN perfiles docente ON docente.usuario_id = a.docente_id
      WHERE a.id = ?
    `, [asesoriaId]);
    if (!asesoria) return res.status(404).json({ message: 'Asesoría no encontrada.' });
    const mensajes = await all(`
      SELECT am.*, p.nombres || ' ' || p.apellidos AS autor, r.nombre AS rol
      FROM asesorias_mensajes am
      JOIN usuarios u ON u.id = am.usuario_id
      JOIN perfiles p ON p.usuario_id = u.id
      JOIN roles r ON r.id = u.rol_id
      WHERE am.asesoria_id = ?
      ORDER BY am.created_at ASC, am.id ASC
    `, [asesoriaId]);
    const materiales = await all(`
      SELECT mat.*, p.nombres || ' ' || p.apellidos AS docente
      FROM asesorias_materiales mat
      JOIN perfiles p ON p.usuario_id = mat.docente_id
      WHERE mat.asesoria_id = ?
      ORDER BY mat.created_at DESC
    `, [asesoriaId]);
    res.json({ asesoria, mensajes, materiales });
  });

  app.post('/api/asesorias', requireAuth, requireRoles('ADMINISTRADOR', 'COORDINADOR'), async (req, res) => {
    const { alumno_id, docente_id, curso_id, tema, motivo, areas_refuerzo, fecha_programada, modalidad, enlace } = req.body || {};
    if (!alumno_id || !docente_id || !curso_id || !tema || !motivo || !areas_refuerzo || !fecha_programada) {
      return res.status(400).json({ message: 'Alumno, docente, curso, tema, motivo, áreas y fecha son obligatorios.' });
    }
    const alumno = await get(`SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ? AND r.nombre = 'ALUMNO' AND u.estado = 'APROBADO'`, [alumno_id]);
    const docente = await get(`SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ? AND r.nombre = 'DOCENTE' AND u.estado = 'APROBADO'`, [docente_id]);
    const curso = await get('SELECT id FROM cursos WHERE id = ?', [curso_id]);
    if (!alumno) return res.status(404).json({ message: 'Alumno aprobado no encontrado.' });
    if (!docente) return res.status(404).json({ message: 'Docente aprobado no encontrado.' });
    if (!curso) return res.status(404).json({ message: 'Curso no encontrado.' });
    const created = await run(
      'INSERT INTO asesorias(alumno_id, docente_id, curso_id, tema, motivo, areas_refuerzo, fecha_programada, modalidad, enlace, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [alumno_id, docente_id, curso_id, tema.trim(), motivo.trim(), areas_refuerzo.trim(), fecha_programada, modalidad || 'VIRTUAL', enlace || '', 'PROGRAMADA']
    );
    res.status(201).json({ message: 'Asesoría creada correctamente.', id: created.lastID });
  });

  app.put('/api/asesorias/:id', requireAuth, requireRoles('DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'), async (req, res) => {
    const asesoriaId = Number(req.params.id);
    if (!asesoriaId) return res.status(400).json({ message: 'Asesoría no válida.' });
    if (!(await canAccessAsesoria(req.auth.sub, req.auth.rol, asesoriaId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta asesoría.' });
    }
    const { estado, observacion_final, asistencia } = req.body || {};
    const allowed = ['SOLICITADA', 'PROGRAMADA', 'REALIZADA', 'CANCELADA'];
    const normalized = allowed.includes(estado) ? estado : 'PROGRAMADA';
    await run('UPDATE asesorias SET estado = ?, observacion_final = ?, asistencia = ? WHERE id = ?', [normalized, observacion_final || '', asistencia ? 1 : 0, asesoriaId]);
    res.json({ message: 'Asesoría actualizada correctamente.' });
  });

  app.post('/api/asesorias/:id/mensajes', requireAuth, async (req, res) => {
    const asesoriaId = Number(req.params.id);
    const { contenido } = req.body || {};
    if (!asesoriaId || !contenido || !contenido.trim()) return res.status(400).json({ message: 'Mensaje no válido.' });
    if (!(await canAccessAsesoria(req.auth.sub, req.auth.rol, asesoriaId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta asesoría.' });
    }
    const created = await run('INSERT INTO asesorias_mensajes(asesoria_id, usuario_id, contenido) VALUES (?, ?, ?)', [asesoriaId, req.auth.sub, contenido.trim()]);
    const mensaje = await get(`
      SELECT am.*, p.nombres || ' ' || p.apellidos AS autor, r.nombre AS rol
      FROM asesorias_mensajes am
      JOIN usuarios u ON u.id = am.usuario_id
      JOIN perfiles p ON p.usuario_id = u.id
      JOIN roles r ON r.id = u.rol_id
      WHERE am.id = ?
    `, [created.lastID]);
    res.status(201).json(mensaje);
  });

  app.post('/api/asesorias/:id/materiales', requireAuth, requireRoles('DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'), upload.single('archivo'), async (req, res) => {
    const asesoriaId = Number(req.params.id);
    const { titulo, tipo, descripcion } = req.body || {};
    if (!asesoriaId || !titulo || !tipo) return res.status(400).json({ message: 'Asesoría, título y tipo son obligatorios.' });
    if (!(await canAccessAsesoria(req.auth.sub, req.auth.rol, asesoriaId))) {
      return res.status(403).json({ message: 'No tienes acceso a esta asesoría.' });
    }
    const archivoUrl = req.file ? `/uploads/${req.file.filename}` : '#';
    const created = await run(
      'INSERT INTO asesorias_materiales(asesoria_id, docente_id, titulo, tipo, archivo_url, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
      [asesoriaId, req.auth.sub, titulo.trim(), tipo, archivoUrl, descripcion || 'Material de refuerzo para la asesoría.']
    );
    res.status(201).json({ message: 'Material de asesoría cargado correctamente.', id: created.lastID, archivo_url: archivoUrl });
  });

  app.post('/api/cursos', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res) => {
    const { nombre, descripcion, ciclo, estado } = req.body || {};
    if (!nombre || !descripcion || !ciclo) {
      return res.status(400).json({ message: 'Nombre, descripción y ciclo son obligatorios.' });
    }
    const created = await run(
      'INSERT INTO cursos(nombre, descripcion, ciclo, estado) VALUES (?, ?, ?, ?)',
      [nombre.trim(), descripcion.trim(), ciclo.trim(), estado || 'ACTIVO']
    );
    res.status(201).json({ message: 'Curso creado correctamente.', id: created.lastID });
  });

  app.get('/api/alumnos', requireAuth, requireRoles('ADMINISTRADOR', 'COORDINADOR'), async (req, res) => {
    const rows = await all(`
      SELECT u.id, u.email, p.nombres || ' ' || p.apellidos AS nombre, p.dni, p.edad
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      JOIN perfiles p ON p.usuario_id = u.id
      WHERE r.nombre = 'ALUMNO' AND u.estado = 'APROBADO'
      ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres
    `);
    res.json(rows);
  });

  app.post('/api/secciones/:id/matriculas', requireAuth, requireRoles('ADMINISTRADOR', 'COORDINADOR'), async (req, res) => {
    const seccionId = Number(req.params.id);
    const { alumno_id } = req.body || {};
    if (!seccionId || !alumno_id) return res.status(400).json({ message: 'Sección y alumno son obligatorios.' });
    const section = await get('SELECT id FROM secciones WHERE id = ?', [seccionId]);
    if (!section) return res.status(404).json({ message: 'Sección no encontrada.' });
    const alumno = await get(`
      SELECT u.id
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ? AND r.nombre = 'ALUMNO' AND u.estado = 'APROBADO'
    `, [alumno_id]);
    if (!alumno) return res.status(404).json({ message: 'Alumno aprobado no encontrado.' });
    const existing = await get('SELECT id FROM matriculas WHERE alumno_id = ? AND seccion_id = ?', [alumno_id, seccionId]);
    if (existing) return res.status(409).json({ message: 'El alumno ya está matriculado en esta sección.' });
    const created = await run('INSERT INTO matriculas(alumno_id, seccion_id, estado) VALUES (?, ?, ?)', [alumno_id, seccionId, 'ACTIVA']);
    res.status(201).json({ message: 'Alumno añadido al curso correctamente.', id: created.lastID });
  });

  app.post('/api/secciones', requireAuth, requireRoles('ADMINISTRADOR', 'COORDINADOR'), async (req, res) => {
    const { curso_id, docente_id, codigo, capacidad, aula, modalidad, horario } = req.body || {};
    if (!curso_id || !codigo || !aula || !horario) {
      return res.status(400).json({ message: 'Curso, código, aula y horario son obligatorios.' });
    }
    const created = await run(
      'INSERT INTO secciones(curso_id, docente_id, codigo, capacidad, aula, modalidad, horario, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [curso_id, docente_id || null, codigo, capacidad || 40, aula, modalidad || 'MIXTA', horario, 'ACTIVA']
    );
    for (const [nombre, descripcion, tipo] of [
      ['Foro general', 'Avisos, acuerdos y conversación principal del curso.', 'GENERAL'],
      ['Dudas académicas', 'Preguntas de estudiantes y respuestas del docente.', 'DUDAS'],
      ['Tareas', 'Consultas y coordinación sobre actividades asignadas.', 'TAREAS'],
      ['Asesorías', 'Seguimiento de áreas de refuerzo y asesorías.', 'ASESORIAS']
    ]) {
      await run('INSERT INTO canales(seccion_id, nombre, descripcion, tipo) VALUES (?, ?, ?, ?)', [created.lastID, nombre, descripcion, tipo]);
    }
    res.status(201).json({ message: 'Sección creada correctamente.', id: created.lastID });
  });

  app.get('/api/docentes', requireAuth, requireRoles('ADMINISTRADOR', 'COORDINADOR'), async (req, res) => {
    const rows = await all(`
      SELECT u.id, u.email, p.nombres || ' ' || p.apellidos AS nombre
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      JOIN perfiles p ON p.usuario_id = u.id
      WHERE r.nombre = 'DOCENTE' AND u.estado = 'APROBADO'
      ORDER BY p.apellidos
    `);
    res.json(rows);
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Error interno del servidor.', detail: err.message });
  });

  app.listen(PORT, () => {
    console.log(`Educatoon API corriendo en http://localhost:${PORT}`);
    console.log('SQLite activo en backend/data/educatoon.db');
  });
}

main().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
