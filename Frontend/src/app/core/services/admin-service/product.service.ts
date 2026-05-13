import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../config/api.config';
import { AuthService } from './auth.service';
import { CategoryStatus } from './category.service';

export type ProductDiscountType = 'percentage' | 'flat';
export type ProductTaxType = 'inclusive' | 'exclusive';
export type ProductVariantType = 'single' | 'multi';
export type ProductRole = 'Admin' | 'Vendor';

export interface ProductCombinationInput {
  sku: string;
  price: number;
  discountValue?: number;
  stock?: number;
  images?: string[];
  attributes: Array<{ attributeTitle: string; attributeValue: string }>;
  status?: CategoryStatus;
}

export interface ProductVariantAttribute {
  attributeTitle: string | { _id: string; title?: string; status?: string };
  attributeValue: string | { _id: string; value?: string; status?: string };
}

export interface ProductCombination {
  sku: string;
  attributes: ProductVariantAttribute[];
  price: number;
  discountValue: number;
  stock: number;
  images: string[];
  status: CategoryStatus;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  discountType: ProductDiscountType;
  discountValue: number;
  taxType: ProductTaxType;
  taxValue: number;
  description: string;
  shortDescription?: string;
  category: string | { _id: string; name?: string; status?: string };
  subCategory: string | { _id: string; name?: string; status?: string };
  moq: number;
  price: number;
  stock: number;
  variantType: ProductVariantType;
  thumbnail: string;
  images: string[];
  combinations: ProductCombination[];
  attributeTitles: string[] | Array<{ _id: string; title?: string; status?: string }>;
  role: ProductRole;
  addedById: string | { _id: string; name?: string; businessName?: string };
  adminApproved?: boolean;
  status: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  status?: CategoryStatus;
  role?: ProductRole;
  addedById?: string;
  category?: string;
  subCategory?: string;
  search?: string;
  variantType?: ProductVariantType;
}

/** Matches `productController` list response (no status wrapper). */
export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductResponse {
  product: Product;
}

export interface ProductCreateResponse {
  message: string;
  product: Product;
}

export interface ProductUpdateResponse {
  message: string;
  product: Product;
}

export interface ProductDeleteResponse {
  message: string;
}

/** Fields accepted by POST `/admin/products` (multipart or JSON). */
export interface ProductCreatePayload {
  name: string;
  slug?: string;
  sku: string;
  description: string;
  shortDescription?: string;
  category: string;
  subCategory: string;
  moq?: number;
  price: number;
  stock?: number;
  discountType?: ProductDiscountType;
  discountValue?: number;
  taxType?: ProductTaxType;
  taxValue?: number;
  variantType?: ProductVariantType;
  /** Required if `thumbnailFile` is not sent. */
  thumbnail?: string;
  images?: string[];
  /** Use `[]` for `single` variant products. */
  combinations: ProductCombinationInput[];
  attributeTitles: string[];
  status?: CategoryStatus;
  role?: ProductRole;
  addedById: string;
  adminApproved?: boolean;
  thumbnailFile?: File | null;
  imageFiles?: File[];
  /** Uploaded per combination row index; field names match backend `combinationImages{index}_{order}`. */
  combinationImages?: Array<{ comboIndex: number; files: File[] }>;
}

export type ProductUpdatePayload = Partial<Omit<ProductCreatePayload, 'combinations' | 'attributeTitles'>> & {
  combinations?: ProductCombinationInput[];
  attributeTitles?: string[];
};

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_URL}/admin/products`;

  listProducts(params: ProductListParams = {}): Observable<ProductListResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<ProductListResponse>(this.base, {
        headers: this.authHeaders(token),
        params: this.toHttpParams(params),
      }),
    );
  }

  getProductById(id: string): Observable<ProductResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.get<ProductResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  createProduct(payload: ProductCreatePayload): Observable<ProductCreateResponse> {
    const body = this.toRequestBody(payload);
    return this.auth.authorizedAdminRequest((token) =>
      this.http.post<ProductCreateResponse>(this.base, body, {
        headers: this.authHeaders(token),
      }),
    );
  }

  updateProduct(id: string, payload: ProductUpdatePayload): Observable<ProductUpdateResponse> {
    const body = this.toUpdateBody(payload);
    return this.auth.authorizedAdminRequest((token) =>
      this.http.patch<ProductUpdateResponse>(`${this.base}/${id}`, body, {
        headers: this.authHeaders(token),
      }),
    );
  }

  deleteProduct(id: string): Observable<ProductDeleteResponse> {
    return this.auth.authorizedAdminRequest((token) =>
      this.http.delete<ProductDeleteResponse>(`${this.base}/${id}`, {
        headers: this.authHeaders(token),
      }),
    );
  }

  private toRequestBody(payload: ProductCreatePayload): FormData | ProductCreateJsonBody {
    if (this.shouldUseMultipart(payload)) {
      return this.buildFormData(payload);
    }
    return this.toJsonBody(payload);
  }

  private toUpdateBody(payload: ProductUpdatePayload): FormData | Record<string, unknown> {
    if (this.shouldUseMultipartUpdate(payload)) {
      return this.buildFormDataUpdate(payload);
    }
    return this.toJsonPatchBody(payload);
  }

  private shouldUseMultipart(payload: ProductCreatePayload): boolean {
    return Boolean(
      payload.thumbnailFile ||
        (payload.imageFiles && payload.imageFiles.length > 0) ||
        (payload.combinationImages && payload.combinationImages.some((c) => c.files.length > 0)),
    );
  }

  private shouldUseMultipartUpdate(payload: ProductUpdatePayload): boolean {
    return Boolean(
      payload.thumbnailFile ||
        (payload.imageFiles && payload.imageFiles.length > 0) ||
        (payload.combinationImages && payload.combinationImages.some((c) => c.files.length > 0)),
    );
  }

  private toJsonBody(payload: ProductCreatePayload): ProductCreateJsonBody {
    const body = { ...payload } as ProductCreatePayload & Record<string, unknown>;
    delete body.thumbnailFile;
    delete body.imageFiles;
    delete body.combinationImages;
    return body as ProductCreateJsonBody;
  }

  private toJsonPatchBody(payload: ProductUpdatePayload): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const skip = new Set(['thumbnailFile', 'imageFiles', 'combinationImages']);
    for (const [key, value] of Object.entries(payload)) {
      if (skip.has(key)) continue;
      if (value === undefined) continue;
      if (key === 'combinations' && Array.isArray(value)) {
        out[key] = value;
        continue;
      }
      if (key === 'attributeTitles' && Array.isArray(value)) {
        out[key] = value;
        continue;
      }
      out[key] = value;
    }
    return out;
  }

  private buildFormData(payload: ProductCreatePayload): FormData {
    const fd = new FormData();
    const {
      thumbnailFile,
      imageFiles,
      combinationImages,
      combinations,
      attributeTitles,
      images,
      ...scalarParts
    } = payload;

    this.appendScalarFields(fd, scalarParts as Record<string, string | number | boolean | undefined>);
    fd.append('combinations', JSON.stringify(combinations));
    fd.append('attributeTitles', JSON.stringify(attributeTitles));
    if (images?.length) {
      fd.append('images', JSON.stringify(images));
    }

    if (thumbnailFile) {
      fd.append('thumbnail', thumbnailFile, thumbnailFile.name);
    }
    for (const file of imageFiles ?? []) {
      fd.append('images', file, file.name);
    }
    this.appendCombinationImages(fd, combinationImages);
    return fd;
  }

  private buildFormDataUpdate(payload: ProductUpdatePayload): FormData {
    const fd = new FormData();
    const {
      thumbnailFile,
      imageFiles,
      combinationImages,
      combinations,
      attributeTitles,
      images,
      ...rest
    } = payload;

    this.appendScalarFields(fd, rest as Record<string, string | number | boolean | undefined>);
    if (combinations !== undefined) {
      fd.append('combinations', JSON.stringify(combinations));
    }
    if (attributeTitles !== undefined) {
      fd.append('attributeTitles', JSON.stringify(attributeTitles));
    }
    if (images !== undefined) {
      fd.append('images', JSON.stringify(images));
    }
    if (thumbnailFile) {
      fd.append('thumbnail', thumbnailFile, thumbnailFile.name);
    }
    for (const file of imageFiles ?? []) {
      fd.append('images', file, file.name);
    }
    this.appendCombinationImages(fd, combinationImages);
    return fd;
  }

  private appendScalarFields(
    fd: FormData,
    fields: Record<string, string | number | boolean | undefined>,
  ): void {
    const skip = new Set(['combinations', 'attributeTitles', 'images']);
    for (const [key, value] of Object.entries(fields)) {
      if (skip.has(key)) continue;
      if (value === undefined || value === null) continue;
      fd.append(key, String(value));
    }
  }

  private appendCombinationImages(
    fd: FormData,
    groups: Array<{ comboIndex: number; files: File[] }> | undefined,
  ): void {
    if (!groups?.length) return;
    for (const { comboIndex, files } of groups) {
      files.forEach((file, order) => {
        fd.append(`combinationImages${comboIndex}_${order}`, file, file.name);
      });
    }
  }

  private toHttpParams(params: ProductListParams): HttpParams {
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

/** JSON create body (arrays sent as JSON-serializable structures). */
type ProductCreateJsonBody = Omit<
  ProductCreatePayload,
  'thumbnailFile' | 'imageFiles' | 'combinationImages'
>;
