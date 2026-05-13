import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';

export type AppPaymentMethodType = 'cod' | 'online' | 'wallet';

export interface AppPaymentMethod {
  type: AppPaymentMethodType;
  isActive?: boolean;
}

export type AppCommissionType = 'Vendor';

export interface AppCommission {
  type: AppCommissionType;
  percentage?: number;
}

export interface AppConfig {
  _id: string;
  app_name: string;
  app_email: string;
  app_mobile: string;
  app_detail?: string;
  admin_logo?: string;
  user_logo?: string;
  favicon?: string;
  website_theme_logo?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  app_details?: string;
  app_footer_text?: string;
  free_coin?: number;
  defaultTheme?: boolean;
  websiteTheme?: string;
  headerTextColor?: string;
  payment_methods?: AppPaymentMethod[];
  commissions?: AppCommission[];
  createdAt?: string;
  updatedAt?: string;
}

export type AppConfigPatchPayload = Partial<
  Omit<AppConfig, '_id' | 'createdAt' | 'updatedAt'>
>;

export interface AppConfigResponse {
  message: string;
  data: AppConfig;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/app-config`;

  getAppConfig(): Observable<AppConfigResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<AppConfigResponse>(this.base, {
        headers: this.authHeaders(token),
      }),
    );
  }

  /** Creates the singleton if missing (201) or updates it (200). Send JSON or `FormData` (use `*_file` fields for uploads). */
  patchAppConfig(payload: AppConfigPatchPayload | FormData): Observable<AppConfigResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<AppConfigResponse>(this.base, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  }

  private authHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
