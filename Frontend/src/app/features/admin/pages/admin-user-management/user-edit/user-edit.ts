import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  AppUserGender,
  AppUserStatus,
  UserService,
} from '../../../../../core/services/admin-service/user.service';

@Component({
  selector: 'app-admin-user-edit',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-edit.html',
  styleUrls: ['../../../admin.css'],
})
export class AdminUserEditPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(UserService);

  protected readonly userId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly statusOptions: AppUserStatus[] = ['active', 'inactive', 'blocked'];
  protected readonly genderOptions: AppUserGender[] = ['male', 'female', 'other'];

  protected readonly form = this.fb.nonNullable.group({
    status: this.fb.nonNullable.control<AppUserStatus>('active'),
    name: this.fb.nonNullable.control(''),
    email: this.fb.nonNullable.control(''),
    country: this.fb.nonNullable.control(''),
    state: this.fb.nonNullable.control(''),
    city: this.fb.nonNullable.control(''),
    pincode: this.fb.nonNullable.control(''),
    gender: this.fb.nonNullable.control<AppUserGender>('male'),
    phoneVerified: this.fb.nonNullable.control(false),
    isGuest: this.fb.nonNullable.control(false),
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => p.get('id')),
        filter((id): id is string => Boolean(id)),
        distinctUntilChanged(),
        tap((id) => {
          this.userId.set(id);
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((id) => this.usersApi.getUserById(id).pipe(finalize(() => this.loading.set(false)))),
      )
      .subscribe({
        next: (res) => this.patchForm(res.user),
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load user');
        },
      });
  }

  private patchForm(u: {
    status?: AppUserStatus;
    name?: string;
    email?: string;
    country?: string;
    state?: string;
    city?: string;
    pincode?: string;
    gender?: AppUserGender;
    phoneVerified?: boolean;
    isGuest?: boolean;
  }): void {
    this.form.patchValue({
      status: (u.status as AppUserStatus) ?? 'active',
      name: u.name ?? '',
      email: u.email ?? '',
      country: u.country ?? '',
      state: u.state ?? '',
      city: u.city ?? '',
      pincode: u.pincode ?? '',
      gender: (u.gender as AppUserGender) ?? 'male',
      phoneVerified: Boolean(u.phoneVerified),
      isGuest: Boolean(u.isGuest),
    });
  }

  protected submit(): void {
    const id = this.userId();
    if (!id) return;

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.usersApi
      .updateUser(id, {
        status: v.status,
        name: v.name,
        email: v.email || undefined,
        country: v.country,
        state: v.state,
        city: v.city,
        pincode: v.pincode,
        gender: v.gender,
        phoneVerified: v.phoneVerified,
        isGuest: v.isGuest,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: async () => {
          await Swal.fire({ icon: 'success', title: 'User updated', timer: 1400, showConfirmButton: false });
          void this.router.navigate(['/admin/users', id]);
        },
        error: (err) => {
          void Swal.fire({
            icon: 'error',
            title: 'Update failed',
            text: err?.error?.message ?? 'Unknown error',
          });
        },
      });
  }
}
