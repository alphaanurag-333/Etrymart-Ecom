import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';

export type CategoryStatus = 'active' | 'inactive';

export interface Category {
  _id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  status: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
}

export interface CategoryPayload {
  name: string;
  description?: string | null;
  icon?: string | File | null;
  status?: CategoryStatus;
}

export interface CategoryListResponse {
  status: string;
  message: string;
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CategoryResponse {
  status: string;
  message: string;
  category: Category;
}

export interface CategoryDeleteResponse {
  status: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  listCategories(params: CategoryListParams = {}): Observable<CategoryListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<CategoryListResponse>(`${API_URL}/admin/categories`, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getCategoryById(id: string): Observable<CategoryResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<CategoryResponse>(`${API_URL}/admin/categories/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createCategory(payload: CategoryPayload): Observable<CategoryResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<CategoryResponse>(`${API_URL}/admin/categories`, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateCategory(id: string, payload: Partial<CategoryPayload>): Observable<CategoryResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<CategoryResponse>(`${API_URL}/admin/categories/${id}`, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteCategory(id: string): Observable<CategoryDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<CategoryDeleteResponse>(`${API_URL}/admin/categories/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toBody(payload: Partial<CategoryPayload>): Partial<CategoryPayload> | FormData {
    if (!(payload.icon instanceof File)) return payload;

    const formData = new FormData();
    this.appendIfPresent(formData, 'name', payload.name);
    this.appendIfPresent(formData, 'description', payload.description);
    this.appendIfPresent(formData, 'status', payload.status);
    formData.append('file', payload.icon);
    return formData;
  }

  private toHttpParams(params: CategoryListParams): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }

  private appendIfPresent(formData: FormData, key: string, value: unknown): void {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  private authHeaders(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }
}
