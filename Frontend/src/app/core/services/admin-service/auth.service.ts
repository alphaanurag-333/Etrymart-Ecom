import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import { API_URL } from '../../config/api.config';

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

export interface AdminRefreshResponse {
  message: string;
  token: string;
  refreshToken: string;
}

export interface AdminProfileUpdate {
  name: string;
  phone?: string | null;
  profileImage?: File;
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

  loginAdmin(credentials: AdminLoginCredentials): Observable<AdminAuthResponse> {
    return this.http.post<AdminAuthResponse>(`${API_URL}/admin/auth/login`, credentials).pipe(
      tap((response) => {
        this.setAdminSession({
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
        });
      }),
    );
  }

  refreshAdminToken(): Observable<AdminRefreshResponse> {
    const session = this.adminSession();
    if (!session?.refreshToken) {
      return throwError(() => new Error('Admin refresh token is missing.'));
    }

    return this.http
      .post<AdminRefreshResponse>(`${API_URL}/admin/auth/refresh`, {
        refreshToken: session.refreshToken,
      })
      .pipe(
        tap((response) => {
          this.updateAdminTokens(response.token, response.refreshToken);
        }),
        catchError((error: unknown) => {
          this.logoutAdmin();
          return throwError(() => error);
        }),
      );
  }

  updateAdminProfile(profile: AdminProfileUpdate): Observable<{ message: string; user: AdminUser }> {
    const body = this.createAdminProfileBody(profile);

    return this.authorizedAdminRequest((token) =>
      this.http.patch<{ message: string; user: AdminUser }>(`${API_URL}/admin/auth/me`, body, {
        headers: this.getAdminAuthHeaders(token),
      }),
    )
      .pipe(
        tap((response) => {
          this.updateAdminUser(response.user);
        }),
      );
  }

  changeAdminPassword(passwords: AdminPasswordUpdate): Observable<{ message: string }> {
    return this.authorizedAdminRequest((token) =>
      this.http.patch<{ message: string }>(
        `${API_URL}/admin/auth/me/password`,
        passwords,
        {
          headers: this.getAdminAuthHeaders(token),
        },
      ),
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

  authorizedAdminRequest<T>(request: (token: string) => Observable<T>): Observable<T> {
    const token = this.adminToken();
    if (!token) {
      return throwError(() => new Error('Admin authentication required.'));
    }

    return request(token).pipe(
      catchError((error: unknown) => {
        if (!this.shouldRefreshAdminToken(error)) {
          return throwError(() => error);
        }

        return this.refreshAdminToken().pipe(
          switchMap((response) => request(response.token)),
        );
      }),
    );
  }

  private shouldRefreshAdminToken(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401 && Boolean(this.adminSession()?.refreshToken);
  }

  private getAdminAuthHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  private createAdminProfileBody(profile: AdminProfileUpdate): Omit<AdminProfileUpdate, 'profileImage'> | FormData {
    if (!profile.profileImage) {
      const { profileImage: _profileImage, ...body } = profile;
      return body;
    }

    const formData = new FormData();
    formData.append('name', profile.name);
    formData.append('phone', profile.phone ?? '');
    formData.append('file', profile.profileImage);
    return formData;
  }

  private setAdminSession(session: AdminSession): void {
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(session));
    this.adminSession.set(session);
  }

  private updateAdminTokens(token: string, refreshToken: string): void {
    const current = this.adminSession();
    if (!current) return;

    this.setAdminSession({ ...current, token, refreshToken });
  }

  private updateAdminUser(user: AdminUser): void {
    const current = this.adminSession();
    if (!current) return;

    this.setAdminSession({ ...current, user });
  }
}
