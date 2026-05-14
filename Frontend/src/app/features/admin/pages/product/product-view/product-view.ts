import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { MEDIA_URL } from '../../../../../core/config/api.config';
import {
  Product,
  ProductCombination,
  ProductService,
  ProductVariantAttribute,
} from '../../../../../core/services/admin-service/product.service';

@Component({
  selector: 'app-product-view',
  imports: [CommonModule, RouterLink],
  templateUrl: './product-view.html',
  styleUrls: ['../../../admin.css'],
})
export class ProductViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductService);

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => p.get('id')),
        filter((id): id is string => Boolean(id)),
        distinctUntilChanged(),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((id) =>
          this.products.getProductById(id).pipe(
            finalize(() => this.loading.set(false)),
          ),
        ),
      )
      .subscribe({
        next: (res) => {
          this.product.set(res.product);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load product');
          this.product.set(null);
        },
      });
  }

  protected mediaSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : `${MEDIA_URL}${path}`;
  }

  protected refId(ref: string | { _id: string } | undefined | null): string {
    if (!ref) return '';
    return typeof ref === 'string' ? ref : ref._id;
  }

  protected categoryName(p: Product): string {
    const c = p.category;
    return typeof c === 'object' && c?.name ? c.name : this.refId(c as string) || '-';
  }

  protected subCategoryName(p: Product): string {
    const s = p.subCategory;
    return typeof s === 'object' && s?.name ? s.name : this.refId(s as string) || '-';
  }

  protected formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  protected formatDiscount(p: Product): string {
    return p.discountType === 'percentage' ? `${p.discountValue}%` : this.formatMoney(p.discountValue);
  }

  protected formatCombinationDiscount(p: Product, c: ProductCombination): string {
    const v = c.discountValue ?? 0;
    return p.discountType === 'percentage' ? `${v}%` : this.formatMoney(v);
  }

  protected attrTitle(a: ProductVariantAttribute): string {
    const t = a.attributeTitle;
    if (typeof t === 'object' && t?.title) return t.title;
    if (typeof t === 'string' && t) return t;
    return '—';
  }

  protected attrValueLabel(a: ProductVariantAttribute): string {
    const v = a.attributeValue;
    if (typeof v === 'object' && v?.value) return v.value;
    if (typeof v === 'string' && v) return v;
    return '—';
  }

  protected variantColumnTitles(p: Product): string[] {
    const first = p.combinations[0];
    if (!first?.attributes?.length) return [];
    return first.attributes.map((a) => this.attrTitle(a));
  }

  protected combinationImages(c: ProductCombination): string[] {
    return Array.isArray(c.images) ? c.images.filter(Boolean) : [];
  }

  protected addedByLabel(p: Product): string {
    const a = p.addedById;
    if (typeof a === 'object' && a) {
      return (a as { businessName?: string; name?: string }).businessName?.trim() ||
        (a as { name?: string }).name?.trim() ||
        a._id;
    }
    return typeof a === 'string' ? a : '—';
  }

  protected formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  protected attributeTitlesSummary(p: Product): string {
    const fromCombos = this.variantColumnTitles(p);
    if (fromCombos.length) return fromCombos.join(', ');
    const raw = p.attributeTitles;
    if (!Array.isArray(raw) || !raw.length) return '—';
    return `${raw.length} variant title${raw.length === 1 ? '' : 's'} (ids)`;
  }
}
