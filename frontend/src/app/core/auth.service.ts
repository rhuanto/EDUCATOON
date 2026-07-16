import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_BASE_URL } from './api.service';
import { RegisterPayload, User } from './models';

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<User | null>(null);
  readonly user = computed(() => this.userSignal());

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(apiUrl('/auth/login'), { email, password }).pipe(
      tap((res) => {
        sessionStorage.setItem('educatoon_token', res.token);
        sessionStorage.setItem('educatoon_user', JSON.stringify(res.user));
        this.userSignal.set(res.user);
      })
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post<{ message: string; id: number }>(apiUrl('/auth/register'), payload);
  }

  logout() {
    sessionStorage.removeItem('educatoon_token');
    sessionStorage.removeItem('educatoon_user');
    localStorage.removeItem('educatoon_token');
    localStorage.removeItem('educatoon_user');
    this.userSignal.set(null);
  }

  isLoggedIn(): boolean {
    return Boolean(sessionStorage.getItem('educatoon_token') && this.userSignal());
  }

  private readUser(): User | null {
    const raw = sessionStorage.getItem('educatoon_user');
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  }
}
