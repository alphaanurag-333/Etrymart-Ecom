import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  Vendor,
  VendorApprovalStatus,
  VendorService,
  VendorStatus,
} from '../../../../../core/services/admin-service/vendor.service';

@Component({
  selector: 'app-admin-vendor-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './vendor-list.html',
  styleUrls: ['../../../admin.css'],
})
export class AdminVendorListPage {
  private readonly fb = inject(FormBuilder);
  private readonly vendorsApi = inject(VendorService);

  protected readonly rows = signal<Vendor[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly statusOptions: VendorStatus[] = ['active', 'inactive', 'blocked'];
  protected readonly approvalOptions: VendorApprovalStatus[] = [
    'pending',
    'approved',
    'rejected',
    'suspended',
  ];

  protected readonly filters = this.fb.group({
    search: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<VendorStatus | ''>(''),
    approvalStatus: this.fb.nonNullable.control<VendorApprovalStatus | ''>(''),
  });

  constructor() {
    this.loadPage(1);
  }

  protected serialFor(index: number): number {
    const { page, limit } = this.pagination();
    return (page - 1) * limit + index + 1;
  }

  protected applyFilters(): void {
    this.loadPage(1);
  }

  protected resetFilters(): void {
    this.filters.reset({ search: '', status: '', approvalStatus: '' });
    this.loadPage(1);
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    const f = this.filters.getRawValue();
    this.vendorsApi
      .listVendors({
        page,
        limit,
        search: f.search || undefined,
        status: (f.status || undefined) as VendorStatus | undefined,
        approvalStatus: (f.approvalStatus || undefined) as VendorApprovalStatus | undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.vendors);
          this.pagination.set(res.pagination);
        },
        error: (err) => {
          this.rows.set([]);
          void Swal.fire({
            icon: 'error',
            title: 'Could not load vendors',
            text: err?.error?.message ?? 'Unknown error',
          });
        },
      });
  }

  protected goPage(page: number): void {
    if (page < 1 || page > this.pagination().pages) return;
    this.loadPage(page);
  }

  protected confirmDelete(row: Vendor): void {
    void Swal.fire({
      title: 'Delete vendor?',
      html: `Remove <strong>${row.name}</strong> (${row.email})? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deletingId.set(row._id);
      this.vendorsApi
        .deleteVendor(row._id)
        .pipe(finalize(() => this.deletingId.set(null)))
        .subscribe({
          next: () => {
            void Swal.fire({ icon: 'success', title: 'Vendor deleted', timer: 1600, showConfirmButton: false });
            this.loadPage(this.pagination().page);
          },
          error: (err) => {
            void Swal.fire({
              icon: 'error',
              title: 'Delete failed',
              text: err?.error?.message ?? 'Unknown error',
            });
          },
        });
    });
  }
}
