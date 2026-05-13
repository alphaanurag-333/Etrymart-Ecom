import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';
import { CategoryStatus } from './category.service';

export type NotificationAudience = 'users' | 'vendors' | 'all';

export interface NotificationPushResult {
  audience: NotificationAudience;
  attempted: number;
  successCount: number;
  failureCount: number;
}

export interface PushNotification {
  _id: string;
  title: string;
  description: string;
  audience: NotificationAudience;
  image?: string | null;
  status: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
  audience?: NotificationAudience;
}

export interface NotificationPayload {
  title: string;
  description: string;
  image?: string | File | null;
  file?: File | null;
  status?: CategoryStatus;
  audience?: NotificationAudience;
}

export interface NotificationListResponse {
  status: string;
  message: string;
  notifications: PushNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NotificationResponse {
  status: string;
  message: string;
  notification: PushNotification;
  push?: NotificationPushResult | null;
}

export interface NotificationDeleteResponse {
  status: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/notifications`;

  listNotifications(params: NotificationListParams = {}): Observable<NotificationListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<NotificationListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getNotificationById(id: string): Observable<NotificationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<NotificationResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createNotification(payload: NotificationPayload): Observable<NotificationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<NotificationResponse>(this.base, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateNotification(
    id: string,
    payload: Partial<NotificationPayload>,
  ): Observable<NotificationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<NotificationResponse>(`${this.base}/${id}`, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteNotification(id: string): Observable<NotificationDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<NotificationDeleteResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  resendNotification(
    id: string,
    audience: NotificationAudience = 'users',
  ): Observable<NotificationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<NotificationResponse>(
        `${this.base}/${id}/resend`,
        { audience },
        {
          headers: this.authHeaders(token),
        },
      ),
    );
  }

  private toBody(payload: Partial<NotificationPayload>): Partial<NotificationPayload> | FormData {
    const hasFile = payload.file instanceof File || payload.image instanceof File;
    if (!hasFile) return payload;

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (value instanceof File) {
        formData.append(key, value);
        return;
      }
      formData.append(key, String(value));
    });
    return formData;
  }

  private toHttpParams(params: NotificationListParams): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }

  private authHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
