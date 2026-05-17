const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/*
  Educatoon Perú - Demo SOA con control de roles

  Servicios implementados:
  1. Servicio de Identidad y Autenticación
  2. Servicio de Usuarios y Perfiles

  Roles:
  - ADMINISTRADOR: gestiona usuarios y datos generales.
  - DOCENTE: consulta sus módulos académicos.
  - ESTUDIANTE: consulta sus cursos y puede cambiar contraseña.
*/

let usuarios = [
  {
    id: 1,
    nombre: "Estudiante Demo",
    email: "estudiante@educatoon.pe",
    password: "123456",
    rol: "ESTUDIANTE",
    estado: "ACTIVO",
    dni: "76543210",
    telefono: "999888777",
    direccion: "San Juan de Lurigancho, Lima",
    seccion: "Aula San Marcos - Ciclo 2025",
    grado: "5to de secundaria",
    fechaRegistro: "2025-03-12"
  },
  {
    id: 2,
    nombre: "Docente Demo",
    email: "docente@educatoon.pe",
    password: "123456",
    rol: "DOCENTE",
    estado: "ACTIVO",
    dni: "45678912",
    telefono: "988777666",
    direccion: "Lima",
    seccion: "Cursos asignados",
    especialidad: "Matemática",
    fechaRegistro: "2025-02-18"
  },
  {
    id: 3,
    nombre: "Administrador Demo",
    email: "administrador@educatoon.pe",
    password: "123456",
    rol: "ADMINISTRADOR",
    estado: "ACTIVO",
    dni: "12345678",
    telefono: "977666555",
    direccion: "Lima",
    area: "Administración académica",
    fechaRegistro: "2025-01-20"
  },
  {
    id: 4,
    nombre: "Ana Torres",
    email: "ana.torres@educatoon.pe",
    password: "123456",
    rol: "DOCENTE",
    estado: "ACTIVO",
    dni: "44556677",
    telefono: "966555444",
    direccion: "Lima",
    especialidad: "Física",
    fechaRegistro: "2025-02-22"
  },
  {
    id: 5,
    nombre: "Luis Ramírez",
    email: "luis.ramirez@educatoon.pe",
    password: "123456",
    rol: "ESTUDIANTE",
    estado: "PENDIENTE",
    dni: "77889900",
    telefono: "955444333",
    direccion: "Ate, Lima",
    seccion: "Pendiente de asignación",
    grado: "Egresado",
    fechaRegistro: "2025-04-03"
  }
];

const sesiones = new Map();

function crearToken() {
  return "EDUCATOON-TOKEN-" + crypto.randomBytes(16).toString("hex");
}

function ocultarPassword(usuario) {
  const { password, ...seguro } = usuario;
  return seguro;
}

function buscarUsuarioPorId(id) {
  return usuarios.find((u) => u.id === Number(id));
}

function obtenerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.replace("Bearer ", "").trim();
}

function autenticar(req, res, next) {
  const token = obtenerToken(req);

  if (!token || !sesiones.has(token)) {
    return res.status(401).json({
      error: "No autorizado",
      mensaje: "Debe iniciar sesión para acceder a este recurso"
    });
  }

  req.token = token;
  req.usuario = sesiones.get(token);
  next();
}

function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: "Acceso denegado",
        mensaje: "Su rol no tiene permiso para realizar esta acción"
      });
    }
    next();
  };
}

function actualizarSesion(usuarioActualizado) {
  for (const [token, usuarioSesion] of sesiones.entries()) {
    if (usuarioSesion.id === usuarioActualizado.id) {
      sesiones.set(token, ocultarPassword(usuarioActualizado));
    }
  }
}

function resumenDashboard(rol) {
  if (rol === "ADMINISTRADOR") {
    return {
      titulo: "Panel del administrador",
      tarjetas: [
        { etiqueta: "Usuarios registrados", valor: usuarios.length, tipo: "info" },
        { etiqueta: "Usuarios activos", valor: usuarios.filter((u) => u.estado === "ACTIVO").length, tipo: "success" },
        { etiqueta: "Cuentas pendientes", valor: usuarios.filter((u) => u.estado === "PENDIENTE").length, tipo: "warning" },
        { etiqueta: "Roles del sistema", valor: 3, tipo: "danger" }
      ]
    };
  }

  if (rol === "DOCENTE") {
    return {
      titulo: "Panel del docente",
      tarjetas: [
        { etiqueta: "Cursos asignados", valor: 3, tipo: "info" },
        { etiqueta: "Estudiantes atendidos", valor: 45, tipo: "success" },
        { etiqueta: "Materiales publicados", valor: 12, tipo: "warning" },
        { etiqueta: "Asesorías programadas", valor: 6, tipo: "danger" }
      ]
    };
  }

  return {
    titulo: "Panel del estudiante",
    tarjetas: [
      { etiqueta: "Cursos inscritos", valor: 5, tipo: "info" },
      { etiqueta: "Materiales disponibles", valor: 18, tipo: "success" },
      { etiqueta: "Asesorías pendientes", valor: 2, tipo: "warning" },
      { etiqueta: "Promedio actual", valor: 14, tipo: "danger" }
    ]
  };
}

/* Servicio de Identidad y Autenticación */

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Datos incompletos",
      mensaje: "Debe ingresar correo y contraseña"
    });
  }

  const usuario = usuarios.find(
    (u) =>
      u.email.toLowerCase() === String(email).toLowerCase() &&
      u.password === password
  );

  if (!usuario) {
    return res.status(401).json({
      error: "Credenciales incorrectas",
      mensaje: "El correo o la contraseña no son válidos"
    });
  }

  if (usuario.estado !== "ACTIVO") {
    return res.status(403).json({
      error: "Cuenta no activa",
      mensaje: "La cuenta aún no ha sido aprobada por administración"
    });
  }

  const token = crearToken();
  sesiones.set(token, ocultarPassword(usuario));

  res.json({
    mensaje: "Inicio de sesión exitoso",
    token,
    usuario: ocultarPassword(usuario)
  });
});

app.get("/api/auth/me", autenticar, (req, res) => {
  res.json({
    autenticado: true,
    usuario: req.usuario
  });
});

app.post("/api/auth/logout", autenticar, (req, res) => {
  sesiones.delete(req.token);
  res.json({ mensaje: "Sesión cerrada correctamente" });
});

app.put("/api/auth/cambiar-password", autenticar, (req, res) => {
  const { passwordActual, passwordNuevo } = req.body;
  const usuario = buscarUsuarioPorId(req.usuario.id);

  if (!usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  if (!passwordActual || !passwordNuevo) {
    return res.status(400).json({
      error: "Datos incompletos",
      mensaje: "Debe ingresar contraseña actual y nueva contraseña"
    });
  }

  if (usuario.password !== passwordActual) {
    return res.status(400).json({
      error: "Contraseña incorrecta",
      mensaje: "La contraseña actual no es correcta"
    });
  }

  if (String(passwordNuevo).length < 6) {
    return res.status(400).json({
      error: "Contraseña débil",
      mensaje: "La nueva contraseña debe tener al menos 6 caracteres"
    });
  }

  usuario.password = String(passwordNuevo);
  res.json({ mensaje: "Contraseña actualizada correctamente" });
});

/* Servicio de Usuarios y Perfiles */

app.get("/api/usuarios/perfil", autenticar, (req, res) => {
  const usuario = buscarUsuarioPorId(req.usuario.id);

  if (!usuario) {
    return res.status(404).json({
      error: "Usuario no encontrado",
      mensaje: "No se encontró el perfil del usuario autenticado"
    });
  }

  res.json({
    mensaje: "Perfil obtenido correctamente",
    perfil: ocultarPassword(usuario)
  });
});

app.put("/api/usuarios/perfil", autenticar, (req, res) => {
  const usuario = buscarUsuarioPorId(req.usuario.id);

  if (!usuario) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  ["telefono", "direccion", "grado", "especialidad", "area"].forEach((campo) => {
    if (req.body[campo] !== undefined) {
      usuario[campo] = String(req.body[campo]).trim();
    }
  });

  actualizarSesion(usuario);

  res.json({
    mensaje: "Perfil actualizado correctamente",
    perfil: ocultarPassword(usuario)
  });
});

app.get(
  "/api/usuarios",
  autenticar,
  autorizarRoles("ADMINISTRADOR"),
  (req, res) => {
    res.json({
      total: usuarios.length,
      usuarios: usuarios.map(ocultarPassword)
    });
  }
);

app.put(
  "/api/usuarios/:id",
  autenticar,
  autorizarRoles("ADMINISTRADOR"),
  (req, res) => {
    const usuario = buscarUsuarioPorId(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado",
        mensaje: "No existe un usuario con el ID indicado"
      });
    }

    ["nombre", "email", "rol", "estado", "telefono", "direccion", "seccion", "grado", "especialidad", "area"].forEach((campo) => {
      if (req.body[campo] !== undefined) {
        usuario[campo] = String(req.body[campo]).trim();
      }
    });

    if (usuario.rol) {
      usuario.rol = usuario.rol.toUpperCase();
    }

    if (usuario.estado) {
      usuario.estado = usuario.estado.toUpperCase();
    }

    actualizarSesion(usuario);

    res.json({
      mensaje: "Usuario actualizado correctamente",
      usuario: ocultarPassword(usuario)
    });
  }
);

/* Dashboard por rol */

app.get("/api/dashboard/resumen", autenticar, (req, res) => {
  res.json({
    rol: req.usuario.rol,
    resumen: resumenDashboard(req.usuario.rol)
  });
});

app.get("/api/modulos", autenticar, (req, res) => {
  const modulos = {
    ADMINISTRADOR: [
      { id: "dashboard", nombre: "Dashboard" },
      { id: "gestion-usuarios", nombre: "Gestión de usuarios" },
      { id: "perfil", nombre: "Mi perfil" },
      { id: "reportes", nombre: "Reportes" }
    ],
    DOCENTE: [
      { id: "dashboard", nombre: "Dashboard" },
      { id: "mis-cursos", nombre: "Mis cursos" },
      { id: "materiales", nombre: "Materiales" },
      { id: "notas", nombre: "Notas y asistencia" },
      { id: "perfil", nombre: "Mi perfil" }
    ],
    ESTUDIANTE: [
      { id: "dashboard", nombre: "Dashboard" },
      { id: "mis-cursos", nombre: "Mis cursos" },
      { id: "materiales", nombre: "Materiales" },
      { id: "progreso", nombre: "Progreso académico" },
      { id: "cambiar-password", nombre: "Cambiar contraseña" },
      { id: "perfil", nombre: "Mi perfil" }
    ]
  };

  res.json({
    rol: req.usuario.rol,
    modulos: modulos[req.usuario.rol] || []
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("=================================================");
  console.log(" Educatoon Perú - SOA con roles");
  console.log(` Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log(" Usuarios demo:");
  console.log("  Administrador: administrador@educatoon.pe / 123456");
  console.log("  Docente: docente@educatoon.pe / 123456");
  console.log("  Estudiante: estudiante@educatoon.pe / 123456");
  console.log("=================================================");
});
