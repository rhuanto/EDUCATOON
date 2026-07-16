import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlumnoOption, AsesoriaDetail, BootstrapData, Canal, CreateUserPayload, EnrollStudentPayload, GradeTaskPayload, Mensaje, NewAsesoriaPayload, NewCoursePayload, NewSectionPayload, PerfilAdmin, UpdateAsesoriaPayload, UpdateProfilePayload, User, UserDetail } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  bootstrap() {
    return this.http.get<BootstrapData>('/api/bootstrap');
  }

  canales(seccionId: number) {
    return this.http.get<Canal[]>(`/api/secciones/${seccionId}/canales`);
  }

  mensajes(canalId: number) {
    return this.http.get<Mensaje[]>(`/api/canales/${canalId}/mensajes`);
  }

  enviarMensaje(canalId: number, contenido: string) {
    return this.http.post<Mensaje>(`/api/canales/${canalId}/mensajes`, { contenido });
  }

  perfiles() {
    return this.http.get<PerfilAdmin[]>('/api/perfiles');
  }

  aprobarPerfil(usuarioId: number) {
    return this.http.put<{ message: string }>(`/api/perfiles/${usuarioId}/aprobar`, {});
  }

  crearCurso(payload: NewCoursePayload) {
    return this.http.post<{ message: string; id: number }>('/api/cursos', payload);
  }

  crearSeccion(payload: NewSectionPayload) {
    return this.http.post('/api/secciones', payload);
  }

  matricularAlumno(seccionId: number, payload: EnrollStudentPayload) {
    return this.http.post<{ message: string; id?: number }>(`/api/secciones/${seccionId}/matriculas`, payload);
  }

  docentes() {
    return this.http.get<Array<{ id: number; email: string; nombre: string }>>('/api/docentes');
  }

  alumnos() {
    return this.http.get<AlumnoOption[]>('/api/alumnos');
  }

  updateProfile(payload: UpdateProfilePayload) {
    return this.http.put<User>('/api/me/perfil', payload);
  }

  crearUsuario(payload: CreateUserPayload) {
    return this.http.post<{ message: string; id: number }>('/api/usuarios', payload);
  }

  actualizarUsuario(usuarioId: number, payload: CreateUserPayload) {
    return this.http.put<{ message: string }>(`/api/usuarios/${usuarioId}`, payload);
  }

  eliminarUsuario(usuarioId: number) {
    return this.http.delete<{ message: string }>(`/api/usuarios/${usuarioId}`);
  }

  detalleUsuario(usuarioId: number) {
    return this.http.get<UserDetail>(`/api/usuarios/${usuarioId}/detalle`);
  }

  subirMaterial(formData: FormData) {
    return this.http.post('/api/materiales', formData);
  }

  detalleAsesoria(asesoriaId: number) {
    return this.http.get<AsesoriaDetail>(`/api/asesorias/${asesoriaId}`);
  }

  crearAsesoria(payload: NewAsesoriaPayload) {
    return this.http.post<{ message: string; id: number }>('/api/asesorias', payload);
  }

  actualizarAsesoria(asesoriaId: number, payload: UpdateAsesoriaPayload) {
    return this.http.put<{ message: string }>(`/api/asesorias/${asesoriaId}`, payload);
  }

  enviarMensajeAsesoria(asesoriaId: number, contenido: string) {
    return this.http.post(`/api/asesorias/${asesoriaId}/mensajes`, { contenido });
  }

  subirMaterialAsesoria(asesoriaId: number, formData: FormData) {
    return this.http.post(`/api/asesorias/${asesoriaId}/materiales`, formData);
  }

  crearTarea(formData: FormData) {
    return this.http.post<{ message: string; id: number }>('/api/tareas', formData);
  }

  entregarTarea(tareaId: number, formData: FormData) {
    return this.http.post<{ message: string; id: number }>(`/api/tareas/${tareaId}/entregas`, formData);
  }

  calificarEntrega(entregaId: number, payload: GradeTaskPayload) {
    return this.http.put<{ message: string }>(`/api/entregas/${entregaId}/calificar`, payload);
  }

}
