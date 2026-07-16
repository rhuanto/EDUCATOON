const API_BASE = "http://localhost:3000/api";
const token = localStorage.getItem("educatoon_token");

const sidebarMenu = document.getElementById("sidebarMenu");
const sideNombre = document.getElementById("sideNombre");
const sideRol = document.getElementById("sideRol");
const topEmail = document.getElementById("topEmail");
const avatar = document.getElementById("avatar");

const panelTitle = document.getElementById("panelTitle");
const panelSubtitle = document.getElementById("panelSubtitle");
const cardsContainer = document.getElementById("cardsContainer");
const modulesGrid = document.getElementById("modulesGrid");

const adminUsersSection = document.getElementById("adminUsersSection");
const usuariosTableBody = document.getElementById("usuariosTableBody");

const profileSection = document.getElementById("profileSection");
const perfilForm = document.getElementById("perfilForm");
const perfilNombre = document.getElementById("perfilNombre");
const perfilTelefono = document.getElementById("perfilTelefono");
const perfilDireccion = document.getElementById("perfilDireccion");
const perfilExtra = document.getElementById("perfilExtra");
const perfilMessage = document.getElementById("perfilMessage");

const passwordSection = document.getElementById("passwordSection");
const passwordForm = document.getElementById("passwordForm");
const passwordActual = document.getElementById("passwordActual");
const passwordNuevo = document.getElementById("passwordNuevo");
const passwordMessage = document.getElementById("passwordMessage");

const logoutButton = document.getElementById("logoutButton");
const sidebarToggle = document.getElementById("sidebarToggle");

let usuarioActual = null;

if (!token) {
  window.location.href = "./index.html";
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

function cerrarSesionLocal() {
  localStorage.clear();
  window.location.href = "./index.html";
}

function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `alert ${tipo}`;
}

function iniciales(nombre) {
  return nombre
    .split(" ")
    .map((p) => p[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function pintarTarjetas(tarjetas) {
  cardsContainer.innerHTML = "";

  tarjetas.forEach((tarjeta) => {
    const card = document.createElement("article");
    card.className = `small-box bg-${tarjeta.tipo}`;
    card.innerHTML = `
      <div>
        <h3>${tarjeta.valor}</h3>
        <p>${tarjeta.etiqueta}</p>
      </div>
      <span class="box-icon">●</span>
      <small>Ver detalle</small>
    `;
    cardsContainer.appendChild(card);
  });
}

function pintarModulos(modulos) {
  modulesGrid.innerHTML = "";
  sidebarMenu.innerHTML = "";

  modulos.forEach((modulo, index) => {
    const menu = document.createElement("a");
    menu.className = index === 0 ? "menu-item active" : "menu-item";
    menu.href = `#${modulo.id}`;
    menu.textContent = modulo.nombre;
    sidebarMenu.appendChild(menu);

    const card = document.createElement("div");
    card.className = "module-card";
    card.id = modulo.id;
    card.innerHTML = `
      <h3>${modulo.nombre}</h3>
      <p>${descripcionModulo(modulo.id)}</p>
    `;
    modulesGrid.appendChild(card);
  });
}

function descripcionModulo(id) {
  const textos = {
    dashboard: "Resumen general de actividades.",
    "gestion-usuarios": "Administración de usuarios, roles y estados.",
    perfil: "Consulta y actualización de datos personales.",
    reportes: "Indicadores académicos y administrativos.",
    "mis-cursos": "Cursos asignados o matriculados.",
    materiales: "Consulta o gestión de materiales académicos.",
    notas: "Registro de notas y control de asistencia.",
    progreso: "Seguimiento del rendimiento académico.",
    "cambiar-password": "Actualización segura de contraseña."
  };
  return textos[id] || "Módulo disponible.";
}

async function cargarSesion() {
  const response = await fetch(`${API_BASE}/auth/me`, { headers: headers() });

  if (!response.ok) {
    cerrarSesionLocal();
    return;
  }

  const data = await response.json();
  usuarioActual = data.usuario;

  sideNombre.textContent = usuarioActual.nombre;
  sideRol.textContent = usuarioActual.rol;
  topEmail.textContent = usuarioActual.email;
  avatar.textContent = iniciales(usuarioActual.nombre);

  panelTitle.textContent = `Panel ${usuarioActual.rol.toLowerCase()}`;
  panelSubtitle.textContent = `Bienvenido, ${usuarioActual.nombre}.`;

  if (usuarioActual.rol === "ADMINISTRADOR") {
    adminUsersSection.classList.remove("hidden");
    await cargarUsuarios();
  }

  if (usuarioActual.rol === "ESTUDIANTE") {
    passwordSection.classList.remove("hidden");
  }
}

async function cargarResumen() {
  const response = await fetch(`${API_BASE}/dashboard/resumen`, { headers: headers() });
  const data = await response.json();
  pintarTarjetas(data.resumen.tarjetas);
}

async function cargarModulos() {
  const response = await fetch(`${API_BASE}/modulos`, { headers: headers() });
  const data = await response.json();
  pintarModulos(data.modulos);
}

async function cargarPerfil() {
  const response = await fetch(`${API_BASE}/usuarios/perfil`, { headers: headers() });

  if (!response.ok) return;

  const data = await response.json();
  const perfil = data.perfil;

  perfilNombre.value = perfil.nombre || "";
  perfilTelefono.value = perfil.telefono || "";
  perfilDireccion.value = perfil.direccion || "";
  perfilExtra.value = perfil.grado || perfil.especialidad || perfil.area || "";
}

async function cargarUsuarios() {
  const response = await fetch(`${API_BASE}/usuarios`, { headers: headers() });

  if (!response.ok) return;

  const data = await response.json();
  usuariosTableBody.innerHTML = "";

  data.usuarios.forEach((usuario) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input value="${usuario.nombre}" data-field="nombre" /></td>
      <td><input value="${usuario.email}" data-field="email" /></td>
      <td>
        <select data-field="rol">
          <option value="ESTUDIANTE" ${usuario.rol === "ESTUDIANTE" ? "selected" : ""}>ESTUDIANTE</option>
          <option value="DOCENTE" ${usuario.rol === "DOCENTE" ? "selected" : ""}>DOCENTE</option>
          <option value="ADMINISTRADOR" ${usuario.rol === "ADMINISTRADOR" ? "selected" : ""}>ADMINISTRADOR</option>
        </select>
      </td>
      <td>
        <select data-field="estado">
          <option value="ACTIVO" ${usuario.estado === "ACTIVO" ? "selected" : ""}>ACTIVO</option>
          <option value="PENDIENTE" ${usuario.estado === "PENDIENTE" ? "selected" : ""}>PENDIENTE</option>
        </select>
      </td>
      <td><input value="${usuario.telefono || ""}" data-field="telefono" /></td>
      <td><button class="btn btn-primary table-btn" data-id="${usuario.id}">Guardar</button></td>
    `;

    usuariosTableBody.appendChild(row);
  });

  usuariosTableBody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const payload = {};

      row.querySelectorAll("[data-field]").forEach((input) => {
        payload[input.dataset.field] = input.value;
      });

      const response = await fetch(`${API_BASE}/usuarios/${btn.dataset.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        btn.textContent = "Guardado";
        setTimeout(() => (btn.textContent = "Guardar"), 1000);
      }
    });
  });
}

perfilForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    telefono: perfilTelefono.value,
    direccion: perfilDireccion.value
  };

  if (usuarioActual.rol === "ESTUDIANTE") payload.grado = perfilExtra.value;
  if (usuarioActual.rol === "DOCENTE") payload.especialidad = perfilExtra.value;
  if (usuarioActual.rol === "ADMINISTRADOR") payload.area = perfilExtra.value;

  const response = await fetch(`${API_BASE}/usuarios/perfil`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    mostrarMensaje(perfilMessage, "Perfil actualizado correctamente.", "success");
  } else {
    mostrarMensaje(perfilMessage, "No se pudo actualizar el perfil.", "error");
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const response = await fetch(`${API_BASE}/auth/cambiar-password`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      passwordActual: passwordActual.value,
      passwordNuevo: passwordNuevo.value
    })
  });

  const data = await response.json();

  if (response.ok) {
    mostrarMensaje(passwordMessage, "Contraseña actualizada correctamente.", "success");
    passwordActual.value = "";
    passwordNuevo.value = "";
  } else {
    mostrarMensaje(passwordMessage, data.mensaje || "No se pudo cambiar la contraseña.", "error");
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: headers() });
  } finally {
    cerrarSesionLocal();
  }
});

sidebarToggle.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-collapsed");
});

async function iniciar() {
  await cargarSesion();
  await cargarResumen();
  await cargarModulos();
  await cargarPerfil();
}

iniciar();
