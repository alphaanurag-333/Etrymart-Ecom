import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { MEDIA_URL } from '../../../../../core/config/api.config';
import { AppUser, UserService } from '../../../../../core/services/admin-service/user.service';

@Component({
  selector: 'app-admin-user-view',
  imports: [CommonModule, RouterLink],
  templateUrl: './user-view.html',
  styleUrls: ['../../../admin.css'],
})
export class AdminUserViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly usersApi = inject(UserService);

  protected readonly user = signal<AppUser | null>(null);
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
        switchMap((id) => this.usersApi.getUserById(id).pipe(finalize(() => this.loading.set(false)))),
      )
      .subscribe({
        next: (res) => this.user.set(res.user),
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load user');
          this.user.set(null);
        },
      });
  }

  protected mediaSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : `${MEDIA_URL}${path}`;
  }

  protected formatDate(iso: string | undefined | null): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      );
    } catch {
      return String(iso);
    }
  }

  protected referralCount(u: AppUser): number {
    return u.referrals?.length ?? 0;
  }
}
