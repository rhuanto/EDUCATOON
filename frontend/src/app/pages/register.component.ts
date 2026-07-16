import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface RegisterForm {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  direccion: string;
  email: string;
  password: string;
}

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="login-landing register-landing">
      <div class="login-overlay"></div>
      <section class="login-panel register-panel">
        <div class="login-brand">
          <span class="logo">E</span>
          <div>
            <strong>Educatoon</strong>
          </div>
        </div>

        <h1>Crear una cuenta</h1>

        <form (ngSubmit)="submit()" class="form two-cols">
          <div><label>Nombres</label><input [(ngModel)]="form.nombres" name="nombres" required /></div>
          <div><label>Apellidos</label><input [(ngModel)]="form.apellidos" name="apellidos" required /></div>
          <div><label>DNI</label><input [(ngModel)]="form.dni" name="dni" /></div>
          <div><label>Teléfono</label><input [(ngModel)]="form.telefono" name="telefono" /></div>
          <div class="span-2"><label>Dirección</label><input [(ngModel)]="form.direccion" name="direccion" /></div>
          <div><label>Correo</label><input [(ngModel)]="form.email" name="email" type="email" required /></div>
          <div><label>Contraseña</label><input [(ngModel)]="form.password" name="password" type="password" required /></div>
          <button class="btn btn-primary btn-full span-2" [disabled]="loading">Registrar solicitud</button>
        </form>

        @if (message) { <div class="alert success">{{ message }}</div> }
        @if (error) { <div class="alert error">{{ error }}</div> }

        <p class="small">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a>.</p>
      </section>
    </main>
  `
})
export class RegisterComponent implements OnInit {
  form: RegisterForm = {
    nombres: '', apellidos: '', dni: '', telefono: '', direccion: '', email: '', password: '123456'
  };
  loading = false;
  message = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.auth.logout();
  }

  submit() {
    this.loading = true;
    this.message = '';
    this.error = '';
    this.auth.register(this.form).subscribe({
      next: (res) => {
        this.message = res.message;
        this.loading = false;
        this.form = { nombres: '', apellidos: '', dni: '', telefono: '', direccion: '', email: '', password: '123456' };
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo crear el registro.';
        this.loading = false;
      }
    });
  }
}
