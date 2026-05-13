import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';
import { CategoryStatus } from './category.service';

export type CouponDiscountType = 'percent' | 'flat';

export interface Coupon {
  _id: string;
  couponTitle: string;
  couponCode: string;
  discountType: CouponDiscountType;
  discountAmount: number;
  minimumPurchase: number;
  startDate?: string | null;
  expireDate?: string | null;
  status: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
  discountType?: CouponDiscountType;
}

export interface CouponPayload {
  couponTitle: string;
  couponCode: string;
  discountType: CouponDiscountType;
  discountAmount: number;
  minimumPurchase?: number;
  startDate?: string | Date | null;
  expireDate?: string | Date | null;
  status?: CategoryStatus;
}

export interface CouponListResponse {
  status: string;
  message: string;
  coupons: Coupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CouponResponse {
  status: string;
  message: string;
  coupon: Coupon;
}

export interface CouponDeleteResponse {
  status: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/coupons`;

  listCoupons(params: CouponListParams = {}): Observable<CouponListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<CouponListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getCouponById(id: string): Observable<CouponResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<CouponResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createCoupon(payload: CouponPayload): Observable<CouponResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<CouponResponse>(this.base, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateCoupon(id: string, payload: Partial<CouponPayload>): Observable<CouponResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<CouponResponse>(`${this.base}/${id}`, payload, {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteCoupon(id: string): Observable<CouponDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<CouponDeleteResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toHttpParams(params: CouponListParams): HttpParams {
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
