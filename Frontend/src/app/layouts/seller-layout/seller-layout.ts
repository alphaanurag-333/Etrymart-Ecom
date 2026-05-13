import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SELLER_NAV } from '../../core/config/seller-nav.config';
import { AuthService } from '../../core/services/admin-service/auth.service';
import { Breadcrumb } from '../../shared/components/breadcrumb/breadcrumb';
import { SidebarMenu } from '../../shared/components/sidebar-menu/sidebar-menu';

@Component({
  selector: 'app-seller-layout',
  imports: [RouterOutlet, RouterLink, SidebarMenu, Breadcrumb],
  templateUrl: './seller-layout.html',
  styleUrls: ['../../../styles-seller.css'],
})
export class SellerLayout {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nav = SELLER_NAV;
  protected readonly year = new Date().getFullYear();
  protected readonly drawerOpen = signal(false);
  protected readonly userOpen = signal(false);
  protected readonly rail = signal(false);

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
    this.auth.logoutSeller();
    this.userOpen.set(false);
    void this.router.navigateByUrl('/seller/login');
  }
}
