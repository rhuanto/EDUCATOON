import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="public-shell">
      <nav class="topbar glass">
        <div class="brand"><span class="logo">E</span><strong>Educatoon</strong></div>
        <div class="actions">
          <a routerLink="/login" class="btn btn-ghost">Iniciar sesión</a>
          <a routerLink="/registro" class="btn btn-primary">Registrarse</a>
        </div>
      </nav>

      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Plataforma académica distribuida</span>
          <h1>Educación gratuita y de calidad, organizada como espacios colaborativos.</h1>
          <p>
            Educatoon centraliza cursos, secciones, canales, materiales, evaluaciones,
            reuniones y asesorías para acompañar a estudiantes preuniversitarios de bajos recursos.
          </p>
          <div class="hero-actions">
            <a routerLink="/login" class="btn btn-primary btn-large">Ingresar</a>
            <a routerLink="/registro" class="btn btn-ghost btn-large">Crear cuenta</a>
          </div>
        </div>
        <div class="hero-card">
          <div class="mini-header">
            <span></span><span></span><span></span>
          </div>
          <div class="teams-layout">
            <aside>
              <div class="app-dot active">M</div>
              <div class="app-dot">C</div>
              <div class="app-dot">A</div>
            </aside>
            <section>
              <h3>Matemática · MAT-A1</h3>
              <p class="muted">Foro general</p>
              <div class="message"><b>Docente</b><br>Revisen la guía de álgebra.</div>
              <div class="message student"><b>Alumno</b><br>¿El simulacro será este sábado?</div>
              <div class="course-grid">
                <span>Materiales</span><span>Reuniones</span><span>Progreso</span>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  `
})
export class HomeComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/app'], { replaceUrl: true });
    }
  }
}
