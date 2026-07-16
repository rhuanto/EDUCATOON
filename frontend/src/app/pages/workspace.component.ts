import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { AlumnoOption, Asesoria, AsesoriaDetail, BootstrapData, Canal, CreateUserPayload, Curso, EntregaTarea, Mensaje, NewAsesoriaPayload, NewCoursePayload, NewSectionPayload, PerfilAdmin, Seccion, Tarea, UpdateAsesoriaPayload, UpdateProfilePayload, UserRole, UserDetail } from '../core/models';

type TabKey = 'dashboard' | 'calendario' | 'cursos' | 'matriculas' | 'secciones' | 'usuarios' | 'perfiles' | 'asesorias' | 'reportes' | 'configuracion' | 'perfil';
type WeekKey = 'semana1' | 'semana2' | 'semana3' | 'semana4' | 'semana5' | 'semana6' | 'semana7' | 'semana8' | 'semana9' | 'semana10' | 'semana11' | 'semana12' | 'semana13' | 'semana14' | 'semana15' | 'semana16';
type CourseTab = 'contenido' | 'tareas' | 'notas' | 'foro';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="workspace">
      <aside class="sidebar">
        <div class="brand in-app"><span class="logo">E</span><strong>Educatoon</strong></div>
        <div class="user-card">
          <div class="avatar">{{ initials() }}</div>
          <div>
            <strong>{{ user()?.nombres }} {{ user()?.apellidos }}</strong>
            <span>{{ roleLabel(user()?.rol) }}</span>
          </div>
        </div>

        <nav class="menu">
          @for (item of menu(); track item.key) {
            <button [class.active]="activeTab() === item.key" (click)="go(item.key)">
              <span>{{ item.icon }}</span>{{ item.label }}
            </button>
          }
        </nav>

        <button class="btn btn-ghost logout" (click)="logout()">Cerrar sesión</button>
      </aside>

      <section class="content">
        <header class="content-header">
          <div>
            <h1>{{ title() }}</h1>
          </div>
          <button class="btn btn-primary" (click)="reload()">Actualizar</button>
        </header>

        @if (loading()) {
          <section class="panel"><p>Cargando datos...</p></section>
        } @else if (error()) {
          <section class="panel"><div class="alert error">{{ error() }}</div></section>
        } @else if (selectedAdminCourse()) {
          <ng-container *ngTemplateOutlet="adminCourseTpl"></ng-container>
        } @else if (selectedCourse()) {
          <ng-container *ngTemplateOutlet="courseDetailTpl"></ng-container>
        } @else {
          @switch (activeTab()) {
            @case ('dashboard') { <ng-container *ngTemplateOutlet="dashboardTpl"></ng-container> }
            @case ('calendario') { <ng-container *ngTemplateOutlet="calendarTpl"></ng-container> }
            @case ('cursos') { <ng-container *ngTemplateOutlet="coursesTpl"></ng-container> }
            @case ('matriculas') { <ng-container *ngTemplateOutlet="matriculasTpl"></ng-container> }
            @case ('secciones') { <ng-container *ngTemplateOutlet="seccionesTpl"></ng-container> }
            @case ('usuarios') { <ng-container *ngTemplateOutlet="usuariosTpl"></ng-container> }
            @case ('perfiles') { <ng-container *ngTemplateOutlet="perfilesTpl"></ng-container> }
            @case ('asesorias') { <ng-container *ngTemplateOutlet="asesoriasTpl"></ng-container> }
            @case ('reportes') { <ng-container *ngTemplateOutlet="reportesTpl"></ng-container> }
            @case ('configuracion') { <ng-container *ngTemplateOutlet="configTpl"></ng-container> }
            @case ('perfil') { <ng-container *ngTemplateOutlet="perfilTpl"></ng-container> }
          }
        }
      </section>
    </main>

    <ng-template #dashboardTpl>
      <section class="stats-grid">
        @for (stat of dashboardStats(); track stat.label) {
          <article class="stat"><span>{{ stat.label }}</span><strong>{{ stat.value }}</strong></article>
        }
      </section>

      <section class="grid two">
        <article class="panel">
          <h2>{{ dashboardTitle() }}</h2>
          <div class="quick-actions">
            @for (item of menu().slice(1, 5); track item.key) {
              <button class="action-tile" (click)="go(item.key)"><span>{{ item.icon }}</span><b>{{ item.label }}</b></button>
            }
          </div>
        </article>
        <article class="panel">
          <h2>Tareas pendientes</h2>
          <div class="timeline">
            @for (item of pendingTasks().slice(0, 6); track item.titulo + item.fecha_entrega) {
              <div><b>{{ item.titulo }}</b><span>{{ item.curso }} · {{ item.fecha_entrega }} · {{ item.estado }}</span></div>
            }
            @if (pendingTasks().length === 0) { <p class="muted">No hay tareas pendientes por ahora.</p> }
          </div>
        </article>
      </section>
    </ng-template>

    <ng-template #calendarTpl>
      <section class="panel calendar-panel">
        <div class="week-title">
          <div>
            <h2>Calendario académico semanal</h2>
          </div>
          <span class="pill">Semana actual</span>
        </div>
        <div class="week-calendar">
          @for (day of calendarWeekDays(); track day.iso) {
            <article class="week-day">
              <header>
                <span>{{ day.label }}</span>
                <strong>{{ day.number }}</strong>
              </header>
              <div class="day-events">
                @for (item of day.events; track item.title + item.date) {
                  <div class="calendar-event" [class.task]="item.type === 'SIMULACRO' || item.type === 'PRACTICA' || item.type === 'PRÁCTICA' || item.type === 'TAREA'" [class.meet]="item.type === 'CLASE' || item.type === 'ASESORIA'">
                    <b>{{ item.title }}</b>
                    <small>{{ item.hour }} · {{ item.course }}</small>
                    <em>{{ item.type }}</em>
                  </div>
                }
                @if (day.events.length === 0) { <span class="no-event">Sin actividades</span> }
              </div>
            </article>
          }
        </div>
      </section>
    </ng-template>

    <ng-template #coursesTpl>
      @if (user()?.rol === 'ADMINISTRADOR') {
        <section class="panel intro-panel admin-classroom-head">
          <div>
            <h2>Catálogo de cursos</h2>
          </div>
          <button class="btn btn-primary" (click)="toggleCreateCourse()">{{ showCreateCourse() ? 'Ocultar formulario' : 'Crear curso' }}</button>
        </section>

        @if (showCreateCourse()) {
          <section class="panel inline-form-panel">
            <h3>Crear curso</h3>
            <form class="form two-cols course-create-form" (ngSubmit)="createCourse()">
              <div><label>Nombre del curso</label><input [(ngModel)]="newCourse.nombre" name="cursoNombre" placeholder="Química" required /></div>
              <div><label>Ciclo</label><input [(ngModel)]="newCourse.ciclo" name="cursoCiclo" placeholder="Pre San Marcos" required /></div>
              <div class="span-2"><label>Descripción</label><textarea [(ngModel)]="newCourse.descripcion" name="cursoDescripcion" placeholder="Temas principales del curso" required></textarea></div>
              <div><label>Estado</label><select [(ngModel)]="newCourse.estado" name="cursoEstado"><option value="ACTIVO">ACTIVO</option><option value="INACTIVO">INACTIVO</option></select></div>
              <div class="form-actions"><button class="btn btn-primary">Guardar curso</button></div>
            </form>
            @if (courseMessage()) { <div class="alert success">{{ courseMessage() }}</div> }
          </section>
        }

        <section class="classroom-grid">
          @for (c of data()?.cursos || []; track c.id) {
            <article class="classroom-card" (click)="openAdminCourse(c)">
              <div class="classroom-cover">
                <span>{{ c.ciclo }}</span>
                <b>{{ c.estado }}</b>
              </div>
              <div class="classroom-body">
                <h2>{{ c.nombre }}</h2>
                <p>{{ c.descripcion }}</p>
                <div class="classroom-meta">
                  <span>{{ sectionsByCourse(c.id).length }} secciones</span>
                  <span>{{ studentsByCourse(c.id) }} alumnos</span>
                </div>
              </div>
            </article>
          }
        </section>
      } @else {
        <section class="panel intro-panel">
          <h2>{{ coursesIntroTitle() }}</h2>
        </section>

        <section class="cards-grid">
          @for (s of data()?.secciones || []; track s.id) {
            <article class="course-card" (click)="openCourse(s)">
              <div class="course-top"><span>{{ s.codigo }}</span><b>{{ s.modalidad }}</b></div>
              <h2>{{ s.curso }}</h2>
              <p>{{ s.curso_descripcion || 'Espacio académico de Educatoon.' }}</p>
              <div class="meta">
                <span>Docente: {{ s.docente || 'Sin asignar' }}</span>
                <span>{{ s.horario }}</span>
                <span>{{ s.aula }}</span>
              </div>
            </article>
          }
        </section>
      }
    </ng-template>

    <ng-template #adminCourseTpl>
      <section class="course-detail admin-course-detail">
        <section class="panel sections-first-panel">
          <div class="section-header-row">
            <div>
              <span class="eyebrow">Administración de curso</span>
              <h2>Secciones del curso</h2>
              <p class="muted">
                {{ selectedAdminCourse()?.nombre }} · {{ selectedAdminCourse()?.ciclo }} · {{ selectedAdminCourse()?.estado }}
              </p>
            </div>
            <button class="btn btn-primary" (click)="toggleCreateSection()">
              {{ showCreateSection() ? 'Ocultar formulario' : 'Crear sección' }}
            </button>
          </div>

          <div class="section-card-grid">
            @for (s of adminCourseSections(); track s.id) {
              <article class="section-admin-card">
                <div>
                  <span class="pill">{{ s.modalidad }}</span>
                  <h3>{{ s.codigo }}</h3>
                  <p>{{ s.docente || 'Sin docente asignado' }}</p>
                  <small>{{ s.horario }} · {{ s.aula }}</small>
                </div>
                <div class="section-card-footer">
                  <span>{{ s.matriculados || 0 }} / {{ s.capacidad }} alumnos</span>
                  <button class="btn btn-ghost small" (click)="openAdminSection(s)">Abrir sección</button>
                </div>
              </article>
            }
          </div>

          @if (adminCourseSections().length === 0) {
            <p class="muted empty-admin-sections">Este curso aún no tiene secciones registradas. Usa el botón “Crear sección” para agregar la primera.</p>
          }
          @if (enrollmentMessage()) { <div class="alert success">{{ enrollmentMessage() }}</div> }
        </section>

        @if (showCreateSection()) {
          <section class="panel inline-form-panel">
            <h3>Crear sección para {{ selectedAdminCourse()?.nombre }}</h3>
            <form class="form two-cols" (ngSubmit)="createSectionForSelectedCourse()">
              <div><label>Docente</label><select [(ngModel)]="newSection.docente_id" name="docente_id"><option [ngValue]="0">Sin asignar</option>@for (d of docentes(); track d.id) { <option [ngValue]="d.id">{{ d.nombre }}</option> }</select></div>
              <div><label>Código</label><input [(ngModel)]="newSection.codigo" name="codigo" placeholder="MAT-A2" required /></div>
              <div><label>Capacidad</label><input [(ngModel)]="newSection.capacidad" name="capacidad" type="number" min="1" required /></div>
              <div><label>Modalidad</label><select [(ngModel)]="newSection.modalidad" name="modalidad"><option>MIXTA</option><option>PRESENCIAL</option><option>VIRTUAL</option></select></div>
              <div><label>Aula</label><input [(ngModel)]="newSection.aula" name="aula" placeholder="Aula 202" required /></div>
              <div><label>Día de clase</label><select [(ngModel)]="newSectionSchedule.dia" name="sectionDia" required><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option><option>Sábado</option><option>Domingo</option></select></div>
              <div><label>Hora inicio</label><input [(ngModel)]="newSectionSchedule.hora_inicio" name="sectionHoraInicio" type="time" required /></div>
              <div><label>Hora fin</label><input [(ngModel)]="newSectionSchedule.hora_fin" name="sectionHoraFin" type="time" required /></div>
              <div class="span-2 schedule-preview"><b>Horario generado:</b> {{ buildHorario() }}</div>
              <div class="span-2"><button class="btn btn-primary">Guardar sección</button></div>
            </form>
            @if (sectionMessage()) { <div class="alert success">{{ sectionMessage() }}</div> }
          </section>
        }
      </section>
    </ng-template>

    <ng-template #courseDetailTpl>
      <section class="course-detail">
        <section class="course-hero panel">
          <div>
            <span class="eyebrow">{{ selectedCourse()?.codigo }} · {{ selectedCourse()?.modalidad }}</span>
            <h1>{{ selectedCourse()?.curso }}</h1>
            <p>{{ selectedCourse()?.curso_descripcion }}</p>
            <div class="meta inline">
              <span>Docente: {{ selectedCourse()?.docente || 'Sin asignar' }}</span>
              <span>{{ selectedCourse()?.horario }}</span>
              <span>{{ selectedCourse()?.aula }}</span>
            </div>
          </div>
        </section>

        <section class="teams-course-layout">
          <aside class="panel week-side">
            <h3>Contenido por semanas</h3>
            @for (week of weeks; track week.key) {
              <button class="week-btn" [class.active]="activeWeek() === week.key" (click)="selectWeek(week.key)">
                <b>{{ week.label }}</b><span>{{ week.subtitle }}</span>
              </button>
            }
            <hr>
            <h3>Espacios de conversación</h3>
            @for (c of foroTopics(); track c.id) {
              <button class="channel-btn" [class.active]="selectedChannel()?.id === c.id" (click)="selectChannel(c)">
                {{ c.nombre }}<span>{{ c.descripcion }}</span>
              </button>
            }
          </aside>

          <section class="panel week-main">
            <div class="week-header">
              <div>
                <span class="eyebrow">{{ currentWeek().label }}</span>
                <h2>{{ currentWeek().title }}</h2>
              </div>
            </div>

            <div class="course-tabs">
              <button [class.active]="courseTab() === 'contenido'" (click)="courseTab.set('contenido')">Contenido</button>
              <button [class.active]="courseTab() === 'tareas'" (click)="courseTab.set('tareas')">Tareas</button>
              <button [class.active]="courseTab() === 'notas'" (click)="courseTab.set('notas')">Notas</button>
            </div>

            @switch (courseTab()) {
              @case ('contenido') {
                @if (canUploadMaterial()) {
                  <section class="upload-box">
                    <h3>Cargar material del curso</h3>
                    <p class="muted">Semana seleccionada: {{ currentWeek().label }}</p>
                    <form class="form upload-form" (ngSubmit)="uploadMaterial()">
                      <div><label>Título</label><input [(ngModel)]="materialForm.titulo" name="materialTitulo" placeholder="Guía Semana 2" required /></div>
                      <div><label>Tipo</label><select [(ngModel)]="materialForm.tipo" name="materialTipo"><option>PDF</option><option>PPTX</option><option>IMAGEN</option><option>VIDEO</option><option>ENLACE</option></select></div>
                      <div class="span-2"><label>Descripción</label><input [(ngModel)]="materialForm.descripcion" name="materialDescripcion" placeholder="Describe el recurso didáctico" /></div>
                      <div class="span-2"><label>Archivo</label><input type="file" (change)="onMaterialFile($event)" accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.doc,.docx" /></div>
                      <div class="span-2"><button class="btn btn-primary">Cargar archivo</button></div>
                    </form>
                    @if (materialMessage()) { <div class="alert success">{{ materialMessage() }}</div> }
                  </section>
                }

                <section class="resource-grid">
                  @for (m of courseMaterials(); track m.id) {
                    <article class="resource-card">
                      <span class="pill">{{ m.tipo }}</span>
                      <h3>{{ m.titulo }}</h3>
                      <p>{{ m.descripcion }}</p>
                      <a [href]="m.archivo_url" target="_blank">Abrir recurso</a>
                    </article>
                  }
                  @if (courseMaterials().length === 0) { <p class="muted">Aún no hay materiales cargados para este curso.</p> }
                </section>
              }
              @case ('tareas') {
                @if (canCreateTask()) {
                  <section class="upload-box task-create-box">
                    <h3>Crear tarea para {{ currentWeek().label }}</h3>
                    <form class="form upload-form" (ngSubmit)="createTask()">
                      <div><label>Título</label><input [(ngModel)]="taskForm.titulo" name="taskTitulo" placeholder="Ejercicios de práctica" required /></div>
                      <div><label>Tipo</label><select [(ngModel)]="taskForm.tipo" name="taskTipo"><option>TAREA</option><option>PRÁCTICA</option><option>SIMULACRO</option></select></div>
                      <div><label>Fecha de entrega</label><input [(ngModel)]="taskForm.fecha_entrega" name="taskFecha" type="date" required /></div>
                      <div><label>Archivo de apoyo</label><input type="file" (change)="onTaskFile($event)" accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.doc,.docx" /></div>
                      <div class="span-2"><label>Instrucción</label><textarea [(ngModel)]="taskForm.instruccion" name="taskInstruccion" placeholder="Indica qué debe resolver o subir el alumno" required></textarea></div>
                      <div class="span-2"><button class="btn btn-primary">Publicar tarea</button></div>
                    </form>
                    @if (taskMessage()) { <div class="alert success">{{ taskMessage() }}</div> }
                  </section>
                }

                <section class="task-list">
                  @for (t of currentWeekTasks(); track t.id) {
                    <article class="task-card">
                      <div class="task-head">
                        <div><span class="pill">{{ t.tipo }}</span><h3>{{ t.titulo }}</h3><p>{{ t.instruccion }}</p></div>
                        <div class="task-date"><b>Entrega</b><span>{{ t.fecha_entrega }}</span></div>
                      </div>
                      @if (t.archivo_url) { <a class="file-link" [href]="t.archivo_url" target="_blank">Abrir archivo de la tarea</a> }

                      @if (user()?.rol === 'ALUMNO') {
                        <div class="submission-box">
                          <h4>Mi entrega</h4>
                          @if (deliveryForTask(t.id)) {
                            <p class="muted">Estado: <b>{{ deliveryForTask(t.id)?.estado }}</b> · Nota: <b>{{ deliveryForTask(t.id)?.nota ?? 'Pendiente' }}</b></p>
                            @if (deliveryForTask(t.id)?.archivo_url) { <a [href]="deliveryForTask(t.id)?.archivo_url" target="_blank">Ver archivo entregado</a> }
                            @if (deliveryForTask(t.id)?.retroalimentacion) { <p class="feedback"><b>Retroalimentación:</b> {{ deliveryForTask(t.id)?.retroalimentacion }}</p> }
                          } @else {
                            <p class="muted">Aún no has entregado esta tarea.</p>
                          }
                          <form class="form upload-form compact-upload" (ngSubmit)="submitTask(t)">
                            <div class="span-2"><label>Comentario</label><input [(ngModel)]="taskSubmissionComments[t.id]" [name]="'taskComment' + t.id" placeholder="Comentario para el docente" /></div>
                            <div><label>Archivo de entrega</label><input type="file" (change)="onTaskSubmissionFile($event, t.id)" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" /></div>
                            <div><button class="btn btn-primary">Subir entrega</button></div>
                          </form>
                        </div>
                      }

                      @if (canGradeTasks()) {
                        <div class="submissions-list">
                          <h4>Entregas de alumnos</h4>
                          @for (e of submissionsForTask(t.id); track e.id) {
                            <div class="submission-row">
                              <div><b>{{ e.alumno }}</b><small>{{ e.created_at }} · {{ e.estado }}</small>@if (e.archivo_url) { <a [href]="e.archivo_url" target="_blank">Ver entrega</a> }</div>
                              <div><input type="number" min="0" max="20" step="0.1" [(ngModel)]="gradeForms[e.id].nota" [name]="'nota' + e.id" placeholder="Nota" /></div>
                              <div><input [(ngModel)]="gradeForms[e.id].retroalimentacion" [name]="'retro' + e.id" placeholder="Retroalimentación" /></div>
                              <button class="btn btn-primary tiny" (click)="gradeSubmission(e)">Guardar nota</button>
                            </div>
                          }
                          @if (submissionsForTask(t.id).length === 0) { <p class="muted">Aún no hay entregas para esta tarea.</p> }
                        </div>
                      }
                    </article>
                  }
                  @if (currentWeekTasks().length === 0) { <p class="muted">Aún no hay tareas asignadas para esta semana.</p> }
                </section>
              }
              @case ('notas') {
                <section class="gradebook">
                  @if (user()?.rol === 'ALUMNO') {
                    <section class="cards-grid compact">
                      @for (e of courseDeliveries(); track e.id) {
                        <article class="panel-lite">
                          <h3>{{ e.tarea }}</h3>
                          <div class="progress-line"><span>Nota</span><b>{{ e.nota ?? 'Pendiente' }}</b></div>
                          <div class="bar"><i [style.width.%]="(e.nota || 0) * 5"></i></div>
                          <p class="muted">{{ e.retroalimentacion || 'Sin retroalimentación registrada.' }}</p>
                        </article>
                      }
                      @if (courseDeliveries().length === 0) { <p class="muted">Todavía no tienes entregas calificadas o pendientes.</p> }
                    </section>
                  } @else {
                    <section class="table grade-table">
                      <div class="table-row head"><span>Alumno</span><span>Tarea</span><span>Entrega</span><span>Nota</span><span>Retroalimentación</span><span>Acción</span></div>
                      @for (e of courseDeliveries(); track e.id) {
                        <div class="table-row"><span>{{ e.alumno }}</span><span><b>{{ e.tarea }}</b><small>{{ e.semana }}</small></span><span>@if (e.archivo_url) { <a [href]="e.archivo_url" target="_blank">Archivo</a> } @else { — }</span><span><input type="number" min="0" max="20" step="0.1" [(ngModel)]="gradeForms[e.id].nota" [name]="'notaTabla' + e.id" /></span><span><input [(ngModel)]="gradeForms[e.id].retroalimentacion" [name]="'retroTabla' + e.id" /></span><span><button class="btn btn-primary tiny" (click)="gradeSubmission(e)">Guardar</button></span></div>
                      }
                      @if (courseDeliveries().length === 0) { <p class="muted">Aún no hay entregas para calificar.</p> }
                    </section>
                  }
                </section>
              }
              @case ('foro') {
                <section class="chat-main embedded">
                  @if (!selectedChannel()) {
                    <div class="empty-state">Selecciona un tema del foro para conversar.</div>
                  } @else {
                    <header class="chat-header"><h2>{{ selectedChannel()?.nombre }}</h2><p>{{ selectedChannel()?.descripcion }}</p></header>
                    <div class="messages">
                      @for (m of mensajes(); track m.id) {
                        <article class="msg" [class.mine]="m.usuario_id === user()?.id">
                          <div class="msg-avatar">{{ m.autor.slice(0, 1) }}</div>
                          <div>
                            <strong>{{ m.autor }} <span>{{ m.rol }}</span></strong>
                            <p>{{ m.contenido }}</p>
                            <small>{{ m.created_at }}</small>
                          </div>
                        </article>
                      }
                    </div>
                    <form class="message-form" (ngSubmit)="sendMessage()">
                      <input [(ngModel)]="messageText" name="message" placeholder="Escribe en el foro académico..." />
                      <button class="btn btn-primary">Enviar</button>
                    </form>
                  }
                </section>
              }
            }
          </section>
        </section>
      </section>
    </ng-template>

    <ng-template #matriculasTpl>
      <section class="grid two">
        <article class="panel">
          <h2>Matrículas y registros pendientes</h2>
          <p class="muted">El coordinador puede revisar solicitudes de nuevos alumnos y derivarlas para aprobación.</p>
          <div class="timeline">
            @for (p of pendingProfiles(); track p.usuario_id) {
              <div><b>{{ p.nombres }} {{ p.apellidos }}</b><span>{{ p.email }} · Estado {{ p.usuario_estado }}</span></div>
            }
          </div>
        </article>
        <article class="panel">
          <h2>Funciones del coordinador</h2>
          <ul class="clean-list">
            <li>Validar registros y documentos de matrícula.</li>
            <li>Asignar alumnos a secciones.</li>
            <li>Asignar docentes según curso y disponibilidad.</li>
            <li>Coordinar notas, asistencia y asesorías.</li>
          </ul>
        </article>
      </section>
    </ng-template>

    <ng-template #seccionesTpl>
      <section class="grid two">
        <article class="panel">
          <h2>Crear sección</h2>
          <form class="form" (ngSubmit)="createSection()">
            <label>Curso</label>
            <select [(ngModel)]="newSection.curso_id" name="curso_id" required>
              <option [ngValue]="0">Seleccionar</option>
              @for (c of data()?.cursos || []; track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
            </select>
            <label>Docente</label>
            <select [(ngModel)]="newSection.docente_id" name="docente_id">
              <option [ngValue]="0">Sin asignar</option>
              @for (d of docentes(); track d.id) { <option [ngValue]="d.id">{{ d.nombre }}</option> }
            </select>
            <label>Código</label><input [(ngModel)]="newSection.codigo" name="codigo" placeholder="MAT-A2" required />
            <label>Aula</label><input [(ngModel)]="newSection.aula" name="aula" placeholder="Aula 202" required />
            <label>Día de clase</label><select [(ngModel)]="newSectionSchedule.dia" name="sectionDiaGeneral" required><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option><option>Sábado</option><option>Domingo</option></select>
            <label>Hora inicio</label><input [(ngModel)]="newSectionSchedule.hora_inicio" name="sectionHoraInicioGeneral" type="time" required />
            <label>Hora fin</label><input [(ngModel)]="newSectionSchedule.hora_fin" name="sectionHoraFinGeneral" type="time" required />
            <div class="schedule-preview"><b>Horario generado:</b> {{ buildHorario() }}</div>
            <button class="btn btn-primary">Crear sección</button>
          </form>
          @if (sectionMessage()) { <div class="alert success">{{ sectionMessage() }}</div> }
        </article>
        <article class="panel">
          <h2>Secciones registradas</h2>
          <div class="timeline">
            @for (s of data()?.secciones || []; track s.id) {
              <div><b>{{ s.codigo }} · {{ s.curso }}</b><span>{{ s.docente || 'Sin docente' }} · {{ s.horario }}</span></div>
            }
          </div>
        </article>
      </section>
    </ng-template>

    <ng-template #usuariosTpl>
      <section class="panel admin-users-panel">
        <div class="section-header-row">
          <div>
            <h2>Usuarios registrados</h2>
          </div>
          <button class="btn btn-primary" (click)="startCreateUser()">Crear usuario</button>
        </div>

        <div class="user-toolbar">
          <label class="search-box">
            <span>Buscar usuario</span>
            <input [ngModel]="userSearch()" (ngModelChange)="userSearch.set($event)" name="userSearch" placeholder="Buscar por nombre, apellido, DNI, correo o rol..." />
          </label>
          <span class="pill">{{ filteredPerfiles().length }} resultados</span>
        </div>

        @if (showCreateUser()) {
          <section class="inline-form-panel">
            <div class="section-header-row compact-row">
              <h3>{{ editingUserId() ? 'Editar usuario' : 'Crear usuario' }}</h3>
              <button type="button" class="btn btn-ghost small" (click)="cancelUserForm()">Cancelar</button>
            </div>
            <form class="form two-cols" (ngSubmit)="saveUser()">
              <div><label>Nombre</label><input [(ngModel)]="newUser.nombres" name="newUserNombres" required /></div>
              <div><label>Apellido paterno</label><input [(ngModel)]="newUser.apellido_paterno" name="newUserPaterno" required /></div>
              <div><label>Apellido materno</label><input [(ngModel)]="newUser.apellido_materno" name="newUserMaterno" required /></div>
              <div><label>DNI</label><input [(ngModel)]="newUser.dni" name="newUserDni" required /></div>
              <div><label>Edad</label><input [(ngModel)]="newUser.edad" name="newUserEdad" type="number" min="1" /></div>
              <div><label>Correo</label><input [(ngModel)]="newUser.email" name="newUserEmail" type="email" required /></div>
              <div><label>Contraseña</label><input [(ngModel)]="newUser.password" name="newUserPassword" type="password" [required]="!editingUserId()" placeholder="{{ editingUserId() ? 'Dejar vacío para no cambiar' : 'Contraseña' }}" /></div>
              <div><label>Rol</label><select [(ngModel)]="newUser.rol" name="newUserRol"><option value="ALUMNO">ALUMNO</option><option value="DOCENTE">DOCENTE</option><option value="COORDINADOR">COORDINADOR</option><option value="ADMINISTRADOR">ADMINISTRADOR</option></select></div>
              <div><label>Estado</label><select [(ngModel)]="newUser.estado" name="newUserEstado"><option value="APROBADO">APROBADO</option><option value="PENDIENTE">PENDIENTE</option></select></div>
              <div><label>Teléfono</label><input [(ngModel)]="newUser.telefono" name="newUserTelefono" /></div>
              <div class="span-2"><label>Dirección</label><input [(ngModel)]="newUser.direccion" name="newUserDireccion" /></div>
              <div class="span-2"><button class="btn btn-primary">{{ editingUserId() ? 'Guardar cambios' : 'Guardar usuario' }}</button></div>
            </form>
            @if (userMessage()) { <div class="alert success">{{ userMessage() }}</div> }
          </section>
        }

        <div class="excel-table users-crud-table">
          <div class="excel-row excel-head"><span>Nombre</span><span>Apellido paterno</span><span>Apellido materno</span><span>DNI</span><span>Edad</span><span>Correo</span><span>Rol</span><span>Estado</span><span>Acciones</span></div>
          @for (p of filteredPerfiles(); track p.usuario_id) {
            <div class="excel-row clickable-row" [class.selected]="selectedUserDetail()?.usuario?.usuario_id === p.usuario_id" (click)="openUserDetail(p)">
              <span>{{ p.nombres }}</span>
              <span>{{ p.apellido_paterno || splitApellido(p.apellidos, 0) }}</span>
              <span>{{ p.apellido_materno || splitApellido(p.apellidos, 1) }}</span>
              <span>{{ p.dni || '—' }}</span>
              <span>{{ p.edad || '—' }}</span>
              <span>{{ p.email }}</span>
              <span>{{ p.rol }}</span>
              <span><b [class.pending]="p.usuario_estado === 'PENDIENTE'">{{ p.usuario_estado }}</b></span>
              <span class="row-actions">
                @if (p.usuario_estado === 'PENDIENTE') { <button class="btn btn-primary tiny" (click)="approve(p); $event.stopPropagation()">Aprobar</button> }
                <button class="btn btn-ghost tiny" (click)="startEditUser(p); $event.stopPropagation()">Editar</button>
                <button class="btn btn-danger tiny" (click)="deleteUser(p); $event.stopPropagation()">Eliminar</button>
              </span>
            </div>
          }
        </div>

        @if (userDetailLoading()) {
          <section class="panel-lite user-detail-card"><p class="muted">Cargando detalle del usuario...</p></section>
        } @else if (selectedUserDetail()) {
          <section class="panel-lite user-detail-card">
            <div class="section-header-row compact-row">
              <div>
                <span class="eyebrow">Detalle del usuario</span>
                <h3>{{ selectedUserDetail()?.usuario?.nombres }} {{ selectedUserDetail()?.usuario?.apellido_paterno }} {{ selectedUserDetail()?.usuario?.apellido_materno }}</h3>
                  </div>
              <button class="btn btn-ghost small" (click)="closeUserDetail()">Cerrar detalle</button>
            </div>

            <div class="detail-grid">
              <div><b>DNI</b><span>{{ selectedUserDetail()?.usuario?.dni || '—' }}</span></div>
              <div><b>Edad</b><span>{{ selectedUserDetail()?.usuario?.edad || '—' }}</span></div>
              <div><b>Correo</b><span>{{ selectedUserDetail()?.usuario?.email }}</span></div>
              <div><b>Rol</b><span>{{ selectedUserDetail()?.usuario?.rol }}</span></div>
              <div><b>Estado</b><span>{{ selectedUserDetail()?.usuario?.usuario_estado }}</span></div>
              <div><b>Teléfono</b><span>{{ selectedUserDetail()?.usuario?.telefono || '—' }}</span></div>
              <div class="span-2"><b>Dirección</b><span>{{ selectedUserDetail()?.usuario?.direccion || '—' }}</span></div>
            </div>

            <h3>Cursos y secciones asociados</h3>
            <div class="table user-courses-table">
              <div class="table-row head"><span>Curso</span><span>Sección</span><span>Horario</span><span>Docente</span><span>Estado / vínculo</span></div>
              @for (c of selectedUserDetail()?.cursos || []; track c.seccion_id + c.tipo_vinculo) {
                <div class="table-row"><span><b>{{ c.curso }}</b></span><span>{{ c.seccion_codigo }} · {{ c.modalidad }} · {{ c.aula }}</span><span>{{ c.horario }}</span><span>{{ c.docente }}</span><span>{{ c.estado }} · {{ c.tipo_vinculo }}</span></div>
              }
              @if ((selectedUserDetail()?.cursos || []).length === 0) { <p class="muted">Este usuario no tiene cursos o secciones asociados.</p> }
            </div>
          </section>
        }
      </section>
    </ng-template>

    <ng-template #perfilesTpl>
      <section class="panel">
        <h2>Aprobación de perfiles</h2>
        <div class="table">
          <div class="table-row head"><span>Usuario</span><span>Rol</span><span>Estado</span><span>Acción</span></div>
          @for (p of perfiles(); track p.usuario_id) {
            <div class="table-row"><span><b>{{ p.nombres }} {{ p.apellidos }}</b><small>{{ p.email }} · DNI {{ p.dni }}</small></span><span>{{ p.rol }}</span><span><b [class.pending]="p.usuario_estado === 'PENDIENTE'">{{ p.usuario_estado }}</b></span><span>@if (p.usuario_estado === 'PENDIENTE') { <button class="btn btn-primary" (click)="approve(p)">Aprobar</button> } @else { <span>—</span> }</span></div>
          }
        </div>
      </section>
    </ng-template>

    <ng-template #asesoriasTpl>
      <section class="panel asesorias-panel">
        <div class="section-header-row">
          <div>
            <h2>Asesorías académicas</h2>
          </div>
          @if (canCreateAsesoria()) {
            <button class="btn btn-primary" (click)="toggleCreateAsesoria()">{{ showCreateAsesoria() ? 'Ocultar formulario' : 'Crear asesoría' }}</button>
          }
        </div>

        @if (showCreateAsesoria()) {
          <section class="inline-form-panel asesoria-create-panel">
            <div class="section-header-row compact-row">
              <h3>Crear asesoría</h3>
              <button type="button" class="btn btn-ghost small" (click)="toggleCreateAsesoria()">Cancelar</button>
            </div>
            <form class="form two-cols" (ngSubmit)="createAsesoria()">
              <div><label>Alumno</label><select [(ngModel)]="newAsesoria.alumno_id" name="asesoriaAlumno" required><option [ngValue]="0">Seleccionar alumno</option>@for (a of alumnos(); track a.id) { <option [ngValue]="a.id">{{ a.nombre }} · {{ a.dni }}</option> }</select></div>
              <div><label>Docente asesor</label><select [(ngModel)]="newAsesoria.docente_id" name="asesoriaDocente" required><option [ngValue]="0">Seleccionar docente</option>@for (d of docentes(); track d.id) { <option [ngValue]="d.id">{{ d.nombre }}</option> }</select></div>
              <div><label>Curso</label><select [(ngModel)]="newAsesoria.curso_id" name="asesoriaCurso" required><option [ngValue]="0">Seleccionar curso</option>@for (c of data()?.cursos || []; track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }</select></div>
              <div><label>Modalidad</label><select [(ngModel)]="newAsesoria.modalidad" name="asesoriaModalidad"><option>VIRTUAL</option><option>PRESENCIAL</option></select></div>
              <div><label>Fecha</label><input type="date" [(ngModel)]="asesoriaSchedule.fecha" name="asesoriaFecha" required /></div>
              <div><label>Hora</label><input type="time" [(ngModel)]="asesoriaSchedule.hora" name="asesoriaHora" required /></div>
              <div class="span-2"><label>Tema</label><input [(ngModel)]="newAsesoria.tema" name="asesoriaTema" placeholder="Comprensión lectora" required /></div>
              <div class="span-2"><label>Motivo</label><textarea [(ngModel)]="newAsesoria.motivo" name="asesoriaMotivo" placeholder="Describe por qué se programa la asesoría" required></textarea></div>
              <div class="span-2"><label>Áreas de refuerzo</label><input [(ngModel)]="newAsesoria.areas_refuerzo" name="asesoriaAreas" placeholder="Inferencias, conectores, idea principal" required /></div>
              <div class="span-2"><label>Enlace de reunión</label><input [(ngModel)]="newAsesoria.enlace" name="asesoriaEnlace" placeholder="https://meet.google.com/..." /></div>
              <div class="span-2"><button class="btn btn-primary">Guardar asesoría</button></div>
            </form>
          </section>
        }

        @if (asesoriaMessage()) { <div class="alert success">{{ asesoriaMessage() }}</div> }

        @if (!selectedAsesoria()) {
          <div class="table asesorias-table">
            <div class="table-row head"><span>Alumno</span><span>Curso / Tema</span><span>Docente</span><span>Fecha</span><span>Estado</span></div>
            @for (a of data()?.asesorias || []; track a.id) {
              <div class="table-row clickable-row" (click)="openAsesoria(a)"><span>{{ a.alumno }}</span><span><b>{{ a.curso }}</b><small>{{ a.tema }} · {{ a.areas_refuerzo }}</small></span><span>{{ a.docente }}</span><span>{{ a.fecha_programada }}</span><span><b>{{ a.estado }}</b></span></div>
            }
            @if ((data()?.asesorias || []).length === 0) { <p class="muted">No hay asesorías registradas.</p> }
          </div>
        }

        @if (asesoriaDetailLoading()) {
          <section class="panel-lite"><p class="muted">Cargando detalle de asesoría...</p></section>
        } @else if (selectedAsesoria()) {
          <section class="asesoria-detail">
            <div class="section-header-row compact-row">
              <div>
                <span class="eyebrow">Detalle de asesoría</span>
                <h3>{{ selectedAsesoria()?.asesoria?.curso }} · {{ selectedAsesoria()?.asesoria?.tema }}</h3>
              </div>
              <button class="btn btn-ghost small" (click)="closeAsesoria()">Cerrar detalle</button>
            </div>

            <div class="detail-grid asesoria-summary">
              <div><b>Alumno</b><span>{{ selectedAsesoria()?.asesoria?.alumno }}</span></div>
              <div><b>Docente asesor</b><span>{{ selectedAsesoria()?.asesoria?.docente }}</span></div>
              <div><b>Fecha</b><span>{{ selectedAsesoria()?.asesoria?.fecha_programada }}</span></div>
              <div><b>Modalidad</b><span>{{ selectedAsesoria()?.asesoria?.modalidad }}</span></div>
              <div><b>Estado</b><span>{{ selectedAsesoria()?.asesoria?.estado }}</span></div>
              <div><b>Asistencia</b><span>{{ selectedAsesoria()?.asesoria?.asistencia ? 'Registrada' : 'Pendiente' }}</span></div>
              <div class="span-2"><b>Motivo</b><span>{{ selectedAsesoria()?.asesoria?.motivo || '—' }}</span></div>
              <div class="span-2"><b>Áreas de refuerzo</b><span>{{ selectedAsesoria()?.asesoria?.areas_refuerzo }}</span></div>
              <div class="span-2"><b>Enlace</b><span>@if (selectedAsesoria()?.asesoria?.enlace) { <a [href]="selectedAsesoria()?.asesoria?.enlace" target="_blank">Unirse a reunión</a> } @else { <span>—</span> }</span></div>
            </div>

            <section class="grid two asesoria-workspace">
              <article class="panel-lite">
                <h3>Foro de asesoría</h3>
                <div class="messages asesorias-messages">
                  @for (m of selectedAsesoria()?.mensajes || []; track m.id) {
                    <article class="msg" [class.mine]="m.usuario_id === user()?.id"><div class="msg-avatar">{{ m.autor.slice(0, 1) }}</div><div><strong>{{ m.autor }} <span>{{ m.rol }}</span></strong><p>{{ m.contenido }}</p><small>{{ m.created_at }}</small></div></article>
                  }
                </div>
                <form class="message-form" (ngSubmit)="sendAsesoriaMessage()">
                  <input [(ngModel)]="asesoriaMessageText" name="asesoriaMessage" placeholder="Escribe una duda, indicación o seguimiento..." />
                  <button class="btn btn-primary">Enviar</button>
                </form>
              </article>

              <article class="panel-lite">
                <h3>Material de refuerzo</h3>
                @if (canManageAsesoria()) {
                  <form class="form upload-form compact-upload" (ngSubmit)="uploadAsesoriaMaterial()">
                    <div><label>Título</label><input [(ngModel)]="asesoriaMaterialForm.titulo" name="asesoriaMatTitulo" required /></div>
                    <div><label>Tipo</label><select [(ngModel)]="asesoriaMaterialForm.tipo" name="asesoriaMatTipo"><option>PDF</option><option>PPTX</option><option>IMAGEN</option><option>DOCUMENTO</option><option>ENLACE</option></select></div>
                    <div class="span-2"><label>Descripción</label><input [(ngModel)]="asesoriaMaterialForm.descripcion" name="asesoriaMatDesc" /></div>
                    <div class="span-2"><label>Archivo</label><input type="file" (change)="onAsesoriaMaterialFile($event)" accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.doc,.docx" /></div>
                    <div class="span-2"><button class="btn btn-primary">Subir material</button></div>
                  </form>
                }
                <div class="resource-grid compact-resources">
                  @for (m of selectedAsesoria()?.materiales || []; track m.id) {
                    <article class="resource-card"><span class="pill">{{ m.tipo }}</span><h3>{{ m.titulo }}</h3><p>{{ m.descripcion }}</p><a [href]="m.archivo_url" target="_blank">Abrir recurso</a></article>
                  }
                  @if ((selectedAsesoria()?.materiales || []).length === 0) { <p class="muted">No hay material de refuerzo cargado.</p> }
                </div>
              </article>
            </section>

            @if (canManageAsesoria()) {
              <section class="panel-lite asesoria-close-panel">
                <h3>Seguimiento del docente</h3>
                <form class="form two-cols" (ngSubmit)="updateAsesoria()">
                  <div><label>Estado</label><select [(ngModel)]="asesoriaStatusForm.estado" name="asesoriaEstado"><option>SOLICITADA</option><option>PROGRAMADA</option><option>REALIZADA</option><option>CANCELADA</option></select></div>
                  <div><label>Asistencia</label><select [(ngModel)]="asesoriaStatusForm.asistencia" name="asesoriaAsistencia"><option [ngValue]="0">Pendiente</option><option [ngValue]="1">Registrada</option></select></div>
                  <div class="span-2"><label>Observación final</label><textarea [(ngModel)]="asesoriaStatusForm.observacion_final" name="asesoriaObs" placeholder="Recomendaciones y acuerdos después de la asesoría"></textarea></div>
                  <div class="span-2"><button class="btn btn-primary">Guardar seguimiento</button></div>
                </form>
              </section>
            }

            @if (selectedAsesoria()?.asesoria?.observacion_final) {
              <section class="panel-lite"><h3>Observación final</h3><p>{{ selectedAsesoria()?.asesoria?.observacion_final }}</p></section>
            }
          </section>
        }
      </section>
    </ng-template>

    <ng-template #reportesTpl>
      <section class="grid two">
        <article class="panel">
          <h2>Reporte académico</h2>
          <p class="muted">Indicadores resumidos para coordinación y administración.</p>
          <div class="timeline">
            <div><b>Alumnos con asesoría</b><span>{{ asesoriasCount() }} casos activos o programados.</span></div>
            <div><b>Secciones activas</b><span>{{ data()?.secciones?.length || 0 }} secciones registradas.</span></div>
            <div><b>Tareas pendientes</b><span>{{ pendingTasks().length }} actividades pendientes.</span></div>
          </div>
        </article>
        <article class="panel">
          <h2>Observabilidad</h2>
          <p class="muted">En una versión final se conectarían logs, métricas, health checks y trazabilidad de eventos.</p>
        </article>
      </section>
    </ng-template>

    <ng-template #configTpl>
      <section class="panel">
        <h2>Configuración del sistema</h2>
        <p class="muted">Panel reservado para parámetros globales, reglas de seguridad, roles, permisos y ajustes institucionales.</p>
        <div class="cards-grid compact">
          <article class="panel-lite"><h3>Roles</h3><p>ALUMNO, DOCENTE, COORDINADOR, ADMINISTRADOR.</p></article>
          <article class="panel-lite"><h3>Seguridad</h3><p>Autenticación JWT, perfiles aprobados y control por rol.</p></article>
          <article class="panel-lite"><h3>Persistencia</h3><p>SQLite en entorno local; PostgreSQL/NeonDB para despliegue final.</p></article>
        </div>
      </section>
    </ng-template>

    <ng-template #perfilTpl>
      <section class="panel profile-panel">
        <h2>Mi perfil</h2>
        <form class="form two-cols" (ngSubmit)="saveProfile()">
          <div><label>Nombres</label><input [(ngModel)]="profileForm.nombres" name="nombres" required /></div>
          <div><label>Apellidos</label><input [(ngModel)]="profileForm.apellidos" name="apellidos" required /></div>
          <div><label>DNI</label><input [(ngModel)]="profileForm.dni" name="dni" /></div>
          <div><label>Teléfono</label><input [(ngModel)]="profileForm.telefono" name="telefono" /></div>
          <div class="span-2"><label>Dirección</label><input [(ngModel)]="profileForm.direccion" name="direccion" /></div>
          <div class="span-2"><button class="btn btn-primary">Guardar cambios</button></div>
        </form>
        @if (profileMessage()) { <div class="alert success">{{ profileMessage() }}</div> }
      </section>
    </ng-template>
  `
})
export class WorkspaceComponent implements OnInit {
  user = this.auth.user;
  data = signal<BootstrapData | null>(null);
  loading = signal(true);
  error = signal('');
  activeTab = signal<TabKey>('dashboard');
  selectedCourse = signal<Seccion | null>(null);
  selectedAdminCourse = signal<Curso | null>(null);
  activeWeek = signal<WeekKey>('semana1');
  courseTab = signal<CourseTab>('contenido');
  canales = signal<Canal[]>([]);
  mensajes = signal<Mensaje[]>([]);
  selectedChannel = signal<Canal | null>(null);
  selectedAsesoria = signal<AsesoriaDetail | null>(null);
  asesoriaDetailLoading = signal(false);
  showCreateAsesoria = signal(false);
  perfiles = signal<PerfilAdmin[]>([]);
  userSearch = signal('');
  selectedUserDetail = signal<UserDetail | null>(null);
  userDetailLoading = signal(false);
  docentes = signal<Array<{ id: number; email: string; nombre: string }>>([]);
  alumnos = signal<AlumnoOption[]>([]);
  selectedStudentBySection: Record<number, number> = {};
  showCreateUser = signal(false);
  editingUserId = signal<number | null>(null);
  showCreateCourse = signal(false);
  showCreateSection = signal(false);
  sectionMessage = signal('');
  profileMessage = signal('');
  userMessage = signal('');
  courseMessage = signal('');
  enrollmentMessage = signal('');
  materialMessage = signal('');
  taskMessage = signal('');
  asesoriaMessage = signal('');
  messageText = '';
  asesoriaMessageText = '';
  materialFile: File | null = null;
  taskFile: File | null = null;
  taskSubmissionFiles: Record<number, File | null> = {};
  taskSubmissionComments: Record<number, string> = {};
  gradeForms: Record<number, { nota: number | null; retroalimentacion: string }> = {};
  asesoriaMaterialFile: File | null = null;
  private syncingFromBrowser = false;

  weeks: Array<{ key: WeekKey; label: string; subtitle: string; title: string; goal: string }> = Array.from({ length: 16 }, (_, index) => {
    const n = index + 1;
    const subtitles = [
      'Introducción y diagnóstico',
      'Teoría y práctica guiada',
      'Material didáctico',
      'Práctica dirigida',
      'Resolución de ejercicios',
      'Foro y dudas académicas',
      'Tarea aplicada',
      'Retroalimentación',
      'Refuerzo temático',
      'Simulacro parcial',
      'Análisis de resultados',
      'Asesorías focalizadas',
      'Práctica intensiva',
      'Simulacro final',
      'Revisión general',
      'Cierre del ciclo'
    ];
    return {
      key: `semana${n}` as WeekKey,
      label: `Semana ${n}`,
      subtitle: subtitles[index],
      title: n === 16 ? 'Cierre y consolidación' : `Semana académica ${n}`,
      goal: 'El docente organiza el contenido, materiales, tareas, notas y participación del foro para esta semana del ciclo.'
    };
  });

  newSection: NewSectionPayload = { curso_id: 0, docente_id: 0, codigo: '', capacidad: 40, aula: '', modalidad: 'MIXTA', horario: '' };
  newSectionSchedule = { dia: 'Lunes', hora_inicio: '18:00', hora_fin: '20:00' };
  newCourse: NewCoursePayload = { nombre: '', descripcion: '', ciclo: 'Pre San Marcos', estado: 'ACTIVO' };
  profileForm: UpdateProfilePayload = { nombres: '', apellidos: '', dni: '', telefono: '', direccion: '' };
  materialForm = { titulo: '', tipo: 'PDF', descripcion: '' };
  taskForm = { titulo: '', instruccion: '', fecha_entrega: '2026-07-23', tipo: 'TAREA' };
  asesoriaMaterialForm = { titulo: '', tipo: 'PDF', descripcion: '' };
  asesoriaSchedule = { fecha: '2026-07-22', hora: '19:00' };
  asesoriaStatusForm: UpdateAsesoriaPayload = { estado: 'PROGRAMADA', observacion_final: '', asistencia: 0 };
  newAsesoria: NewAsesoriaPayload = { alumno_id: 0, docente_id: 0, curso_id: 0, tema: '', motivo: '', areas_refuerzo: '', fecha_programada: '', modalidad: 'VIRTUAL', enlace: '' };
  newUser: CreateUserPayload = {
    nombres: '', apellido_paterno: '', apellido_materno: '', dni: '', edad: null, telefono: '', direccion: '', email: '', password: '123456', rol: 'ALUMNO', estado: 'APROBADO'
  };

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.hydrateProfileForm();
    window.addEventListener('popstate', () => this.syncFromUrl());
    this.reload();
  }

  initials() {
    const u = this.user();
    return u ? `${u.nombres?.[0] || ''}${u.apellidos?.[0] || ''}`.toUpperCase() : 'E';
  }

  roleLabel(role?: UserRole) {
    const labels: Record<UserRole, string> = {
      ALUMNO: 'Alumno', DOCENTE: 'Docente', COORDINADOR: 'Coordinador', ADMINISTRADOR: 'Administrador'
    };
    return role ? labels[role] : '';
  }

  menu = computed(() => {
    const role = this.user()?.rol;
    if (role === 'ALUMNO') {
      return [
        { key: 'dashboard' as TabKey, label: 'Dashboard', icon: '⌂' },
        { key: 'calendario' as TabKey, label: 'Calendario', icon: '◷' },
        { key: 'cursos' as TabKey, label: 'Cursos', icon: '▦' },
        { key: 'perfil' as TabKey, label: 'Mi perfil', icon: '◎' }
      ];
    }
    if (role === 'DOCENTE') {
      return [
        { key: 'dashboard' as TabKey, label: 'Dashboard', icon: '⌂' },
        { key: 'calendario' as TabKey, label: 'Calendario', icon: '◷' },
        { key: 'cursos' as TabKey, label: 'Cursos', icon: '▦' },
        { key: 'asesorias' as TabKey, label: 'Asesorías', icon: '◆' },
        { key: 'perfil' as TabKey, label: 'Mi perfil', icon: '◎' }
      ];
    }
    if (role === 'COORDINADOR') {
      return [
        { key: 'dashboard' as TabKey, label: 'Dashboard', icon: '⌂' },
        { key: 'calendario' as TabKey, label: 'Calendario', icon: '◷' },
        { key: 'cursos' as TabKey, label: 'Cursos y secciones', icon: '▦' },
        { key: 'matriculas' as TabKey, label: 'Matrículas', icon: '▣' },
        { key: 'secciones' as TabKey, label: 'Asignaciones', icon: '▤' },
        { key: 'asesorias' as TabKey, label: 'Asesorías', icon: '◆' },
        { key: 'reportes' as TabKey, label: 'Reportes', icon: '↗' },
        { key: 'perfil' as TabKey, label: 'Mi perfil', icon: '◎' }
      ];
    }
    return [
      { key: 'dashboard' as TabKey, label: 'Dashboard', icon: '⌂' },
      { key: 'calendario' as TabKey, label: 'Calendario', icon: '◷' },
      { key: 'usuarios' as TabKey, label: 'Usuarios', icon: '☰' },
      { key: 'cursos' as TabKey, label: 'Cursos', icon: '▦' },
      { key: 'asesorias' as TabKey, label: 'Asesorías', icon: '◆' },
      { key: 'perfil' as TabKey, label: 'Mi perfil', icon: '◎' }
    ];
  });

  title = computed(() => this.selectedAdminCourse() ? this.selectedAdminCourse()?.nombre || 'Curso' : this.selectedCourse() ? this.selectedCourse()?.curso || 'Curso' : this.menu().find((i) => i.key === this.activeTab())?.label || 'Educatoon');

  go(key: TabKey) {
    this.selectedCourse.set(null);
    this.selectedAdminCourse.set(null);
    this.selectedAsesoria.set(null);
    this.activeTab.set(key);
    this.pushWorkspaceUrl({ tab: key });
    const role = this.user()?.rol;
    if ((role === 'ADMINISTRADOR' || role === 'COORDINADOR') && (key === 'usuarios' || key === 'perfiles' || key === 'matriculas' || key === 'secciones' || key === 'cursos' || key === 'asesorias')) this.loadAdminData();
  }

  pushWorkspaceUrl(params: Record<string, string | number | null | undefined>) {
    if (this.syncingFromBrowser) return;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') query.set(key, String(value));
    });
    const url = query.toString() ? `/app?${query.toString()}` : '/app';
    window.history.pushState({ educatoon: true, ...params }, '', url);
  }

  syncFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const tab = (params.get('tab') || 'dashboard') as TabKey;
    const cursoId = Number(params.get('curso') || 0);
    const seccionId = Number(params.get('seccion') || 0);
    this.syncingFromBrowser = true;
    this.activeTab.set(tab);
    this.selectedAdminCourse.set(null);
    this.selectedCourse.set(null);
    this.selectedAsesoria.set(null);
    if (cursoId) {
      const curso = (this.data()?.cursos || []).find((c) => c.id === cursoId);
      if (curso) {
        this.selectedAdminCourse.set(curso);
        this.enrollmentMessage.set('');
      }
    }
    if (seccionId) {
      const section = (this.data()?.secciones || []).find((s) => s.id === seccionId);
      if (section) {
        this.selectedCourse.set(section);
        this.courseTab.set('contenido');
        this.activeWeek.set('semana1');
        this.selectSection(section);
      }
    }
    this.syncingFromBrowser = false;
  }

  reload() {
    this.loading.set(true);
    this.error.set('');
    this.api.bootstrap().subscribe({
      next: (res) => {
        this.data.set(res);
        this.prepareGradeForms(res.entregas || []);
        this.syncFromUrl();
        this.loading.set(false);
        if (this.user()?.rol === 'COORDINADOR' || this.user()?.rol === 'ADMINISTRADOR') this.loadAdminData();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'No se pudo cargar la información. Verifica que el backend esté corriendo.');
      }
    });
  }

  loadAdminData() {
    this.api.perfiles().subscribe((p) => this.perfiles.set(p));
    this.api.docentes().subscribe((d) => this.docentes.set(d));
    this.api.alumnos().subscribe((a) => this.alumnos.set(a));
  }

  dashboardStats() {
    const role = this.user()?.rol;
    const cursos = this.data()?.secciones?.length || 0;
    const pendientes = this.pendingTasks().length;
    const asesorias = this.data()?.asesorias?.length || 0;
    const promedio = this.averageScore();
    if (role === 'ALUMNO') {
      return [
        { label: 'Cursos matriculados', value: cursos },
        { label: 'Tareas pendientes', value: pendientes },
        { label: 'Asesorías', value: asesorias },
        { label: 'Promedio general', value: promedio || '—' }
      ];
    }
    if (role === 'DOCENTE') {
      return [
        { label: 'Cursos asignados', value: cursos },
        { label: 'Tareas por calificar', value: pendientes },
        { label: 'Asesorías asignadas', value: asesorias },
        { label: 'Archivos cargados', value: this.data()?.materiales?.length || 0 }
      ];
    }
    if (role === 'COORDINADOR') {
      return [
        { label: 'Secciones activas', value: cursos },
        { label: 'Tareas programadas', value: pendientes },
        { label: 'Asesorías', value: asesorias },
        { label: 'Perfiles pendientes', value: this.pendingProfiles().length }
      ];
    }
    return [
      { label: 'Usuarios', value: this.perfiles().length },
      { label: 'Cursos', value: this.data()?.cursos?.length || 0 },
      { label: 'Secciones', value: cursos },
      { label: 'Pendientes', value: this.pendingProfiles().length }
    ];
  }

  averageScore() {
    const progreso = this.data()?.progreso || [];
    if (!progreso.length) return 0;
    const avg = progreso.reduce((sum, p) => sum + Number(p.promedio || 0), 0) / progreso.length;
    return Math.round(avg * 10) / 10;
  }

  pendingTasks() {
    const role = this.user()?.rol;
    const tareas = this.data()?.tareas || [];
    if (role === 'ALUMNO') return tareas.filter((t) => !this.deliveryForTask(t.id) || this.deliveryForTask(t.id)?.estado !== 'CALIFICADA');
    if (role === 'DOCENTE') return tareas.filter((t) => this.submissionsForTask(t.id).some((e) => e.estado !== 'CALIFICADA'));
    return tareas.filter((t) => t.estado !== 'CERRADA');
  }

  calendarItems() {
    const reuniones = (this.data()?.reuniones || []).map((r) => ({ title: r.titulo, course: `${r.curso} · ${r.seccion_codigo}`, date: r.fecha, type: r.tipo }));
    const tareas = (this.data()?.tareas || []).map((t) => ({ title: t.titulo, course: `${t.curso} · ${t.seccion_codigo}`, date: t.fecha_entrega, type: t.tipo }));
    const evaluaciones = (this.data()?.evaluaciones || []).map((e) => ({ title: e.titulo, course: `${e.curso} · ${e.seccion_codigo}`, date: e.fecha, type: e.tipo }));
    const asesorias = (this.data()?.asesorias || []).map((a) => ({ title: a.tema, course: a.curso, date: a.fecha_programada, type: 'ASESORIA' }));
    return [...reuniones, ...tareas, ...evaluaciones, ...asesorias].sort((a, b) => a.date.localeCompare(b.date));
  }

  calendarWeekDays() {
    const items = this.calendarItems();
    const firstDate = items.length ? this.toDate(items[0].date) : new Date();
    const monday = new Date(firstDate);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return labels.map((label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const iso = this.dateKey(date);
      const events = items
        .filter((item) => this.dateKey(this.toDate(item.date)) === iso)
        .map((item) => ({ ...item, hour: this.hourLabel(item.date) }));
      return { label, iso, number: date.getDate(), events };
    });
  }

  toDate(value: string) {
    const safe = value.includes('T') ? value : value.replace(' ', 'T');
    return new Date(safe);
  }

  dateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  hourLabel(value: string) {
    const parts = value.split(' ');
    return parts[1] ? parts[1].slice(0, 5) : 'Todo el día';
  }

  openCourse(section: Seccion) {
    this.selectedAdminCourse.set(null);
    this.selectedCourse.set(section);
    this.courseTab.set('contenido');
    this.activeWeek.set('semana1');
    this.pushWorkspaceUrl({ tab: 'cursos', seccion: section.id });
    this.selectSection(section);
  }

  closeCourse() {
    this.selectedCourse.set(null);
    this.pushWorkspaceUrl({ tab: 'cursos' });
  }

  openAdminCourse(curso: Curso) {
    this.selectedCourse.set(null);
    this.selectedAdminCourse.set(curso);
    this.enrollmentMessage.set('');
    this.pushWorkspaceUrl({ tab: 'cursos', curso: curso.id });
  }

  closeAdminCourse() {
    this.selectedAdminCourse.set(null);
    this.pushWorkspaceUrl({ tab: 'cursos' });
  }

  selectWeek(week: WeekKey) {
    this.activeWeek.set(week);
    this.courseTab.set('contenido');
  }

  sectionsByCourse(courseId: number) {
    return (this.data()?.secciones || []).filter((s) => s.curso_id === courseId);
  }

  adminCourseSections() {
    const course = this.selectedAdminCourse();
    return course ? this.sectionsByCourse(course.id) : [];
  }

  selectSection(section: Seccion) {
    this.api.canales(section.id).subscribe({
      next: (canales) => {
        this.canales.set(canales);
        if (canales.length) {
          this.selectedChannel.set(canales[0]);
          this.api.mensajes(canales[0].id).subscribe((mensajes) => this.mensajes.set(mensajes));
        }
      }
    });
  }

  foroTopics() { return this.canales(); }

  selectChannel(canal: Canal) {
    this.selectedChannel.set(canal);
    this.courseTab.set('foro');
    this.api.mensajes(canal.id).subscribe((mensajes) => this.mensajes.set(mensajes));
  }

  sendMessage() {
    const channel = this.selectedChannel();
    const text = this.messageText.trim();
    if (!channel || !text) return;
    this.api.enviarMensaje(channel.id, text).subscribe((mensaje) => {
      this.mensajes.set([...this.mensajes(), mensaje]);
      this.messageText = '';
    });
  }

  currentWeek() { return this.weeks.find((w) => w.key === this.activeWeek()) || this.weeks[0]; }

  courseMaterials() {
    const course = this.selectedCourse();
    return (this.data()?.materiales || []).filter((m) => (!course || m.seccion_id === course.id) && ((m.semana || 'semana1') === this.activeWeek()));
  }

  courseEvaluations() {
    const course = this.selectedCourse();
    return (this.data()?.evaluaciones || []).filter((e) => !course || e.seccion_id === course.id);
  }

  courseProgress() {
    const course = this.selectedCourse();
    return (this.data()?.progreso || []).filter((p) => !course || p.seccion_id === course.id);
  }


  currentWeekTasks() {
    const course = this.selectedCourse();
    return (this.data()?.tareas || []).filter((t) => (!course || t.seccion_id === course.id) && t.semana === this.activeWeek());
  }

  courseDeliveries() {
    const course = this.selectedCourse();
    return (this.data()?.entregas || []).filter((e) => !course || e.seccion_id === course.id);
  }

  deliveryForTask(taskId: number) {
    return (this.data()?.entregas || []).find((e) => e.tarea_id === taskId && e.alumno_id === this.user()?.id) || null;
  }

  submissionsForTask(taskId: number) {
    return (this.data()?.entregas || []).filter((e) => e.tarea_id === taskId);
  }

  canCreateTask() { return this.user()?.rol === 'DOCENTE' || this.user()?.rol === 'ADMINISTRADOR'; }
  canGradeTasks() { return this.user()?.rol === 'DOCENTE' || this.user()?.rol === 'ADMINISTRADOR'; }

  prepareGradeForms(entregas: EntregaTarea[]) {
    for (const e of entregas) {
      if (!this.gradeForms[e.id]) {
        this.gradeForms[e.id] = { nota: e.nota ?? null, retroalimentacion: e.retroalimentacion || '' };
      } else {
        this.gradeForms[e.id].nota = e.nota ?? this.gradeForms[e.id].nota;
        this.gradeForms[e.id].retroalimentacion = e.retroalimentacion || this.gradeForms[e.id].retroalimentacion || '';
      }
    }
  }

  pendingProfiles() { return this.perfiles().filter((p) => p.usuario_estado === 'PENDIENTE'); }

  filteredPerfiles() {
    const q = this.userSearch().trim().toLowerCase();
    const list = this.perfiles();
    if (!q) return list;
    return list.filter((p) => [
      p.nombres, p.apellidos, p.apellido_paterno, p.apellido_materno,
      p.dni, p.email, p.rol, p.usuario_estado
    ].join(' ').toLowerCase().includes(q));
  }

  openUserDetail(p: PerfilAdmin) {
    this.userDetailLoading.set(true);
    this.api.detalleUsuario(p.usuario_id).subscribe({
      next: (detail) => {
        this.selectedUserDetail.set(detail);
        this.userDetailLoading.set(false);
      },
      error: () => {
        this.userDetailLoading.set(false);
        this.selectedUserDetail.set({ usuario: p, cursos: [] });
      }
    });
  }

  closeUserDetail() { this.selectedUserDetail.set(null); }

  buildHorario() {
    const inicio = this.newSectionSchedule.hora_inicio || '00:00';
    const fin = this.newSectionSchedule.hora_fin || '00:00';
    return `${this.newSectionSchedule.dia} ${inicio} - ${fin}`;
  }

  horarioValido() {
    return Boolean(this.newSectionSchedule.dia && this.newSectionSchedule.hora_inicio && this.newSectionSchedule.hora_fin && this.newSectionSchedule.hora_inicio < this.newSectionSchedule.hora_fin);
  }

  resetSectionSchedule() {
    this.newSectionSchedule = { dia: 'Lunes', hora_inicio: '18:00', hora_fin: '20:00' };
  }

  asesoriasCount() { return this.data()?.asesorias?.length || 0; }

  dashboardTitle() {
    const role = this.user()?.rol;
    if (role === 'ALUMNO') return 'Panel del alumno';
    if (role === 'DOCENTE') return 'Panel del docente';
    if (role === 'COORDINADOR') return 'Panel de coordinación académica';
    return 'Panel de administración general';
  }

  dashboardDescription() {
    const role = this.user()?.rol;
    if (role === 'ALUMNO') return 'Consulta tus cursos matriculados, calendario semanal, tareas pendientes, notas y perfil.';
    if (role === 'DOCENTE') return 'Gestiona tus cursos, carga materiales por semana, revisa tareas, notas y asesorías asignadas.';
    if (role === 'COORDINADOR') return 'Gestiona matrículas, secciones, asignaciones, asistencia, notas, asesorías y reportes.';
    return 'Acceso total a usuarios, cursos, secciones, asesorías y administración académica.';
  }

  coursesIntroTitle() {
    const role = this.user()?.rol;
    if (role === 'ALUMNO') return 'Mis cursos matriculados';
    if (role === 'DOCENTE') return 'Cursos donde dicto clase';
    if (role === 'COORDINADOR') return 'Cursos y secciones bajo coordinación';
    return 'Catálogo completo de cursos y secciones';
  }

  canUploadMaterial() { return this.user()?.rol === 'DOCENTE' || this.user()?.rol === 'ADMINISTRADOR'; }

  onMaterialFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.materialFile = input.files?.[0] || null;
  }

  uploadMaterial() {
    const course = this.selectedCourse();
    if (!course || !this.materialForm.titulo.trim()) return;
    const formData = new FormData();
    formData.append('seccion_id', String(course.id));
    formData.append('semana', this.activeWeek());
    formData.append('titulo', this.materialForm.titulo.trim());
    formData.append('tipo', this.materialForm.tipo);
    formData.append('descripcion', this.materialForm.descripcion || 'Material didáctico del curso.');
    if (this.materialFile) formData.append('archivo', this.materialFile);
    this.api.subirMaterial(formData).subscribe({
      next: () => {
        this.materialMessage.set('Material cargado correctamente.');
        this.materialForm = { titulo: '', tipo: 'PDF', descripcion: '' };
        this.materialFile = null;
        this.reload();
      },
      error: (err) => this.materialMessage.set(err?.error?.message || 'No se pudo cargar el material.')
    });
  }

  onTaskFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.taskFile = input.files?.[0] || null;
  }

  createTask() {
    const course = this.selectedCourse();
    if (!course || !this.taskForm.titulo.trim() || !this.taskForm.instruccion.trim()) return;
    this.taskMessage.set('');
    const formData = new FormData();
    formData.append('seccion_id', String(course.id));
    formData.append('semana', this.activeWeek());
    formData.append('titulo', this.taskForm.titulo.trim());
    formData.append('instruccion', this.taskForm.instruccion.trim());
    formData.append('fecha_entrega', this.taskForm.fecha_entrega);
    formData.append('tipo', this.taskForm.tipo);
    if (this.taskFile) formData.append('archivo', this.taskFile);
    this.api.crearTarea(formData).subscribe({
      next: () => {
        this.taskMessage.set('Tarea publicada correctamente.');
        this.taskForm = { titulo: '', instruccion: '', fecha_entrega: '2026-07-23', tipo: 'TAREA' };
        this.taskFile = null;
        this.reload();
      },
      error: (err) => this.taskMessage.set(err?.error?.message || 'No se pudo crear la tarea.')
    });
  }

  onTaskSubmissionFile(event: Event, taskId: number) {
    const input = event.target as HTMLInputElement;
    this.taskSubmissionFiles[taskId] = input.files?.[0] || null;
  }

  submitTask(task: Tarea) {
    const formData = new FormData();
    formData.append('comentario', this.taskSubmissionComments[task.id] || '');
    const file = this.taskSubmissionFiles[task.id];
    if (file) formData.append('archivo', file);
    this.api.entregarTarea(task.id, formData).subscribe({
      next: () => {
        this.taskMessage.set('Entrega registrada correctamente.');
        this.taskSubmissionComments[task.id] = '';
        this.taskSubmissionFiles[task.id] = null;
        this.reload();
      },
      error: (err) => this.taskMessage.set(err?.error?.message || 'No se pudo subir la entrega.')
    });
  }

  gradeSubmission(entrega: EntregaTarea) {
    const form = this.gradeForms[entrega.id] || { nota: entrega.nota, retroalimentacion: entrega.retroalimentacion || '' };
    this.api.calificarEntrega(entrega.id, form).subscribe({
      next: () => {
        this.taskMessage.set('Nota guardada correctamente.');
        this.reload();
      },
      error: (err) => this.taskMessage.set(err?.error?.message || 'No se pudo guardar la nota.')
    });
  }


  canCreateAsesoria() { return this.user()?.rol === 'COORDINADOR' || this.user()?.rol === 'ADMINISTRADOR'; }
  canManageAsesoria() { return ['DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'].includes(this.user()?.rol || ''); }

  toggleCreateAsesoria() {
    this.showCreateAsesoria.set(!this.showCreateAsesoria());
    this.asesoriaMessage.set('');
    if (this.showCreateAsesoria()) this.loadAdminData();
  }

  buildAsesoriaDateTime() {
    return `${this.asesoriaSchedule.fecha} ${this.asesoriaSchedule.hora}`;
  }

  createAsesoria() {
    this.asesoriaMessage.set('');
    const payload: NewAsesoriaPayload = { ...this.newAsesoria, fecha_programada: this.buildAsesoriaDateTime() };
    if (!payload.alumno_id || !payload.docente_id || !payload.curso_id || !payload.tema.trim() || !payload.motivo.trim() || !payload.areas_refuerzo.trim()) {
      this.asesoriaMessage.set('Completa alumno, docente, curso, tema, motivo y áreas de refuerzo.');
      return;
    }
    this.api.crearAsesoria(payload).subscribe({
      next: () => {
        this.asesoriaMessage.set('Asesoría creada correctamente.');
        this.showCreateAsesoria.set(false);
        this.newAsesoria = { alumno_id: 0, docente_id: 0, curso_id: 0, tema: '', motivo: '', areas_refuerzo: '', fecha_programada: '', modalidad: 'VIRTUAL', enlace: '' };
        this.asesoriaSchedule = { fecha: '2026-07-22', hora: '19:00' };
        this.reload();
      },
      error: (err) => this.asesoriaMessage.set(err?.error?.message || 'No se pudo crear la asesoría.')
    });
  }

  openAsesoria(a: Asesoria) {
    this.asesoriaDetailLoading.set(true);
    this.selectedAsesoria.set(null);
    this.api.detalleAsesoria(a.id).subscribe({
      next: (detail) => {
        this.selectedAsesoria.set(detail);
        this.asesoriaStatusForm = {
          estado: detail.asesoria.estado || 'PROGRAMADA',
          observacion_final: detail.asesoria.observacion_final || '',
          asistencia: Number(detail.asesoria.asistencia || 0)
        };
        this.asesoriaDetailLoading.set(false);
      },
      error: (err) => {
        this.asesoriaMessage.set(err?.error?.message || 'No se pudo cargar el detalle de la asesoría.');
        this.asesoriaDetailLoading.set(false);
      }
    });
  }

  closeAsesoria() {
    this.selectedAsesoria.set(null);
    this.asesoriaMessageText = '';
  }

  refreshSelectedAsesoria() {
    const current = this.selectedAsesoria()?.asesoria;
    if (current) this.openAsesoria(current);
  }

  updateAsesoria() {
    const current = this.selectedAsesoria()?.asesoria;
    if (!current) return;
    this.api.actualizarAsesoria(current.id, this.asesoriaStatusForm).subscribe({
      next: () => {
        this.asesoriaMessage.set('Seguimiento actualizado correctamente.');
        this.refreshSelectedAsesoria();
        this.reload();
      },
      error: (err) => this.asesoriaMessage.set(err?.error?.message || 'No se pudo actualizar la asesoría.')
    });
  }

  sendAsesoriaMessage() {
    const current = this.selectedAsesoria()?.asesoria;
    const text = this.asesoriaMessageText.trim();
    if (!current || !text) return;
    this.api.enviarMensajeAsesoria(current.id, text).subscribe({
      next: () => {
        this.asesoriaMessageText = '';
        this.refreshSelectedAsesoria();
      },
      error: (err) => this.asesoriaMessage.set(err?.error?.message || 'No se pudo enviar el mensaje.')
    });
  }

  onAsesoriaMaterialFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.asesoriaMaterialFile = input.files?.[0] || null;
  }

  uploadAsesoriaMaterial() {
    const current = this.selectedAsesoria()?.asesoria;
    if (!current || !this.asesoriaMaterialForm.titulo.trim()) return;
    const formData = new FormData();
    formData.append('titulo', this.asesoriaMaterialForm.titulo.trim());
    formData.append('tipo', this.asesoriaMaterialForm.tipo);
    formData.append('descripcion', this.asesoriaMaterialForm.descripcion || 'Material de refuerzo para la asesoría.');
    if (this.asesoriaMaterialFile) formData.append('archivo', this.asesoriaMaterialFile);
    this.api.subirMaterialAsesoria(current.id, formData).subscribe({
      next: () => {
        this.asesoriaMessage.set('Material de refuerzo cargado correctamente.');
        this.asesoriaMaterialForm = { titulo: '', tipo: 'PDF', descripcion: '' };
        this.asesoriaMaterialFile = null;
        this.refreshSelectedAsesoria();
      },
      error: (err) => this.asesoriaMessage.set(err?.error?.message || 'No se pudo subir el material de asesoría.')
    });
  }

  approve(p: PerfilAdmin) { this.api.aprobarPerfil(p.usuario_id).subscribe(() => this.loadAdminData()); }


  splitApellido(apellidos: string, index: number) {
    const parts = (apellidos || '').trim().split(/\s+/);
    return index === 0 ? parts[0] || '—' : parts.slice(1).join(' ') || '—';
  }

  createCourse() {
    this.courseMessage.set('');
    this.api.crearCurso(this.newCourse).subscribe({
      next: () => {
        this.courseMessage.set('Curso creado correctamente.');
        this.showCreateCourse.set(false);
        this.newCourse = { nombre: '', descripcion: '', ciclo: 'Pre San Marcos', estado: 'ACTIVO' };
        this.reload();
      },
      error: (err) => this.courseMessage.set(err?.error?.message || 'No se pudo crear el curso.')
    });
  }

  enrollStudent(section: Seccion) {
    const alumnoId = Number(this.selectedStudentBySection[section.id] || 0);
    if (!alumnoId) {
      this.enrollmentMessage.set('Selecciona un alumno aprobado antes de añadirlo.');
      return;
    }
    this.api.matricularAlumno(section.id, { alumno_id: alumnoId }).subscribe({
      next: () => {
        this.enrollmentMessage.set(`Alumno añadido correctamente a ${section.codigo}.`);
        this.selectedStudentBySection[section.id] = 0;
        this.reload();
      },
      error: (err) => this.enrollmentMessage.set(err?.error?.message || 'No se pudo añadir el alumno al curso.')
    });
  }

  toggleCreateCourse() { this.showCreateCourse.set(!this.showCreateCourse()); }
  toggleCreateSection() { this.showCreateSection.set(!this.showCreateSection()); }

  studentsByCourse(courseId: number) {
    return this.sectionsByCourse(courseId).reduce((total, s) => total + Number(s.matriculados || 0), 0);
  }

  openAdminSection(section: Seccion) {
    this.openCourse(section);
  }

  emptyUserForm(): CreateUserPayload {
    return { nombres: '', apellido_paterno: '', apellido_materno: '', dni: '', edad: null, telefono: '', direccion: '', email: '', password: '123456', rol: 'ALUMNO', estado: 'APROBADO' };
  }

  startCreateUser() {
    this.editingUserId.set(null);
    this.newUser = this.emptyUserForm();
    this.userMessage.set('');
    this.showCreateUser.set(true);
  }

  startEditUser(p: PerfilAdmin) {
    this.editingUserId.set(p.usuario_id);
    this.newUser = {
      nombres: p.nombres || '',
      apellido_paterno: p.apellido_paterno || this.splitApellido(p.apellidos, 0),
      apellido_materno: p.apellido_materno || this.splitApellido(p.apellidos, 1),
      dni: p.dni || '',
      edad: p.edad || null,
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      email: p.email || '',
      password: '',
      rol: p.rol,
      estado: p.usuario_estado === 'PENDIENTE' ? 'PENDIENTE' : 'APROBADO'
    };
    this.userMessage.set('');
    this.showCreateUser.set(true);
  }

  cancelUserForm() {
    this.showCreateUser.set(false);
    this.editingUserId.set(null);
    this.newUser = this.emptyUserForm();
    this.userMessage.set('');
  }

  saveUser() {
    if (this.editingUserId()) this.updateUser();
    else this.createUser();
  }

  createUser() {
    this.userMessage.set('');
    this.api.crearUsuario(this.newUser).subscribe({
      next: () => {
        this.userMessage.set('Usuario creado correctamente.');
        this.cancelUserForm();
        this.loadAdminData();
        this.reload();
      },
      error: (err) => this.userMessage.set(err?.error?.message || 'No se pudo crear el usuario.')
    });
  }

  updateUser() {
    const id = this.editingUserId();
    if (!id) return;
    this.userMessage.set('');
    this.api.actualizarUsuario(id, this.newUser).subscribe({
      next: () => {
        this.userMessage.set('Usuario actualizado correctamente.');
        this.cancelUserForm();
        this.loadAdminData();
        this.reload();
      },
      error: (err) => this.userMessage.set(err?.error?.message || 'No se pudo actualizar el usuario.')
    });
  }

  deleteUser(p: PerfilAdmin) {
    if (!confirm(`¿Eliminar al usuario ${p.email}? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarUsuario(p.usuario_id).subscribe({
      next: () => {
        this.userMessage.set('Usuario eliminado correctamente.');
        this.loadAdminData();
        this.reload();
      },
      error: (err) => this.userMessage.set(err?.error?.message || 'No se pudo eliminar el usuario.')
    });
  }

  createSectionForSelectedCourse() {
    const course = this.selectedAdminCourse();
    if (!course) return;
    this.newSection.curso_id = course.id;
    this.createSection();
  }

  createSection() {
    this.sectionMessage.set('');
    if (!this.horarioValido()) {
      this.sectionMessage.set('Selecciona un día y un rango de horas válido. La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    const payload: NewSectionPayload = { ...this.newSection, horario: this.buildHorario(), docente_id: this.newSection.docente_id || null };
    this.api.crearSeccion(payload).subscribe({
      next: () => {
        this.sectionMessage.set('Sección creada correctamente.');
        this.showCreateSection.set(false);
        this.newSection = { curso_id: 0, docente_id: 0, codigo: '', capacidad: 40, aula: '', modalidad: 'MIXTA', horario: '' };
        this.resetSectionSchedule();
        this.reload();
      },
      error: (err) => this.sectionMessage.set(err?.error?.message || 'No se pudo crear la sección.')
    });
  }

  hydrateProfileForm() {
    const u = this.user();
    this.profileForm = {
      nombres: u?.nombres || '', apellidos: u?.apellidos || '', dni: u?.dni || '', telefono: u?.telefono || '', direccion: u?.direccion || ''
    };
  }

  saveProfile() {
    this.profileMessage.set('');
    this.api.updateProfile(this.profileForm).subscribe((updated) => {
      localStorage.setItem('educatoon_user', JSON.stringify(updated));
      this.profileMessage.set('Perfil actualizado correctamente. Cierra sesión y vuelve a ingresar si deseas refrescar el encabezado.');
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
