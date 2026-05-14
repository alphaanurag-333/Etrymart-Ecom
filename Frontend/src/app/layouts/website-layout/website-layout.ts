import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { fromEvent } from 'rxjs';
import { WEBSITE_NAV } from '../../core/config/website-nav.config';
import {
  selectBrandTitle,
  selectFooterLine,
  selectSocialFacebook,
  selectSocialInstagram,
  selectSocialLinkedin,
  selectSocialTwitter,
  selectStorefrontAddress,
  selectStorefrontEmail,
  selectStorefrontLogoUrl,
  selectStorefrontPhone,
  selectStorefrontTagline,
} from '../../store/app-config/app-config.selectors';
import { Breadcrumb } from '../../shared/components/breadcrumb/breadcrumb';
import { UserAuthService } from '../../core/services/user-service/auth.service';

@Component({
  selector: 'app-website-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Breadcrumb],
  templateUrl: './website-layout.html',
  styleUrls: ['../../../styles-website.css'],
})
export class WebsiteLayout {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly headerBar = viewChild<ElementRef<HTMLElement>>('headerBar');
  private readonly userAuth = inject(UserAuthService);

  protected readonly nav = WEBSITE_NAV;
  protected readonly mobileOpen = signal(false);
  protected readonly showBackTop = signal(false);

  protected readonly brandTitle = toSignal(this.store.select(selectBrandTitle), {
    initialValue: 'EtryMart',
  });
  protected readonly footerLine = toSignal(this.store.select(selectFooterLine), {
    initialValue: `© ${new Date().getFullYear()} EtryMart. All rights reserved.`,
  });
  protected readonly storefrontLogoUrl = toSignal(this.store.select(selectStorefrontLogoUrl), {
    initialValue: null as string | null,
  });
  protected readonly storefrontTagline = toSignal(this.store.select(selectStorefrontTagline), {
    initialValue: 'Your trusted marketplace for quality products.',
  });
  protected readonly storefrontPhone = toSignal(this.store.select(selectStorefrontPhone), {
    initialValue: null as string | null,
  });
  protected readonly storefrontEmail = toSignal(this.store.select(selectStorefrontEmail), {
    initialValue: null as string | null,
  });
  protected readonly storefrontAddress = toSignal(this.store.select(selectStorefrontAddress), {
    initialValue: null as string | null,
  });
  protected readonly socialFacebook = toSignal(this.store.select(selectSocialFacebook), {
    initialValue: null as string | null,
  });
  protected readonly socialInstagram = toSignal(this.store.select(selectSocialInstagram), {
    initialValue: null as string | null,
  });
  protected readonly socialTwitter = toSignal(this.store.select(selectSocialTwitter), {
    initialValue: null as string | null,
  });
  protected readonly socialLinkedin = toSignal(this.store.select(selectSocialLinkedin), {
    initialValue: null as string | null,
  });

  protected readonly isStorefrontAuth = this.userAuth.isAuthenticated;
  protected readonly isPhoneVerified = this.userAuth.isPhoneVerified;
  protected readonly customerLabel = computed(() => {
    const u = this.userAuth.customerUser();
    if (!u) return 'Profile';
    const name = u.name?.trim();
    if (name) return name;
    if (u.mobile) return u.mobile;
    return 'Profile';
  });

  protected readonly footerQuickLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ] as const;

  protected readonly footerServiceLinks = [
    { label: 'About us', path: '/about' },
    { label: 'Contact us', path: '/contact' },
    { label: 'Seller sign in', path: '/seller/login' },
    { label: 'Admin sign in', path: '/admin/login' },
  ] as const;

  constructor() {
    afterNextRender(() => {
      if (this.userAuth.isAuthenticated()) {
        this.userAuth.getMe().subscribe({ error: () => {} });
      }
    });

    fromEvent(this.document, 'click')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: Event) => {
        if (!this.mobileOpen()) return;
        const root = this.headerBar()?.nativeElement;
        if (!root) return;
        const target = event.target;
        if (target instanceof Node && !root.contains(target)) {
          this.mobileOpen.set(false);
        }
      });
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    this.showBackTop.set(window.scrollY > 360);
  }

  protected telHref(phone: string): string {
    return `tel:${phone.replace(/\s/g, '')}`;
  }

  protected toggleMobile(event?: Event): void {
    event?.stopPropagation();
    this.mobileOpen.update((v) => !v);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }

  protected logoutCustomer(): void {
    this.userAuth.logout();
    this.closeMobile();
  }

  protected scrollToTop(): void {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
