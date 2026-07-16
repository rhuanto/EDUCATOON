# Educatoon

Plataforma académica de demostración construida con Angular, Node.js y SQLite. El proyecto centraliza autenticación, gestión académica y seguimiento por roles para simular un entorno educativo completo.

## Resumen

Educatoon organiza la experiencia en dos capas principales:

- Frontend Angular para la navegación, el login, el registro y el workspace principal.
- API Node.js/Express con persistencia en SQLite para autenticación, cursos, secciones, matrículas, materiales, tareas, entregas, notas, asesorías y reportes.

El flujo principal es:

```text
Angular frontend -> API Node.js/Express -> SQLite
```

## Funcionalidades

- Inicio de sesión y registro de alumnos.
- Panel principal por rol: alumno, docente, coordinador y administrador.
- Gestión de cursos, secciones y matrículas.
- Publicación de materiales por semana y sección.
- Creación y revisión de tareas con entregas adjuntas.
- Registro manual de notas y retroalimentación.
- Foros y canales de comunicación por sección.
- Calendario académico, asesorías y reportes de progreso.
- Perfil de usuario y cambio de contraseña.

## Tecnologías

- Angular 18
- Node.js + Express
- SQLite
- JWT para autenticación
- Multer para carga de archivos
- bcryptjs para hash de contraseñas
- morgan y cors para soporte de API

## Requisitos

- Node.js 18 o superior.
- npm.
- Navegador moderno.

## Instalación

Instala las dependencias del backend y del frontend por separado:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Ejecución en local

Abre dos terminales.

Terminal 1 - API:

```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:

```bash
cd frontend
npm start
```

Luego abre:

```text
http://localhost:4200
```

La API queda disponible en:

```text
http://localhost:3000
```

## Cuentas demo

Todas las cuentas usan la contraseña `123456`.

- `alumno@educatoon.pe`
- `docente@educatoon.pe`
- `coordinador@educatoon.pe`
- `admin@educatoon.pe`

## Base de datos

La base SQLite se crea en:

```text
backend/data/educatoon.db
```

El backend incluye datos semilla para que el entorno de demostración funcione desde el primer arranque.

## Reiniciar la base de datos

Para recrear la base con los datos iniciales:

```bash
cd backend
npm run reset
```

## Estructura del repositorio

- `frontend/`: aplicación Angular.
- `backend/`: API REST y base de datos SQLite.
- `public/`: demo ligera heredada y recursos estáticos.
- `server.js`: servidor de demostración adicional.
- `INFORME_TECNICO_EDUCATOON.md`: informe técnico del proyecto.

## Roles implementados

- ADMINISTRADOR: gestión de usuarios, cursos, secciones, reportes y perfil.
- DOCENTE: materiales, tareas, entregas, notas, asesorías y perfil.
- COORDINADOR: aprobación y seguimiento operativo.
- ALUMNO: acceso a cursos, materiales, progreso, entregas y cambio de contraseña.

## Notas

- El frontend usa proxy hacia la API para simplificar el desarrollo local.
- La carpeta de cargas de archivos se mantiene en `backend/uploads`.
- Si trabajas en PowerShell y necesitas ejecutar un binario local, puedes usar `npm.cmd` en lugar de `npm`.
