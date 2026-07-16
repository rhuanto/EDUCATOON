import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '..', 'data');
export const dbPath = path.join(dataDir, 'educatoon.db');

sqlite3.verbose();

let db;

export function openDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!db) db = new sqlite3.Database(dbPath);
  db.run('PRAGMA foreign_keys = ON');
  return db;
}

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    openDb().run(sql, params, function callback(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    openDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    openDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function removeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}

export async function initDb({ reset = false } = {}) {
  if (reset) removeDatabase();
  openDb();

  await run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol_id INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS perfiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    apellido_paterno TEXT,
    apellido_materno TEXT,
    dni TEXT,
    edad INTEGER,
    telefono TEXT,
    direccion TEXT,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )`);

  await ensureColumn('perfiles', 'apellido_paterno', 'TEXT');
  await ensureColumn('perfiles', 'apellido_materno', 'TEXT');
  await ensureColumn('perfiles', 'edad', 'INTEGER');

  await run(`CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    ciclo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS secciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curso_id INTEGER NOT NULL,
    docente_id INTEGER,
    codigo TEXT NOT NULL UNIQUE,
    capacidad INTEGER NOT NULL DEFAULT 40,
    aula TEXT NOT NULL,
    modalidad TEXT NOT NULL DEFAULT 'MIXTA',
    horario TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVA',
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS matriculas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER NOT NULL,
    seccion_id INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVA',
    fecha_matricula TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(alumno_id, seccion_id),
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id),
    FOREIGN KEY (seccion_id) REFERENCES secciones(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS canales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seccion_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'ACADEMICO',
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canal_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    contenido TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (canal_id) REFERENCES canales(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS materiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seccion_id INTEGER NOT NULL,
    docente_id INTEGER NOT NULL,
    semana TEXT NOT NULL DEFAULT 'semana1',
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    archivo_url TEXT NOT NULL,
    descripcion TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
  )`);

  await ensureColumn('materiales', 'semana', "TEXT NOT NULL DEFAULT 'semana1'");

  await run(`CREATE TABLE IF NOT EXISTS tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seccion_id INTEGER NOT NULL,
    docente_id INTEGER NOT NULL,
    semana TEXT NOT NULL DEFAULT 'semana1',
    titulo TEXT NOT NULL,
    instruccion TEXT NOT NULL,
    fecha_entrega TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'TAREA',
    archivo_url TEXT DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'ABIERTA',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS entregas_tarea (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarea_id INTEGER NOT NULL,
    alumno_id INTEGER NOT NULL,
    archivo_url TEXT DEFAULT '',
    comentario TEXT DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'ENTREGADA',
    nota REAL,
    retroalimentacion TEXT DEFAULT '',
    docente_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    calificado_at TEXT,
    UNIQUE(tarea_id, alumno_id),
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reuniones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seccion_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    fecha TEXT NOT NULL,
    enlace TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'CLASE',
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS evaluaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seccion_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    fecha TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PROGRAMADA',
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS progreso_academico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER NOT NULL,
    seccion_id INTEGER NOT NULL,
    promedio REAL NOT NULL,
    porcentaje_asistencia REAL NOT NULL,
    requiere_asesoria INTEGER NOT NULL DEFAULT 0,
    observacion TEXT,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id),
    FOREIGN KEY (seccion_id) REFERENCES secciones(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS asesorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER NOT NULL,
    docente_id INTEGER NOT NULL,
    curso_id INTEGER NOT NULL,
    tema TEXT NOT NULL,
    motivo TEXT DEFAULT '',
    areas_refuerzo TEXT NOT NULL,
    fecha_programada TEXT NOT NULL,
    modalidad TEXT NOT NULL DEFAULT 'VIRTUAL',
    enlace TEXT DEFAULT '',
    observacion_final TEXT DEFAULT '',
    asistencia INTEGER NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'PROGRAMADA',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id),
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
  )`);

  await ensureColumn('asesorias', 'motivo', "TEXT DEFAULT ''");
  await ensureColumn('asesorias', 'modalidad', "TEXT NOT NULL DEFAULT 'VIRTUAL'");
  await ensureColumn('asesorias', 'enlace', "TEXT DEFAULT ''");
  await ensureColumn('asesorias', 'observacion_final', "TEXT DEFAULT ''");
  await ensureColumn('asesorias', 'asistencia', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('asesorias', 'created_at', 'TEXT');

  await run(`CREATE TABLE IF NOT EXISTS asesorias_mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asesoria_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    contenido TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asesoria_id) REFERENCES asesorias(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS asesorias_materiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asesoria_id INTEGER NOT NULL,
    docente_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    archivo_url TEXT NOT NULL,
    descripcion TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asesoria_id) REFERENCES asesorias(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
  )`);

  await seedData();
}

async function insertRole(nombre, descripcion) {
  const found = await get('SELECT id FROM roles WHERE nombre = ?', [nombre]);
  if (found) return found.id;
  const result = await run('INSERT INTO roles(nombre, descripcion) VALUES (?, ?)', [nombre, descripcion]);
  return result.lastID;
}

async function insertUser({ email, password, role, estado, nombres, apellidos, apellido_paterno, apellido_materno, dni, edad }) {
  const existing = await get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existing) return existing.id;
  const roleRow = await get('SELECT id FROM roles WHERE nombre = ?', [role]);
  const hash = await bcrypt.hash(password, 10);
  const result = await run(
    'INSERT INTO usuarios(email, password_hash, rol_id, estado) VALUES (?, ?, ?, ?)',
    [email, hash, roleRow.id, estado]
  );
  const paterno = apellido_paterno || (apellidos || '').split(' ')[0] || '';
  const materno = apellido_materno || (apellidos || '').split(' ').slice(1).join(' ') || '';
  const apellidosCompletos = apellidos || `${paterno} ${materno}`.trim();
  await run(
    'INSERT INTO perfiles(usuario_id, nombres, apellidos, apellido_paterno, apellido_materno, dni, edad, telefono, direccion, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [result.lastID, nombres, apellidosCompletos, paterno, materno, dni, edad || 18, '999 000 000', 'Lima, Perú', estado]
  );
  return result.lastID;
}

async function seedData() {
  const roleCount = await get('SELECT COUNT(*) AS total FROM roles');
  if (roleCount.total > 0) return;

  await insertRole('ALUMNO', 'Accede a cursos, materiales, evaluaciones, progreso y asesorías.');
  await insertRole('DOCENTE', 'Gestiona cursos asignados, materiales y asesorías académicas.');
  await insertRole('COORDINADOR', 'Gestiona secciones, asignaciones, notas, asistencia y asesorías.');
  await insertRole('ADMINISTRADOR', 'Administra usuarios, perfiles, cursos, roles y configuración.');

  const alumnoId = await insertUser({ email: 'alumno@educatoon.pe', password: '123456', role: 'ALUMNO', estado: 'APROBADO', nombres: 'David Josue', apellidos: 'Huatuco Janampa', apellido_paterno: 'Huatuco', apellido_materno: 'Janampa', dni: '70000001', edad: 19 });
  const docenteId = await insertUser({ email: 'docente@educatoon.pe', password: '123456', role: 'DOCENTE', estado: 'APROBADO', nombres: 'Rosa María', apellidos: 'Valverde Torres', apellido_paterno: 'Valverde', apellido_materno: 'Torres', dni: '70000002', edad: 36 });
  await insertUser({ email: 'coordinador@educatoon.pe', password: '123456', role: 'COORDINADOR', estado: 'APROBADO', nombres: 'Carlos Alberto', apellidos: 'Mendoza Quispe', apellido_paterno: 'Mendoza', apellido_materno: 'Quispe', dni: '70000003', edad: 41 });
  await insertUser({ email: 'admin@educatoon.pe', password: '123456', role: 'ADMINISTRADOR', estado: 'APROBADO', nombres: 'Admin', apellidos: 'Educatoon Sistema', apellido_paterno: 'Educatoon', apellido_materno: 'Sistema', dni: '70000004', edad: 30 });
  await insertUser({ email: 'pendiente@educatoon.pe', password: '123456', role: 'ALUMNO', estado: 'PENDIENTE', nombres: 'Luis Ángel', apellidos: 'Pendiente Registro', apellido_paterno: 'Pendiente', apellido_materno: 'Registro', dni: '70000005', edad: 18 });

  await run('INSERT INTO cursos(nombre, descripcion, ciclo, estado) VALUES (?, ?, ?, ?)', ['Matemática', 'Álgebra, aritmética, geometría y razonamiento matemático.', 'Pre San Marcos', 'ACTIVO']);
  await run('INSERT INTO cursos(nombre, descripcion, ciclo, estado) VALUES (?, ?, ?, ?)', ['Comunicación', 'Comprensión lectora, lenguaje y redacción académica.', 'Pre San Marcos', 'ACTIVO']);
  await run('INSERT INTO cursos(nombre, descripcion, ciclo, estado) VALUES (?, ?, ?, ?)', ['Física', 'Cinemática, dinámica, energía y electricidad básica.', 'Pre San Marcos', 'ACTIVO']);

  await run('INSERT INTO secciones(curso_id, docente_id, codigo, capacidad, aula, modalidad, horario, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [1, docenteId, 'MAT-A1', 45, 'Aula 201', 'MIXTA', 'Lunes y miércoles 18:00 - 20:00', 'ACTIVA']);
  await run('INSERT INTO secciones(curso_id, docente_id, codigo, capacidad, aula, modalidad, horario, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [2, docenteId, 'COM-B1', 40, 'Aula Virtual 02', 'VIRTUAL', 'Martes 19:00 - 21:00', 'ACTIVA']);
  await run('INSERT INTO secciones(curso_id, docente_id, codigo, capacidad, aula, modalidad, horario, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [3, docenteId, 'FIS-C1', 35, 'Laboratorio 01', 'PRESENCIAL', 'Viernes 17:00 - 19:00', 'ACTIVA']);

  await run('INSERT INTO matriculas(alumno_id, seccion_id, estado) VALUES (?, ?, ?)', [alumnoId, 1, 'ACTIVA']);
  await run('INSERT INTO matriculas(alumno_id, seccion_id, estado) VALUES (?, ?, ?)', [alumnoId, 2, 'ACTIVA']);

  const channelNames = [
    ['Foro general', 'Avisos, acuerdos y conversación principal del curso.', 'GENERAL'],
    ['Dudas académicas', 'Preguntas de estudiantes y respuestas del docente.', 'DUDAS'],
    ['Tareas', 'Consultas y coordinación sobre actividades asignadas.', 'TAREAS'],
    ['Asesorías', 'Seguimiento de áreas de refuerzo y asesorías.', 'ASESORIAS']
  ];
  for (const sectionId of [1, 2, 3]) {
    for (const [name, desc, type] of channelNames) {
      await run('INSERT INTO canales(seccion_id, nombre, descripcion, tipo) VALUES (?, ?, ?, ?)', [sectionId, name, desc, type]);
    }
  }

  await run('INSERT INTO mensajes(canal_id, usuario_id, contenido) VALUES (?, ?, ?)', [1, docenteId, 'Bienvenidos al curso de Matemática. Revisen el material de la semana 1.']);
  await run('INSERT INTO mensajes(canal_id, usuario_id, contenido) VALUES (?, ?, ?)', [1, alumnoId, 'Profesora, ¿el simulacro será este sábado?']);
  await run('INSERT INTO mensajes(canal_id, usuario_id, contenido) VALUES (?, ?, ?)', [1, docenteId, 'Sí, el simulacro está programado para el sábado a las 9:00 a. m.']);

  await run('INSERT INTO materiales(seccion_id, docente_id, semana, titulo, tipo, archivo_url, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)', [1, docenteId, 'semana1', 'Guía de Álgebra - Semana 1', 'PDF', 'https://example.com/algebra-semana-1.pdf', 'Ejercicios de ecuaciones y factorización.']);
  await run('INSERT INTO materiales(seccion_id, docente_id, semana, titulo, tipo, archivo_url, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)', [2, docenteId, 'semana1', 'Lectura crítica - Práctica', 'PDF', 'https://example.com/lectura-critica.pdf', 'Texto y preguntas de comprensión lectora.']);

  await run('INSERT INTO reuniones(seccion_id, titulo, fecha, enlace, tipo) VALUES (?, ?, ?, ?, ?)', [1, 'Clase virtual: Álgebra', '2026-07-18 18:00', 'https://meet.google.com/demo-educatoon-mat', 'CLASE']);
  await run('INSERT INTO reuniones(seccion_id, titulo, fecha, enlace, tipo) VALUES (?, ?, ?, ?, ?)', [1, 'Asesoría de ecuaciones', '2026-07-20 17:00', 'https://meet.google.com/demo-educatoon-ase', 'ASESORIA']);

  await run('INSERT INTO evaluaciones(seccion_id, titulo, tipo, fecha, estado) VALUES (?, ?, ?, ?, ?)', [1, 'Simulacro 01 - Matemática', 'SIMULACRO', '2026-07-19', 'PROGRAMADA']);
  await run('INSERT INTO evaluaciones(seccion_id, titulo, tipo, fecha, estado) VALUES (?, ?, ?, ?, ?)', [2, 'Práctica de comprensión lectora', 'PRACTICA', '2026-07-21', 'PROGRAMADA']);

  const tareaMat = await run('INSERT INTO tareas(seccion_id, docente_id, semana, titulo, instruccion, fecha_entrega, tipo, archivo_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [1, docenteId, 'semana1', 'Ejercicios de ecuaciones lineales', 'Resolver los 10 ejercicios de la guía de Álgebra. Subir el desarrollo en PDF o imagen legible.', '2026-07-23', 'TAREA', 'https://example.com/tarea-ecuaciones.pdf', 'ABIERTA']);
  const tareaCom = await run('INSERT INTO tareas(seccion_id, docente_id, semana, titulo, instruccion, fecha_entrega, tipo, archivo_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [2, docenteId, 'semana1', 'Análisis de texto argumentativo', 'Leer el texto asignado e identificar tesis, argumentos e inferencias principales.', '2026-07-24', 'TAREA', 'https://example.com/tarea-lectura.pdf', 'ABIERTA']);
  await run('INSERT INTO entregas_tarea(tarea_id, alumno_id, archivo_url, comentario, estado, nota, retroalimentacion, docente_id, calificado_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [tareaMat.lastID, alumnoId, 'https://example.com/entrega-alumno-ecuaciones.pdf', 'Adjunto mi resolución de la guía.', 'CALIFICADA', 16, 'Buen procedimiento. Reforzar la justificación en el ejercicio 7.', docenteId]);

  await run('INSERT INTO progreso_academico(alumno_id, seccion_id, promedio, porcentaje_asistencia, requiere_asesoria, observacion) VALUES (?, ?, ?, ?, ?, ?)', [alumnoId, 1, 14.8, 92, 0, 'Buen avance. Reforzar problemas de geometría.']);
  await run('INSERT INTO progreso_academico(alumno_id, seccion_id, promedio, porcentaje_asistencia, requiere_asesoria, observacion) VALUES (?, ?, ?, ?, ?, ?)', [alumnoId, 2, 11.2, 85, 1, 'Requiere asesoría en comprensión inferencial.']);

  const asesoria = await run('INSERT INTO asesorias(alumno_id, docente_id, curso_id, tema, motivo, areas_refuerzo, fecha_programada, modalidad, enlace, estado, observacion_final, asistencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [alumnoId, docenteId, 2, 'Comprensión lectora', 'Bajo rendimiento en práctica de comprensión lectora.', 'Inferencias, idea principal, conectores', '2026-07-22 19:00', 'VIRTUAL', 'https://meet.google.com/demo-educatoon-ase', 'PROGRAMADA', '', 0]);
  await run('INSERT INTO asesorias_mensajes(asesoria_id, usuario_id, contenido) VALUES (?, ?, ?)', [asesoria.lastID, alumnoId, 'Profesora, tengo dudas con las inferencias en textos extensos.']);
  await run('INSERT INTO asesorias_mensajes(asesoria_id, usuario_id, contenido) VALUES (?, ?, ?)', [asesoria.lastID, docenteId, 'Revisa la guía de conectores antes de la sesión. Trabajaremos ejemplos paso a paso.']);
  await run('INSERT INTO asesorias_materiales(asesoria_id, docente_id, titulo, tipo, archivo_url, descripcion) VALUES (?, ?, ?, ?, ?, ?)', [asesoria.lastID, docenteId, 'Guía de refuerzo: Inferencias', 'PDF', 'https://example.com/refuerzo-inferencias.pdf', 'Material de apoyo para la asesoría programada.']);
}
