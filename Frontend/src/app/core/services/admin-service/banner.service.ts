import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';
import { CategoryStatus } from './category.service';

export type BannerType = 'main_banner' | 'popup_banner' | 'ads_img_banner' | 'ads_video_banner';

export interface Banner {
  _id: string;
  title: string;
  image?: string | null;
  video?: string | null;
  status: CategoryStatus;
  banner_type: BannerType;
  start_date?: string | null;
  end_date?: string | null;
  pop_up_time?: number | null;
  advertising_link?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
  banner_type?: BannerType;
}

export interface BannerPayload {
  title: string;
  image?: string | File | null;
  video?: string | File | null;
  file?: File | null;
  status?: CategoryStatus;
  banner_type?: BannerType;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  pop_up_time?: number | null;
  advertising_link?: string | null;
}

export interface BannerListResponse {
  status: string;
  message: string;
  banners: Banner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BannerResponse {
  status: string;
  message: string;
  banner: Banner;
}

export interface BannerDeleteResponse {
  status: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/banners`;

  listBanners(params: BannerListParams = {}): Observable<BannerListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<BannerListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getBannerById(id: string): Observable<BannerResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<BannerResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createBanner(payload: BannerPayload): Observable<BannerResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<BannerResponse>(this.base, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateBanner(id: string, payload: Partial<BannerPayload>): Observable<BannerResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<BannerResponse>(`${this.base}/${id}`, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteBanner(id: string): Observable<BannerDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<BannerDeleteResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toBody(payload: Partial<BannerPayload>): Partial<BannerPayload> | FormData {
    const hasFile =
      payload.file instanceof File || payload.image instanceof File || payload.video instanceof File;
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

  private toHttpParams(params: BannerListParams): HttpParams {
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
