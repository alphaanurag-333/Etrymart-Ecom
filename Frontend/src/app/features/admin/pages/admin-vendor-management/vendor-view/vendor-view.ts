import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { Vendor, VendorService } from '../../../../../core/services/admin-service/vendor.service';

@Component({
  selector: 'app-admin-vendor-view',
  imports: [CommonModule, RouterLink],
  templateUrl: './vendor-view.html',
  styleUrls: ['../../../admin.css'],
})
export class AdminVendorViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly vendors = inject(VendorService);

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
        }),
        switchMap((id) =>
          this.vendors.getVendorById(id).pipe(finalize(() => this.loading.set(false))),
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

  protected mediaSrc(path: string | null | undefined): string | null {
    return this.vendors.mediaUrl(path);
  }

  protected formatDate(iso: string | undefined | null): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
    } catch {
      return String(iso);
    }
  }
}
