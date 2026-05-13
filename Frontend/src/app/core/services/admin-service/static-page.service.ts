import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';

export type StaticPageStatus = 'active' | 'inactive';

export interface StaticPage {
  _id: string;
  title: string;
  content: string;
  slug: string;
  status: StaticPageStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaticPagePayload {
  title: string;
  content: string;
  slug: string;
  status?: StaticPageStatus;
}

export interface StaticPageListResponse {
  message: string;
  total: number;
  data: StaticPage[];
}

export interface StaticPageResponse {
  message: string;
  data: StaticPage;
}

export interface StaticPageDeleteResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class StaticPageService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/pages`;

  listPages(): Observable<StaticPageListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<StaticPageListResponse>(this.base, {
        headers: this.authHeaders(token),
      }),
    );
  }

  getPageById(id: string): Observable<StaticPageResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<StaticPageResponse>(`${this.base}/${encodeURIComponent(id)}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  getPageBySlug(slug: string): Observable<StaticPageResponse> {
    const s = slug.trim().toLowerCase();
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<StaticPageResponse>(`${this.base}/slug/${encodeURIComponent(s)}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createPage(payload: StaticPagePayload): Observable<StaticPageResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<StaticPageResponse>(this.base, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  updatePage(id: string, payload: Partial<StaticPagePayload>): Observable<StaticPageResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<StaticPageResponse>(`${this.base}/${encodeURIComponent(id)}`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  deletePage(id: string): Observable<StaticPageDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<StaticPageDeleteResponse>(`${this.base}/${encodeURIComponent(id)}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private authHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
