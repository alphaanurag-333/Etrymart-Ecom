import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ADMIN_NAV_GROUPS } from '../../core/config/admin-nav.config';
import { MEDIA_URL } from '../../core/config/api.config';
import { AuthService } from '../../core/services/admin-service/auth.service';
import { AppConfigActions } from '../../store/app-config/app-config.actions';
import {
  selectAdminLogoUrl,
  selectBrandTitle,
  selectFooterLine,
} from '../../store/app-config/app-config.selectors';
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
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly userMenuRoot = viewChild<ElementRef<HTMLElement>>('userMenuRoot');

  protected readonly navGroups = ADMIN_NAV_GROUPS;
  /** From NgRx app config (`app_name`). */
  protected readonly brandTitle = toSignal(this.store.select(selectBrandTitle), {
    initialValue: 'EtryMart',
  });
  /** Resolved `admin_logo` URL, or null for default gradient mark. */
  protected readonly brandLogoUrl = toSignal(this.store.select(selectAdminLogoUrl), {
    initialValue: null as string | null,
  });
  protected readonly footerLine = toSignal(this.store.select(selectFooterLine), {
    initialValue: `© ${new Date().getFullYear()} EtryMart. All rights reserved.`,
  });

  protected readonly drawerOpen = signal(false);
  /** Desktop (≥992px): hide in-flow sidebar when true; mobile uses `drawerOpen` overlay instead. */
  protected readonly sidebarCollapsed = signal(false);
  protected readonly userOpen = signal(false);
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
    this.store.dispatch(AppConfigActions.mergeAdmin());

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.drawerOpen.set(false);
        this.userOpen.set(false);
      });

    fromEvent(this.document, 'click')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!this.userOpen()) return;
        const root = this.userMenuRoot()?.nativeElement;
        if (!root) return;
        const target = event.target;
        if (target instanceof Node && !root.contains(target)) {
          this.userOpen.set(false);
        }
      });
  }

  protected toggleDrawer(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 992px)').matches) {
      this.sidebarCollapsed.update((v) => !v);
      return;
    }
    this.drawerOpen.update((v) => !v);
  }

  /** For `aria-expanded`: sidebar/drawer visually open. */
  protected navPanelExpanded(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    if (window.matchMedia('(min-width: 992px)').matches) {
      return !this.sidebarCollapsed();
    }
    return this.drawerOpen();
  }

  protected toggleUser(event?: Event): void {
    event?.stopPropagation();
    this.userOpen.update((v) => !v);
  }

  protected logout(): void {
    this.store.dispatch(AppConfigActions.resetAfterAdminLogout());
    this.auth.logoutAdmin();
    this.userOpen.set(false);
    void this.router.navigateByUrl('/admin/login');
  }
}
