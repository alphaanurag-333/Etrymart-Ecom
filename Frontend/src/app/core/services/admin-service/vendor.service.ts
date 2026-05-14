import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL, MEDIA_URL } from '../../config/api.config';
import { AuthService } from './auth.service';

/** Base path for admin vendor UI routes (list, create, view, edit). */
export const ADMIN_VENDOR_BASE = '/admin/vendors';

export type VendorStatus = 'active' | 'inactive' | 'blocked';
export type VendorApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type VendorGender = 'male' | 'female' | 'other';
export type VendorAccountType = 'Current' | 'Savings';

export interface Vendor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  dob?: string | null;
  gender?: VendorGender;
  profileImage?: string | null;
  fcm_id?: string | null;
  businessName: string;
  businessPhone?: string | null;
  gstin?: string | null;
  panCardNumber?: string | null;
  businessAddress?: string | null;
  aadhaarCardFront?: string | null;
  aadhaarCardBack?: string | null;
  panCardFront?: string | null;
  shopLogo?: string | null;
  shopImages?: string[];
  shopVideos?: string[];
  shopBanner?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  accountNo?: string | null;
  ifsc?: string | null;
  accountType?: VendorAccountType;
  status: VendorStatus;
  approvalStatus: VendorApprovalStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VendorStatus;
  approvalStatus?: VendorApprovalStatus;
}

export interface VendorPayload {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  password?: string;
  businessPhone?: string | null;
  gstin?: string | null;
  panCardNumber?: string | null;
  businessAddress?: string | null;
  aadhaarCardFront?: string | File | null;
  aadhaarCardBack?: string | File | null;
  panCardFront?: string | File | null;
  panCard?: File | null;
  shopLogo?: string | File | null;
  shopImages?: (string | File)[] | File[];
  shopVideos?: (string | File)[] | File[];
  shopBanner?: string | File | null;
  profileImage?: string | File | null;
  file?: File | null;
  bankName?: string | null;
  branchName?: string | null;
  accountNo?: string | null;
  ifsc?: string | null;
  accountType?: VendorAccountType;
  dob?: string | Date | null;
  gender?: VendorGender;
  fcm_id?: string | null;
  status?: VendorStatus;
  approvalStatus?: VendorApprovalStatus;
}

export interface VendorListResponse {
  vendors: Vendor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface VendorResponse {
  message?: string;
  vendor: Vendor;
}

export interface VendorDeleteResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/vendors`;

  listVendors(params: VendorListParams = {}): Observable<VendorListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<VendorListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getVendorById(id: string): Observable<VendorResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<VendorResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createVendor(payload: VendorPayload): Observable<VendorResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<VendorResponse>(this.base, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateVendor(id: string, payload: Partial<VendorPayload>): Observable<VendorResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<VendorResponse>(`${this.base}/${id}`, this.toBody(payload), {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteVendor(id: string): Observable<VendorDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<VendorDeleteResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  /** Resolve a stored upload path (e.g. `/uploads/...`) to a browser URL. */
  mediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : `${MEDIA_URL}${path}`;
  }

  private toBody(payload: Partial<VendorPayload>): FormData | Partial<VendorPayload> {
    if (!this.payloadHasFiles(payload)) {
      return { ...payload };
    }

    const formData = new FormData();

    const appendString = (key: string, value: unknown) => {
      if (value === undefined || value === null) return;
      if (value instanceof File) return;
      const s = value instanceof Date ? value.toISOString() : String(value);
      if (s === '') return;
      formData.append(key, s);
    };

    appendString('name', payload.name);
    appendString('email', payload.email);
    appendString('phone', payload.phone);
    appendString('businessName', payload.businessName);
    appendString('password', payload.password);
    appendString('businessPhone', payload.businessPhone);
    appendString('gstin', payload.gstin);
    appendString('panCardNumber', payload.panCardNumber);
    appendString('businessAddress', payload.businessAddress);
    appendString('bankName', payload.bankName);
    appendString('branchName', payload.branchName);
    appendString('accountNo', payload.accountNo);
    appendString('ifsc', payload.ifsc);
    appendString('accountType', payload.accountType);
    appendString('gender', payload.gender);
    appendString('fcm_id', payload.fcm_id);
    appendString('status', payload.status);
    appendString('approvalStatus', payload.approvalStatus);

    if (payload.dob !== undefined) {
      if (payload.dob === null || payload.dob === '') {
        formData.append('dob', '');
      } else if (payload.dob instanceof Date) {
        formData.append('dob', payload.dob.toISOString());
      } else {
        formData.append('dob', String(payload.dob));
      }
    }

    if (payload.profileImage instanceof File) {
      formData.append('file', payload.profileImage);
    } else if (payload.file instanceof File) {
      formData.append('file', payload.file);
    }

    this.appendFile(formData, 'aadhaarCardFront', payload.aadhaarCardFront);
    this.appendFile(formData, 'aadhaarCardBack', payload.aadhaarCardBack);
    if (payload.panCardFront instanceof File) {
      formData.append('panCardFront', payload.panCardFront);
    } else if (payload.panCard instanceof File) {
      formData.append('panCard', payload.panCard);
    }
    this.appendFile(formData, 'shopLogo', payload.shopLogo);
    this.appendFile(formData, 'shopBanner', payload.shopBanner);

    if (Array.isArray(payload.shopImages)) {
      for (const item of payload.shopImages) {
        if (item instanceof File) {
          formData.append('shopImages', item);
        }
      }
    }

    if (Array.isArray(payload.shopVideos)) {
      for (const item of payload.shopVideos) {
        if (item instanceof File) {
          formData.append('shopVideos', item);
        }
      }
    }

    return formData;
  }

  private appendFile(formData: FormData, key: string, value: string | File | null | undefined): void {
    if (value instanceof File) {
      formData.append(key, value);
    }
  }

  private payloadHasFiles(payload: Partial<VendorPayload>): boolean {
    const check = (v: unknown) => v instanceof File;
    if (check(payload.file) || check(payload.profileImage)) return true;
    if (check(payload.aadhaarCardFront) || check(payload.aadhaarCardBack)) return true;
    if (check(payload.panCardFront) || check(payload.panCard)) return true;
    if (check(payload.shopLogo) || check(payload.shopBanner)) return true;
    if (Array.isArray(payload.shopImages) && payload.shopImages.some((x) => x instanceof File)) return true;
    if (Array.isArray(payload.shopVideos) && payload.shopVideos.some((x) => x instanceof File)) return true;
    return false;
  }

  private toHttpParams(params: VendorListParams): HttpParams {
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
