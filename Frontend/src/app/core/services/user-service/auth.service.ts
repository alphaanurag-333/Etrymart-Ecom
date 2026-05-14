import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, switchMap, tap, throwError } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { STOREFRONT_SESSION_KEY } from '../../config/storefront-session';

const DEVICE_ID_KEY = 'etrymart_user_device_id';

const AUTH_BASE = `${API_URL}/user/auth`;

export type CustomerGender = 'male' | 'female' | 'other';

/** Public user document as returned by `/user/auth/*` (password/otp stripped server-side). */
export interface CustomerUser {
  _id: string;
  name?: string;
  email?: string;
  mobile?: string;
  deviceId?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gender?: CustomerGender;
  role?: string;
  isGuest?: boolean;
  phoneVerified?: boolean;
  status?: string;
  profilePicture?: string;
  fcm_id?: string;
  wallet_amount?: number;
  referral_code?: string;
  daily_coins?: { coins?: number; last_updated?: string };
  total_referral_coins?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuestBody {
  deviceId: string;
}

export interface SendOtpBody {
  mobile: string;
}

/** Non-production API may include `devOtp` for testing. */
export interface SendOtpResponse {
  status?: string;
  message?: string;
  devOtp?: string;
}

export interface VerifyOtpBody {
  mobile: string;
  otp: string;
  referralCode?: string;
}

export interface AuthTokensResponse {
  status?: string;
  message?: string;
  user: CustomerUser;
  token: string;
  refreshToken: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface RefreshResponse {
  status?: string;
  message?: string;
  token: string;
  refreshToken: string;
}

export interface MeResponse {
  status?: string;
  message?: string;
  user: CustomerUser;
}

export interface CustomerProfileUpdate {
  name?: string;
  email?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gender?: CustomerGender;
  profilePicture?: string;
  fcm_id?: string;
}

interface UserSession {
  user: CustomerUser;
  token: string;
  refreshToken: string;
}

function readUserSession(): UserSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STOREFRONT_SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Partial<UserSession>;
    if (!session?.token || !session?.refreshToken || !session?.user?._id) return null;
    return session as UserSession;
  } catch {
    localStorage.removeItem(STOREFRONT_SESSION_KEY);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class UserAuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<UserSession | null>(readUserSession());

  readonly customerUser = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.token ?? null);
  readonly refreshToken = computed(() => this.session()?.refreshToken ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.session()?.token));
  readonly isGuest = computed(() => Boolean(this.customerUser()?.isGuest));
  readonly isPhoneVerified = computed(() => Boolean(this.customerUser()?.phoneVerified));

  /** Stable id for guest bootstrap; persisted in `localStorage`. */
  getOrCreateDeviceId(): string {
    if (typeof localStorage === 'undefined') {
      return `ssr-${Date.now()}`;
    }
    let id = localStorage.getItem(DEVICE_ID_KEY)?.trim();
    if (id && id.length >= 8) return id;
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `u-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  }

  /** Create or resume guest session for `deviceId`. */
  ensureGuest(deviceId?: string): Observable<AuthTokensResponse> {
    const id = (deviceId ?? '').trim() || this.getOrCreateDeviceId();
    return this.http.post<AuthTokensResponse>(`${AUTH_BASE}/guest`, { deviceId: id }).pipe(
      tap((res) => {
        this.setSession({
          user: res.user,
          token: res.token,
          refreshToken: res.refreshToken,
        });
      }),
    );
  }

  /**
   * Request OTP for `mobile`. If a guest session exists, the HTTP interceptor attaches the token
   * so the phone can attach to the current guest row when applicable.
   */
  sendOtp(body: SendOtpBody): Observable<SendOtpResponse> {
    return this.http.post<SendOtpResponse>(`${AUTH_BASE}/send-otp`, body);
  }

  verifyOtp(body: VerifyOtpBody): Observable<AuthTokensResponse> {
    return this.http.post<AuthTokensResponse>(`${AUTH_BASE}/verify-otp`, body).pipe(
      tap((res) => {
        this.setSession({
          user: res.user,
          token: res.token,
          refreshToken: res.refreshToken,
        });
      }),
    );
  }

  refreshTokens(): Observable<RefreshResponse> {
    const rt = this.session()?.refreshToken;
    if (!rt) {
      return throwError(() => new Error('No refresh token.'));
    }
    return this.http.post<RefreshResponse>(`${AUTH_BASE}/refresh`, { refreshToken: rt }).pipe(
      tap((res) => {
        this.updateTokens(res.token, res.refreshToken);
      }),
      catchError((error: unknown) => {
        this.logout();
        return throwError(() => error);
      }),
    );
  }

  getMe(): Observable<MeResponse> {
    return this.authorizedRequest(() => this.http.get<MeResponse>(`${AUTH_BASE}/me`)).pipe(
      tap((res) => {
        this.patchUser(res.user);
      }),
    );
  }

  updateMe(body: CustomerProfileUpdate): Observable<MeResponse> {
    return this.authorizedRequest(() => this.http.patch<MeResponse>(`${AUTH_BASE}/me`, body)).pipe(
      tap((res) => {
        this.patchUser(res.user);
      }),
    );
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STOREFRONT_SESSION_KEY);
    }
    this.session.set(null);
  }

  /** Run an authenticated storefront request with access-token refresh on 401. */
  authorizedRequest<T>(request: () => Observable<T>): Observable<T> {
    const token = this.accessToken();
    if (!token) {
      return throwError(() => new Error('Not signed in.'));
    }
    return request().pipe(
      catchError((error: unknown) => {
        if (!this.shouldRefresh(error)) {
          return throwError(() => error);
        }
        return this.refreshTokens().pipe(switchMap(() => request()));
      }),
    );
  }

  private shouldRefresh(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401 && Boolean(this.session()?.refreshToken);
  }

  private setSession(next: UserSession): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STOREFRONT_SESSION_KEY, JSON.stringify(next));
    }
    this.session.set(next);
  }

  private updateTokens(token: string, refreshToken: string): void {
    const cur = this.session();
    if (!cur) return;
    this.setSession({ ...cur, token, refreshToken });
  }

  private patchUser(user: CustomerUser): void {
    const cur = this.session();
    if (!cur) return;
    this.setSession({ ...cur, user });
  }
}
