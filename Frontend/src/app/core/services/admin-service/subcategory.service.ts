import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';
import { Category, CategoryStatus } from './category.service';

export interface SubCategory {
  _id: string;
  name: string;
  description?: string | null;
  category: string | Category;
  icon?: string | null;
  status: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubCategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
  category?: string;
}

export interface SubCategoryPayload {
  name: string;
  category: string;
  description?: string | null;
  icon?: string | File | null;
  status?: CategoryStatus;
}

export interface SubCategoryListResponse {
  status: string;
  message: string;
  subCategories: SubCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SubCategoryResponse {
  status: string;
  message: string;
  subCategory: SubCategory;
}

export interface SubCategoryDeleteResponse {
  status: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SubCategoryService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  listSubCategories(params: SubCategoryListParams = {}): Observable<SubCategoryListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<SubCategoryListResponse>(`${API_URL}/admin/subcategories`, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getSubCategoryById(id: string): Observable<SubCategoryResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<SubCategoryResponse>(`${API_URL}/admin/subcategories/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createSubCategory(payload: SubCategoryPayload): Observable<SubCategoryResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<SubCategoryResponse>(`${API_URL}/admin/subcategories`, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateSubCategory(
    id: string,
    payload: Partial<SubCategoryPayload>,
  ): Observable<SubCategoryResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<SubCategoryResponse>(
        `${API_URL}/admin/subcategories/${id}`,
        this.toBody(payload),
        {
          headers: this.authHeaders(token),
        },
      ),
    );
  }

  deleteSubCategory(id: string): Observable<SubCategoryDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<SubCategoryDeleteResponse>(`${API_URL}/admin/subcategories/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toBody(payload: Partial<SubCategoryPayload>): Partial<SubCategoryPayload> | FormData {
    if (!(payload.icon instanceof File)) return payload;

    const formData = new FormData();
    this.appendIfPresent(formData, 'name', payload.name);
    this.appendIfPresent(formData, 'category', payload.category);
    this.appendIfPresent(formData, 'description', payload.description);
    this.appendIfPresent(formData, 'status', payload.status);
    formData.append('file', payload.icon);
    return formData;
  }

  private toHttpParams(params: SubCategoryListParams): HttpParams {
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
