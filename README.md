# Educatoon Perú - SOA con roles

Proyecto con interfaz tipo AdminLTE, sin información técnica visible para el usuario final.

## Usuarios demo

```text
administrador@educatoon.pe / 123456
docente@educatoon.pe / 123456
estudiante@educatoon.pe / 123456
```

## Ejecutar

```bash
npm install
npm start
```

Si PowerShell bloquea npm:

```bash
npm.cmd install
npm.cmd start
```

Abrir:

```text
http://localhost:3000
```

## Roles implementados

- ADMINISTRADOR: gestión de usuarios, modificación de datos, reportes y perfil.
- DOCENTE: cursos, materiales, notas/asistencia y perfil.
- ESTUDIANTE: cursos, materiales, progreso académico, cambio de contraseña y perfil.
