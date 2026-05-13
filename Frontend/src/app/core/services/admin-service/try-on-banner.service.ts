import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';
import { CategoryStatus } from './category.service';

export interface TryOnBanner {
  _id: string;
  popupImage: string;
  status: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TryOnBannerListParams {
  page?: number;
  limit?: number;
  status?: CategoryStatus;
}

export interface TryOnBannerPayload {
  popupImage: string | File;
  file?: File | null;
  status?: CategoryStatus;
}

export interface TryOnBannerListResponse {
  status: string;
  message: string;
  tryOnBanners: TryOnBanner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TryOnBannerResponse {
  status: string;
  message: string;
  tryOnBanner: TryOnBanner;
}

export interface TryOnBannerDeleteResponse {
  status: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TryOnBannerService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/try-on-banners`;

  listTryOnBanners(params: TryOnBannerListParams = {}): Observable<TryOnBannerListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<TryOnBannerListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getTryOnBannerById(id: string): Observable<TryOnBannerResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<TryOnBannerResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createTryOnBanner(payload: TryOnBannerPayload): Observable<TryOnBannerResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<TryOnBannerResponse>(this.base, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateTryOnBanner(
    id: string,
    payload: Partial<TryOnBannerPayload>,
  ): Observable<TryOnBannerResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<TryOnBannerResponse>(`${this.base}/${id}`, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteTryOnBanner(id: string): Observable<TryOnBannerDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<TryOnBannerDeleteResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toBody(payload: Partial<TryOnBannerPayload>): Partial<TryOnBannerPayload> | FormData {
    const hasFile = payload.file instanceof File || payload.popupImage instanceof File;
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

  private toHttpParams(params: TryOnBannerListParams): HttpParams {
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
