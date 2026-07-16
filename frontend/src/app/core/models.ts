export type UserRole = 'ALUMNO' | 'DOCENTE' | 'COORDINADOR' | 'ADMINISTRADOR';

export interface User {
  id: number;
  email: string;
  rol: UserRole;
  estado: 'APROBADO' | 'PENDIENTE';
  nombres: string;
  apellidos: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  dni?: string;
  edad?: number | null;
  telefono?: string;
  direccion?: string;
}

export interface Curso {
  id: number;
  nombre: string;
  descripcion: string;
  ciclo: string;
  estado: string;
}

export interface Seccion {
  id: number;
  curso_id: number;
  docente_id: number;
  codigo: string;
  capacidad: number;
  aula: string;
  modalidad: string;
  horario: string;
  estado: string;
  curso: string;
  curso_descripcion?: string;
  docente: string;
  matriculados?: number;
}

export interface Canal {
  id: number;
  seccion_id: number;
  nombre: string;
  descripcion: string;
  tipo: string;
}

export interface Mensaje {
  id: number;
  canal_id: number;
  usuario_id: number;
  contenido: string;
  created_at: string;
  email: string;
  rol: UserRole;
  autor: string;
}

export interface Material {
  id: number;
  seccion_id: number;
  docente_id: number;
  semana: string;
  titulo: string;
  tipo: string;
  archivo_url: string;
  descripcion: string;
  created_at: string;
  seccion_codigo: string;
  curso: string;
  curso_descripcion?: string;
  docente: string;
}

export interface Reunion {
  id: number;
  seccion_id: number;
  titulo: string;
  fecha: string;
  enlace: string;
  tipo: string;
  seccion_codigo: string;
  curso: string;
}

export interface Evaluacion {
  id: number;
  seccion_id: number;
  titulo: string;
  tipo: string;
  fecha: string;
  estado: string;
  seccion_codigo: string;
  curso: string;
}

export interface Progreso {
  id: number;
  alumno_id: number;
  seccion_id: number;
  promedio: number;
  porcentaje_asistencia: number;
  requiere_asesoria: number;
  observacion: string;
  seccion_codigo: string;
  curso: string;
}

export interface Asesoria {
  id: number;
  alumno_id: number;
  docente_id: number;
  curso_id: number;
  tema: string;
  motivo: string;
  areas_refuerzo: string;
  fecha_programada: string;
  modalidad: string;
  enlace: string;
  observacion_final: string;
  asistencia: number;
  estado: string;
  curso: string;
  alumno: string;
  docente: string;
}

export interface AsesoriaMensaje {
  id: number;
  asesoria_id: number;
  usuario_id: number;
  contenido: string;
  created_at: string;
  autor: string;
  rol: UserRole;
}

export interface AsesoriaMaterial {
  id: number;
  asesoria_id: number;
  docente_id: number;
  semana: string;
  titulo: string;
  tipo: string;
  archivo_url: string;
  descripcion: string;
  created_at: string;
  docente: string;
}

export interface AsesoriaDetail {
  asesoria: Asesoria;
  mensajes: AsesoriaMensaje[];
  materiales: AsesoriaMaterial[];
}

export interface PerfilAdmin {
  usuario_id: number;
  email: string;
  usuario_estado: string;
  rol: UserRole;
  perfil_id: number;
  nombres: string;
  apellidos: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  edad: number | null;
  telefono: string;
  direccion: string;
  perfil_estado: string;
}

export interface AlumnoOption {
  id: number;
  email: string;
  nombre: string;
  dni: string;
  edad: number | null;
}

export interface UserCourseDetail {
  seccion_id: number;
  curso_id: number;
  curso: string;
  seccion_codigo: string;
  modalidad: string;
  aula: string;
  horario: string;
  docente: string;
  estado: string;
  tipo_vinculo: string;
}

export interface UserDetail {
  usuario: PerfilAdmin;
  cursos: UserCourseDetail[];
}


export interface Tarea {
  id: number;
  seccion_id: number;
  docente_id: number;
  semana: string;
  titulo: string;
  instruccion: string;
  fecha_entrega: string;
  tipo: string;
  archivo_url: string;
  estado: string;
  created_at: string;
  seccion_codigo: string;
  curso: string;
  docente: string;
}

export interface EntregaTarea {
  id: number;
  tarea_id: number;
  alumno_id: number;
  archivo_url: string;
  comentario: string;
  estado: string;
  nota: number | null;
  retroalimentacion: string;
  docente_id: number | null;
  created_at: string;
  calificado_at: string | null;
  tarea: string;
  seccion_id: number;
  semana: string;
  fecha_entrega: string;
  curso: string;
  seccion_codigo: string;
  alumno: string;
  alumno_email: string;
}

export interface BootstrapData {
  roles: Array<{ id: number; nombre: UserRole; descripcion: string }>;
  cursos: Curso[];
  secciones: Seccion[];
  materiales: Material[];
  tareas: Tarea[];
  entregas: EntregaTarea[];
  reuniones: Reunion[];
  evaluaciones: Evaluacion[];
  progreso: Progreso[];
  asesorias: Asesoria[];
}

export interface RegisterPayload {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  direccion: string;
  email: string;
  password: string;
}

export interface NewSectionPayload {
  curso_id: number;
  docente_id: number | null;
  codigo: string;
  capacidad: number;
  aula: string;
  modalidad: string;
  horario: string;
}

export interface NewCoursePayload {
  nombre: string;
  descripcion: string;
  ciclo: string;
  estado: string;
}

export interface EnrollStudentPayload {
  alumno_id: number;
}

export interface UpdateProfilePayload {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  direccion: string;
}

export interface CreateUserPayload {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  edad: number | null;
  telefono: string;
  direccion: string;
  email: string;
  password: string;
  rol: UserRole;
  estado: 'APROBADO' | 'PENDIENTE';
}


export interface NewAsesoriaPayload {
  alumno_id: number;
  docente_id: number;
  curso_id: number;
  tema: string;
  motivo: string;
  areas_refuerzo: string;
  fecha_programada: string;
  modalidad: string;
  enlace: string;
}

export interface UpdateAsesoriaPayload {
  estado: string;
  observacion_final: string;
  asistencia: number;
}


export interface NewTaskPayload {
  seccion_id: number;
  semana: string;
  titulo: string;
  instruccion: string;
  fecha_entrega: string;
  tipo: string;
}

export interface GradeTaskPayload {
  nota: number | null;
  retroalimentacion: string;
}
