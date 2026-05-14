import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';

export type AppUserStatus = 'active' | 'inactive' | 'blocked';
export type AppUserGender = 'male' | 'female' | 'other';
export type ReferralEntryStatus = 'pending' | 'successful';

export interface AppUserReferralEntry {
  user?: string;
  joined_at?: string;
  status?: ReferralEntryStatus;
}

export interface AppUserDailyCoins {
  coins?: number;
  last_updated?: string;
}

export interface AppUser {
  _id: string;
  name?: string;
  email?: string;
  mobile?: string;
  deviceId?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gender?: AppUserGender;
  role?: string;
  isGuest?: boolean;
  phoneVerified?: boolean;
  status?: AppUserStatus;
  profilePicture?: string;
  fcm_id?: string;
  wallet_amount?: number;
  daily_coins?: AppUserDailyCoins;
  referral_code?: string;
  referred_by?: string | null;
  referred_by_code_snapshot?: string | null;
  referrals?: AppUserReferralEntry[];
  total_referral_coins?: number;
  referral_coins?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AppUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AppUserStatus;
  phoneVerified?: boolean;
  isGuest?: boolean;
}

export interface AppUserListResponse {
  status?: string;
  message?: string;
  users: AppUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AppUserResponse {
  status?: string;
  message?: string;
  user: AppUser;
}

export interface AppUserUpdatePayload {
  status?: AppUserStatus;
  name?: string;
  email?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gender?: AppUserGender;
  phoneVerified?: boolean;
  isGuest?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/users`;

  listUsers(params: AppUserListParams = {}): Observable<AppUserListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<AppUserListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getUserById(id: string): Observable<AppUserResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<AppUserResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateUser(id: string, payload: AppUserUpdatePayload): Observable<AppUserResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<AppUserResponse>(`${this.base}/${id}`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toHttpParams(params: AppUserListParams): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      if (typeof value === 'boolean') {
        httpParams = httpParams.set(key, value ? 'true' : 'false');
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private authHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
