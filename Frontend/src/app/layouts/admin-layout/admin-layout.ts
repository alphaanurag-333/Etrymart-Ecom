import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ADMIN_NAV_GROUPS } from '../../core/config/admin-nav.config';
import { MEDIA_URL } from '../../core/config/api.config';
import { AuthService } from '../../core/services/admin-service/auth.service';
import { Breadcrumb } from '../../shared/components/breadcrumb/breadcrumb';
import { SidebarMenu } from '../../shared/components/sidebar-menu/sidebar-menu';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, SidebarMenu, Breadcrumb],
  templateUrl: './admin-layout.html',
  styleUrls: ['../../../styles-admin.css'],
})
export class AdminLayout {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navGroups = ADMIN_NAV_GROUPS;
  protected readonly year = new Date().getFullYear();
  protected readonly drawerOpen = signal(false);
  protected readonly userOpen = signal(false);
  protected readonly rail = signal(false);
  protected readonly adminUser = this.auth.adminUser;
  protected readonly adminInitial = computed(() => {
    const name = this.adminUser()?.name?.trim();
    return name ? name.charAt(0).toUpperCase() : 'A';
  });
  protected readonly adminProfileImageUrl = computed(() => {
    const image = this.adminUser()?.profileImage;
    if (!image) return null;
    return image.startsWith('http') ? image : `${MEDIA_URL}${image}`;
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.drawerOpen.set(false);
        this.userOpen.set(false);
      });
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
  }

  protected toggleUser(): void {
    this.userOpen.update((v) => !v);
  }

  protected toggleRail(): void {
    this.rail.update((v) => !v);
  }

  protected logout(): void {
    this.auth.logoutAdmin();
    this.userOpen.set(false);
    void this.router.navigateByUrl('/admin/login');
  }
}
