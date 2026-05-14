import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { Vendor, VendorService } from '../../../../../core/services/admin-service/vendor.service';
import { AdminVendorFormComponent } from '../vendor-form/vendor-form';

@Component({
  selector: 'app-admin-vendor-edit',
  imports: [CommonModule, RouterLink, AdminVendorFormComponent],
  template: `
    <div class="page-header d-flex flex-wrap justify-content-between align-items-start gap-2">
      <div class="page-header__lead">
        <h1 class="heading-2">Edit vendor</h1>
        <p class="text-muted text-sm page-header__sub">Update seller profile, documents, and approval.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        @if (vendor(); as v) {
          <a [routerLink]="['/admin/vendors', v._id]" class="btn-admin-outline">View</a>
        }
        <a routerLink="/admin/vendors/list" class="btn-admin-outline">Back to list</a>
      </div>
    </div>
    <div class="card shadow-sm border-0">
      <div class="card-body p-3">
        @if (loading()) {
          <p class="text-muted mb-0">Loading…</p>
        } @else if (error()) {
          <div class="alert alert-danger mb-0">{{ error() }}</div>
        } @else if (vendor(); as v) {
          <app-admin-vendor-form [initialVendor]="v" />
        }
      </div>
    </div>
  `,
  styleUrls: ['../../../admin.css'],
})
export class AdminVendorEditPage {
  private readonly route = inject(ActivatedRoute);
  private readonly vendorsApi = inject(VendorService);

  protected readonly vendor = signal<Vendor | null>(null);
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
          this.vendor.set(null);
        }),
        switchMap((id) =>
          this.vendorsApi.getVendorById(id).pipe(finalize(() => this.loading.set(false))),
        ),
      )
      .subscribe({
        next: (res) => this.vendor.set(res.vendor),
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load vendor');
          this.vendor.set(null);
        },
      });
  }
}
