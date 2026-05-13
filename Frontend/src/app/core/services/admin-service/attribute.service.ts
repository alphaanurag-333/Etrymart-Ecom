import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';

export type AttributeStatus = 'active' | 'inactive';

export interface AttributeTitle {
  _id: string;
  title: string;
  status: AttributeStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** Populated `attributeTitle` on values from list/detail APIs */
export interface AttributeTitleRef {
  _id: string;
  title: string;
  status: AttributeStatus;
}

export interface AttributeValue {
  _id: string;
  attributeTitle: string | AttributeTitleRef;
  value: string;
  status: AttributeStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AttributeTitleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AttributeStatus;
}

export interface AttributeTitlePayload {
  title: string;
  status?: AttributeStatus;
}

export interface AttributeTitleListResponse {
  attributeTitles: AttributeTitle[];
  pagination: PaginationMeta;
}

export interface AttributeTitleResponse {
  attributeTitle: AttributeTitle;
}

export interface AttributeTitleMutationResponse {
  message: string;
  attributeTitle: AttributeTitle;
}

export interface AttributeTitleDeleteResponse {
  message: string;
}

export interface AttributeValueListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AttributeStatus;
  /** AttributeTitle ObjectId */
  attributeTitle?: string;
}

export interface AttributeValuePayload {
  attributeTitle: string;
  value: string;
  status?: AttributeStatus;
}

export interface AttributeValueListResponse {
  attributeValues: AttributeValue[];
  pagination: PaginationMeta;
}

export interface AttributeValueResponse {
  attributeValue: AttributeValue;
}

export interface AttributeValueMutationResponse {
  message: string;
  attributeValue: AttributeValue;
}

export interface AttributeValueDeleteResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AttributeService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly base = `${API_URL}/admin/attributes`;

  // --- Attribute titles ---

  listAttributeTitles(params: AttributeTitleListParams = {}): Observable<AttributeTitleListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<AttributeTitleListResponse>(`${this.base}/titles`, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getAttributeTitleById(id: string): Observable<AttributeTitleResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<AttributeTitleResponse>(`${this.base}/titles/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createAttributeTitle(payload: AttributeTitlePayload): Observable<AttributeTitleMutationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<AttributeTitleMutationResponse>(`${this.base}/titles`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateAttributeTitle(
    id: string,
    payload: Partial<AttributeTitlePayload>,
  ): Observable<AttributeTitleMutationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<AttributeTitleMutationResponse>(`${this.base}/titles/${id}`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteAttributeTitle(id: string): Observable<AttributeTitleDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<AttributeTitleDeleteResponse>(`${this.base}/titles/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  // --- Attribute values ---

  listAttributeValues(params: AttributeValueListParams = {}): Observable<AttributeValueListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<AttributeValueListResponse>(`${this.base}/values`, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getAttributeValueById(id: string): Observable<AttributeValueResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<AttributeValueResponse>(`${this.base}/values/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createAttributeValue(payload: AttributeValuePayload): Observable<AttributeValueMutationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<AttributeValueMutationResponse>(`${this.base}/values`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateAttributeValue(
    id: string,
    payload: Partial<AttributeValuePayload>,
  ): Observable<AttributeValueMutationResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<AttributeValueMutationResponse>(`${this.base}/values/${id}`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteAttributeValue(id: string): Observable<AttributeValueDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<AttributeValueDeleteResponse>(`${this.base}/values/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toHttpParams(
    params: AttributeTitleListParams | AttributeValueListParams,
  ): HttpParams {
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
