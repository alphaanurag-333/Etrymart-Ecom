import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';

export type FaqStatus = 'active' | 'inactive';

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  sortOrder: number;
  status: FaqStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqPayload {
  question: string;
  answer: string;
  sortOrder?: number;
  status?: FaqStatus;
}

export interface FaqPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface FaqListResponse {
  status: string;
  message: string;
  faqs: Faq[];
  pagination: FaqPagination;
}

export interface FaqResponse {
  status: string;
  message: string;
  faq: Faq;
}

export interface FaqDeleteResponse {
  status: string;
  message: string;
}

export interface FaqListQuery {
  page?: number;
  limit?: number;
  status?: FaqStatus;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class FaqService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/faqs`;

  listFaqs(query?: FaqListQuery): Observable<FaqListResponse> {
    let params = new HttpParams();
    if (query?.page != null) params = params.set('page', String(query.page));
    if (query?.limit != null) params = params.set('limit', String(query.limit));
    if (query?.status) params = params.set('status', query.status);
    if (query?.search?.trim()) params = params.set('search', query.search.trim());

    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<FaqListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: params.keys().length ? params : undefined,
      }),
    );
  }

  getFaqById(id: string): Observable<FaqResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<FaqResponse>(`${this.base}/${encodeURIComponent(id)}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createFaq(payload: FaqPayload): Observable<FaqResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<FaqResponse>(this.base, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateFaq(id: string, payload: Partial<FaqPayload>): Observable<FaqResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<FaqResponse>(`${this.base}/${encodeURIComponent(id)}`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteFaq(id: string): Observable<FaqDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<FaqDeleteResponse>(`${this.base}/${encodeURIComponent(id)}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private authHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
