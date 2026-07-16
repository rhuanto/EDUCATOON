# Educatoon Angular + Node.js + SQLite — v12

Demo local de la plataforma académica Educatoon.

## Stack

- Frontend: Angular
- Backend: Node.js + Express
- Base de datos local: SQLite
- Carga de archivos: Multer, carpeta `backend/uploads`

## Ejecutar

```bash
npm install
npm run install:all
npm run dev
```

Abrir:

```text
http://localhost:4200
```

## Reiniciar base de datos

```bash
npm run reset:db
```

## Cuentas demo

Todas usan contraseña `123456`:

- `alumno@educatoon.pe`
- `docente@educatoon.pe`
- `coordinador@educatoon.pe`
- `admin@educatoon.pe`

## Cambios v12

- El docente puede subir material didáctico por semana del curso.
- El docente puede crear tareas con instrucciones, fecha de entrega y archivo adjunto opcional.
- El alumno puede subir su entrega dentro de la tarea correspondiente.
- El docente puede revisar entregas y registrar notas manualmente por tarea.
- La pestaña Notas muestra calificaciones y retroalimentación asociadas a cada entrega.

## Base de datos

La base SQLite se genera en:

```text
backend/data/educatoon.db
```

Tablas principales añadidas para esta versión:

- `tareas`
- `entregas_tarea`

La arquitectura se mantiene como:

```text
Angular → API REST Node.js/Express → SQLite
```


## Actualización v13

- La pantalla inicial de la aplicación ahora es el login.
- Se eliminó la pantalla pública tipo landing.
- El login y el registro usan una imagen institucional de fondo.
- La autenticación mantiene el flujo: Angular -> API Node.js/Express -> SQLite.
