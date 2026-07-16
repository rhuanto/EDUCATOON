import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="login-landing">
      <div class="login-overlay"></div>
      <section class="login-panel">
        <div class="login-brand">
          <span class="logo">E</span>
          <div>
            <strong>Educatoon</strong>
          </div>
        </div>

        <h1>Iniciar sesión</h1>

        <form (ngSubmit)="submit()" class="form">
          <label>Correo electrónico</label>
          <input [(ngModel)]="email" name="email" type="email" placeholder="correo@educatoon.pe" required />

          <label>Contraseña</label>
          <input [(ngModel)]="password" name="password" type="password" placeholder="Ingresa tu contraseña" required />

          <button class="btn btn-primary btn-full" [disabled]="loading">
            {{ loading ? 'Validando...' : 'Ingresar' }}
          </button>
        </form>

        @if (error) {
          <div class="alert error">{{ error }}</div>
        }

        <p class="small">¿Aún no tienes cuenta? <a routerLink="/registro">Regístrate como alumno</a>.</p>
      </section>
    </main>
  `
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.auth.logout();
  }

  submit() {
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/app'], { replaceUrl: true }),
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo iniciar sesión.';
        this.loading = false;
      }
    });
  }
}
