import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  AppUser,
  AppUserStatus,
  UserService,
} from '../../../../../core/services/admin-service/user.service';

@Component({
  selector: 'app-admin-user-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-list.html',
  styleUrls: ['../../../admin.css'],
})
export class AdminUserListPage {
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(UserService);

  protected readonly rows = signal<AppUser[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);

  protected readonly statusOptions: AppUserStatus[] = ['active', 'inactive', 'blocked'];

  protected readonly filters = this.fb.group({
    search: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<AppUserStatus | ''>(''),
    phoneVerified: this.fb.nonNullable.control<'true' | 'false' | ''>(''),
    isGuest: this.fb.nonNullable.control<'true' | 'false' | ''>(''),
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
    this.filters.reset({ search: '', status: '', phoneVerified: '', isGuest: '' });
    this.loadPage(1);
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    const f = this.filters.getRawValue();
    const phoneVerified =
      f.phoneVerified === 'true' ? true : f.phoneVerified === 'false' ? false : undefined;
    const isGuest = f.isGuest === 'true' ? true : f.isGuest === 'false' ? false : undefined;

    this.usersApi
      .listUsers({
        page,
        limit,
        search: f.search || undefined,
        status: (f.status || undefined) as AppUserStatus | undefined,
        phoneVerified,
        isGuest,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.users ?? []);
          this.pagination.set(res.pagination);
        },
        error: (err) => {
          this.rows.set([]);
          void Swal.fire({
            icon: 'error',
            title: 'Could not load users',
            text: err?.error?.message ?? 'Unknown error',
          });
        },
      });
  }

  protected goPage(page: number): void {
    if (page < 1 || page > this.pagination().pages) return;
    this.loadPage(page);
  }
}
