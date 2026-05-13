import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { ProductFormComponent } from '../product-form/product-form';

@Component({
  selector: 'app-product-edit',
  imports: [CommonModule, RouterLink, ProductFormComponent],
  template: `
    <div class="page-header d-flex flex-wrap justify-content-between align-items-start gap-2">
      <div class="page-header__lead">
        <h1 class="heading-2">Edit product</h1>
        <p class="text-muted text-sm page-header__sub">Update product details and variants.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <a routerLink="/admin/products/list" class="btn-admin-outline">Back to list</a>
        @if (id(); as pid) {
          <a [routerLink]="['/admin/products', pid]" class="btn-admin-outline">View</a>
        }
      </div>
    </div>
    <div class="card shadow-sm border-0">
      <div class="card-body p-3">
        @if (id(); as pid) {
          <app-product-form [productId]="pid" />
        } @else {
          <p class="text-muted small mb-0">Loading…</p>
        }
      </div>
    </div>
  `,
  styleUrls: ['../../../admin.css'],
})
export class ProductEditPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? undefined)), {
    initialValue: undefined,
  });
}
