import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';

const API_ORIGIN = 'http://localhost:5000';
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_KEY = 'etrymart_admin_session';
const SELLER_KEY = 'etrymart_seller_auth';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  status?: string;
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  message: string;
  user: AdminUser;
  token: string;
  refreshToken: string;
}

export interface AdminProfileUpdate {
  name: string;
  phone?: string | null;
}

export interface AdminPasswordUpdate {
  currentPassword: string;
  newPassword: string;
}

interface AdminSession {
  user: AdminUser;
  token: string;
  refreshToken: string;
}

function readFlag(key: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(key) === '1';
}

function readAdminSession(): AdminSession | null {
  if (typeof sessionStorage === 'undefined') return null;

  const raw = sessionStorage.getItem(ADMIN_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Partial<AdminSession>;
    if (!session.token || !session.refreshToken || !session.user) return null;
    return session as AdminSession;
  } catch {
    sessionStorage.removeItem(ADMIN_KEY);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly adminSession = signal<AdminSession | null>(readAdminSession());
  private readonly seller = signal(readFlag(SELLER_KEY));

  readonly adminUser = computed(() => this.adminSession()?.user ?? null);
  readonly adminToken = computed(() => this.adminSession()?.token ?? null);
  readonly isAdmin = computed(() => Boolean(this.adminSession()?.token));
  readonly isSeller = computed(() => this.seller());
  readonly adminApiOrigin = API_ORIGIN;

  loginAdmin(credentials: AdminLoginCredentials): Observable<AdminAuthResponse> {
    return this.http.post<AdminAuthResponse>(`${API_BASE_URL}/admin/auth/login`, credentials).pipe(
      tap((response) => {
        const session: AdminSession = {
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
        };
        sessionStorage.setItem(ADMIN_KEY, JSON.stringify(session));
        this.adminSession.set(session);
      }),
    );
  }

  updateAdminProfile(profile: AdminProfileUpdate): Observable<{ message: string; user: AdminUser }> {
    const token = this.adminToken();
    if (!token) return throwError(() => new Error('Admin authentication required.'));

    return this.http
      .patch<{ message: string; user: AdminUser }>(`${API_BASE_URL}/admin/auth/me`, profile, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((response) => {
          this.updateAdminUser(response.user);
        }),
      );
  }

  changeAdminPassword(passwords: AdminPasswordUpdate): Observable<{ message: string }> {
    const token = this.adminToken();
    if (!token) return throwError(() => new Error('Admin authentication required.'));

    return this.http.patch<{ message: string }>(
      `${API_BASE_URL}/admin/auth/me/password`,
      passwords,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  logoutAdmin(): void {
    sessionStorage.removeItem(ADMIN_KEY);
    this.adminSession.set(null);
  }

  loginSeller(): void {
    sessionStorage.setItem(SELLER_KEY, '1');
    this.seller.set(true);
  }

  logoutSeller(): void {
    sessionStorage.removeItem(SELLER_KEY);
    this.seller.set(false);
  }

  private updateAdminUser(user: AdminUser): void {
    const current = this.adminSession();
    if (!current) return;

    const next: AdminSession = { ...current, user };
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(next));
    this.adminSession.set(next);
  }
}
