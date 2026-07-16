import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlumnoOption, AsesoriaDetail, BootstrapData, Canal, CreateUserPayload, EnrollStudentPayload, GradeTaskPayload, Mensaje, NewAsesoriaPayload, NewCoursePayload, NewSectionPayload, PerfilAdmin, UpdateAsesoriaPayload, UpdateProfilePayload, User, UserDetail } from './models';

export const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/api'
    : 'https://educatoon-backend.onrender.com/api';

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  bootstrap() {
    return this.http.get<BootstrapData>(apiUrl('/bootstrap'));
  }

  canales(seccionId: number) {
    return this.http.get<Canal[]>(apiUrl(`/secciones/${seccionId}/canales`));
  }

  mensajes(canalId: number) {
    return this.http.get<Mensaje[]>(apiUrl(`/canales/${canalId}/mensajes`));
  }

  enviarMensaje(canalId: number, contenido: string) {
    return this.http.post<Mensaje>(apiUrl(`/canales/${canalId}/mensajes`), { contenido });
  }

  perfiles() {
    return this.http.get<PerfilAdmin[]>(apiUrl('/perfiles'));
  }

  aprobarPerfil(usuarioId: number) {
    return this.http.put<{ message: string }>(apiUrl(`/perfiles/${usuarioId}/aprobar`), {});
  }

  crearCurso(payload: NewCoursePayload) {
    return this.http.post<{ message: string; id: number }>(apiUrl('/cursos'), payload);
  }

  crearSeccion(payload: NewSectionPayload) {
    return this.http.post(apiUrl('/secciones'), payload);
  }

  matricularAlumno(seccionId: number, payload: EnrollStudentPayload) {
    return this.http.post<{ message: string; id?: number }>(apiUrl(`/secciones/${seccionId}/matriculas`), payload);
  }

  docentes() {
    return this.http.get<Array<{ id: number; email: string; nombre: string }>>(apiUrl('/docentes'));
  }

  alumnos() {
    return this.http.get<AlumnoOption[]>(apiUrl('/alumnos'));
  }

  updateProfile(payload: UpdateProfilePayload) {
    return this.http.put<User>(apiUrl('/me/perfil'), payload);
  }

  crearUsuario(payload: CreateUserPayload) {
    return this.http.post<{ message: string; id: number }>(apiUrl('/usuarios'), payload);
  }

  actualizarUsuario(usuarioId: number, payload: CreateUserPayload) {
    return this.http.put<{ message: string }>(apiUrl(`/usuarios/${usuarioId}`), payload);
  }

  eliminarUsuario(usuarioId: number) {
    return this.http.delete<{ message: string }>(apiUrl(`/usuarios/${usuarioId}`));
  }

  detalleUsuario(usuarioId: number) {
    return this.http.get<UserDetail>(apiUrl(`/usuarios/${usuarioId}/detalle`));
  }

  subirMaterial(formData: FormData) {
    return this.http.post(apiUrl('/materiales'), formData);
  }

  detalleAsesoria(asesoriaId: number) {
    return this.http.get<AsesoriaDetail>(apiUrl(`/asesorias/${asesoriaId}`));
  }

  crearAsesoria(payload: NewAsesoriaPayload) {
    return this.http.post<{ message: string; id: number }>(apiUrl('/asesorias'), payload);
  }

  actualizarAsesoria(asesoriaId: number, payload: UpdateAsesoriaPayload) {
    return this.http.put<{ message: string }>(apiUrl(`/asesorias/${asesoriaId}`), payload);
  }

  enviarMensajeAsesoria(asesoriaId: number, contenido: string) {
    return this.http.post(apiUrl(`/asesorias/${asesoriaId}/mensajes`), { contenido });
  }

  subirMaterialAsesoria(asesoriaId: number, formData: FormData) {
    return this.http.post(apiUrl(`/asesorias/${asesoriaId}/materiales`), formData);
  }

  crearTarea(formData: FormData) {
    return this.http.post<{ message: string; id: number }>(apiUrl('/tareas'), formData);
  }

  entregarTarea(tareaId: number, formData: FormData) {
    return this.http.post<{ message: string; id: number }>(apiUrl(`/tareas/${tareaId}/entregas`), formData);
  }

  calificarEntrega(entregaId: number, payload: GradeTaskPayload) {
    return this.http.put<{ message: string }>(apiUrl(`/entregas/${entregaId}/calificar`), payload);
  }

}
