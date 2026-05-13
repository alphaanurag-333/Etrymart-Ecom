import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, finalize, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import {
  AppConfig,
  AppConfigService,
  AppPaymentMethodType,
} from '../../../../core/services/admin-service/app-config.service';
import { MEDIA_URL } from '../../../../core/config/api.config';
import { AppConfigActions } from '../../../../store/app-config/app-config.actions';

export type AppConfigTabId = 'app' | 'media' | 'location' | 'social' | 'payment';

@Component({
  selector: 'app-admin-app-config',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-app-config.html',
  styleUrls: ['./admin-app-config.css', '../../admin.css'],
})
export class AdminAppConfigPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly appConfig = inject(AppConfigService);
  private readonly store = inject(Store);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly activeTab = signal<AppConfigTabId>('app');
  protected readonly hasExistingConfig = signal(true);

  /** Local preview URLs for chosen files (revoked on clear). */
  protected readonly adminLogoBlob = signal<string | null>(null);
  protected readonly userLogoBlob = signal<string | null>(null);
  protected readonly faviconBlob = signal<string | null>(null);
  protected readonly websiteThemeLogoBlob = signal<string | null>(null);
  /** Pending uploads (multipart `*_file` fields). */
  protected readonly adminLogoFile = signal<File | null>(null);
  protected readonly userLogoFile = signal<File | null>(null);
  protected readonly faviconFile = signal<File | null>(null);
  protected readonly websiteThemeLogoFile = signal<File | null>(null);
  private objectUrls: string[] = [];

  protected readonly tabs: { id: AppConfigTabId; label: string }[] = [
    { id: 'app', label: 'App config' },
    { id: 'media', label: 'Media' },
    { id: 'location', label: 'Location' },
    { id: 'social', label: 'Social' },
    { id: 'payment', label: 'Payment methods' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    app_name: ['', [Validators.required, Validators.maxLength(100)]],
    vendorCommission: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    app_email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    app_mobile: ['', [Validators.required, Validators.maxLength(20)]],
    app_detail: ['', [Validators.maxLength(160)]],
    app_footer_text: ['', [Validators.required, Validators.maxLength(180)]],
    admin_logo: [''],
    user_logo: [''],
    favicon: [''],
    latitude: ['', [Validators.maxLength(20)]],
    longitude: ['', [Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(300)]],
    facebook: ['', [Validators.maxLength(200)]],
    twitter: ['', [Validators.maxLength(200)]],
    instagram: ['', [Validators.maxLength(200)]],
    linkedin: ['', [Validators.maxLength(200)]],
    payCod: [true],
    payOnline: [true],
    payWallet: [false],
    website_theme_logo: ['', [Validators.maxLength(500)]],
    free_coin: [0, [Validators.required, Validators.min(0), Validators.max(999999999)]],
    defaultTheme: [false],
    websiteTheme: ['', [Validators.maxLength(120)]],
    headerTextColor: ['', [Validators.maxLength(32)]],
    app_details: ['', [Validators.maxLength(50000)]],
  });

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    for (const u of this.objectUrls) {
      URL.revokeObjectURL(u);
    }
  }

  protected setTab(tab: AppConfigTabId): void {
    this.activeTab.set(tab);
  }

  protected assetUrl(path: string | null | undefined): string {
    const p = String(path ?? '').trim();
    if (!p) return '';
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
    return `${MEDIA_URL}${p.startsWith('/') ? '' : '/'}${p}`;
  }

  protected mapPreviewSrc(): SafeResourceUrl | null {
    const lat = parseFloat(String(this.form.controls.latitude.value).trim());
    const lng = parseFloat(String(this.form.controls.longitude.value).trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected onMediaFile(which: 'admin' | 'user' | 'favicon' | 'themeLogo', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.objectUrls.push(url);
    if (which === 'admin') {
      const prev = this.adminLogoBlob();
      if (prev) URL.revokeObjectURL(prev);
      this.adminLogoFile.set(file);
      this.adminLogoBlob.set(url);
    }
    if (which === 'user') {
      const prev = this.userLogoBlob();
      if (prev) URL.revokeObjectURL(prev);
      this.userLogoFile.set(file);
      this.userLogoBlob.set(url);
    }
    if (which === 'favicon') {
      const prev = this.faviconBlob();
      if (prev) URL.revokeObjectURL(prev);
      this.faviconFile.set(file);
      this.faviconBlob.set(url);
    }
    if (which === 'themeLogo') {
      const prev = this.websiteThemeLogoBlob();
      if (prev) URL.revokeObjectURL(prev);
      this.websiteThemeLogoFile.set(file);
      this.websiteThemeLogoBlob.set(url);
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void Swal.fire({
        icon: 'warning',
        title: 'Check required fields',
        text: 'Fix errors on all tabs, then save again.',
      });
      return;
    }
    const raw = this.form.getRawValue();
    const payment_methods = (
      [
        ['cod', raw.payCod],
        ['online', raw.payOnline],
        ['wallet', raw.payWallet],
      ] as const
    ).map(([type, isActive]) => ({
      type: type as AppPaymentMethodType,
      isActive,
    }));
    const commissions = [{ type: 'Vendor' as const, percentage: Number(raw.vendorCommission) }];

    const hasFiles = !!(
      this.adminLogoFile() ||
      this.userLogoFile() ||
      this.faviconFile() ||
      this.websiteThemeLogoFile()
    );

    this.saving.set(true);
    const req$ = hasFiles
      ? this.appConfig.patchAppConfig(this.buildAppConfigFormData(raw, payment_methods, commissions))
      : this.appConfig.patchAppConfig({
          app_name: raw.app_name.trim(),
          app_email: raw.app_email.trim().toLowerCase(),
          app_mobile: raw.app_mobile.trim(),
          app_detail: raw.app_detail.trim(),
          app_footer_text: raw.app_footer_text.trim(),
          admin_logo: raw.admin_logo.trim(),
          user_logo: raw.user_logo.trim(),
          favicon: raw.favicon.trim(),
          website_theme_logo: raw.website_theme_logo.trim(),
          latitude: raw.latitude.trim(),
          longitude: raw.longitude.trim(),
          address: raw.address.trim(),
          facebook: raw.facebook.trim(),
          twitter: raw.twitter.trim(),
          instagram: raw.instagram.trim(),
          linkedin: raw.linkedin.trim(),
          app_details: raw.app_details,
          free_coin: Number(raw.free_coin),
          defaultTheme: raw.defaultTheme,
          websiteTheme: raw.websiteTheme.trim(),
          headerTextColor: raw.headerTextColor.trim(),
          payment_methods,
          commissions,
        });

    req$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          this.hasExistingConfig.set(true);
          this.clearPendingUploads();
          this.applyConfig(res.data);
          this.store.dispatch(AppConfigActions.patchFromSettings({ config: res.data }));
          void Swal.fire({ icon: 'success', title: 'Saved', timer: 1600, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) =>
          void Swal.fire({
            icon: 'error',
            title: 'Save failed',
            text: err?.error?.message ?? 'Could not save settings',
          }),
      });
  }

  private buildAppConfigFormData(
    raw: ReturnType<AdminAppConfigPage['form']['getRawValue']>,
    payment_methods: Array<{ type: AppPaymentMethodType; isActive: boolean }>,
    commissions: Array<{ type: 'Vendor'; percentage: number }>,
  ): FormData {
    const fd = new FormData();
    const t = (k: string, v: string) => fd.append(k, v);
    t('app_name', raw.app_name.trim());
    t('app_email', raw.app_email.trim().toLowerCase());
    t('app_mobile', raw.app_mobile.trim());
    t('app_detail', raw.app_detail.trim());
    t('app_footer_text', raw.app_footer_text.trim());
    t('admin_logo', raw.admin_logo.trim());
    t('user_logo', raw.user_logo.trim());
    t('favicon', raw.favicon.trim());
    t('website_theme_logo', raw.website_theme_logo.trim());
    t('latitude', raw.latitude.trim());
    t('longitude', raw.longitude.trim());
    t('address', raw.address.trim());
    t('facebook', raw.facebook.trim());
    t('twitter', raw.twitter.trim());
    t('instagram', raw.instagram.trim());
    t('linkedin', raw.linkedin.trim());
    t('app_details', raw.app_details);
    t('free_coin', String(Number(raw.free_coin)));
    t('defaultTheme', raw.defaultTheme ? 'true' : 'false');
    t('websiteTheme', raw.websiteTheme.trim());
    t('headerTextColor', raw.headerTextColor.trim());
    fd.append('payment_methods', JSON.stringify(payment_methods));
    fd.append('commissions', JSON.stringify(commissions));
    const af = this.adminLogoFile();
    if (af) fd.append('admin_logo_file', af, af.name);
    const uf = this.userLogoFile();
    if (uf) fd.append('user_logo_file', uf, uf.name);
    const ff = this.faviconFile();
    if (ff) fd.append('favicon_file', ff, ff.name);
    const tf = this.websiteThemeLogoFile();
    if (tf) fd.append('website_theme_logo_file', tf, tf.name);
    return fd;
  }

  private clearPendingUploads(): void {
    for (const url of [
      this.adminLogoBlob(),
      this.userLogoBlob(),
      this.faviconBlob(),
      this.websiteThemeLogoBlob(),
    ]) {
      if (url) URL.revokeObjectURL(url);
    }
    this.adminLogoFile.set(null);
    this.userLogoFile.set(null);
    this.faviconFile.set(null);
    this.websiteThemeLogoFile.set(null);
    this.adminLogoBlob.set(null);
    this.userLogoBlob.set(null);
    this.faviconBlob.set(null);
    this.websiteThemeLogoBlob.set(null);
  }

  private load(): void {
    this.loading.set(true);
    this.appConfig
      .getAppConfig()
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) return of(undefined);
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          if (res) {
            this.hasExistingConfig.set(true);
            this.applyConfig(res.data);
          } else {
            this.hasExistingConfig.set(false);
            this.applyDefaults();
          }
        },
        error: (err: HttpErrorResponse) => {
          void Swal.fire({
            icon: 'error',
            title: 'Load failed',
            text: err?.error?.message ?? 'Could not load app config',
          });
          this.hasExistingConfig.set(false);
          this.applyDefaults();
        },
      });
  }

  private applyDefaults(): void {
    this.clearPendingUploads();
    this.form.reset({
      app_name: '',
      vendorCommission: 0,
      app_email: '',
      app_mobile: '',
      app_detail: '',
      app_footer_text: '',
      admin_logo: '',
      user_logo: '',
      favicon: '',
      latitude: '',
      longitude: '',
      address: '',
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: '',
      payCod: true,
      payOnline: true,
      payWallet: false,
      website_theme_logo: '',
      free_coin: 0,
      defaultTheme: false,
      websiteTheme: '',
      headerTextColor: '',
      app_details: '',
    });
  }

  private applyConfig(c: AppConfig): void {
    this.clearPendingUploads();

    const payActive = (t: AppPaymentMethodType, fallback: boolean): boolean => {
      const row = c.payment_methods?.find((p) => p.type === t);
      if (row === undefined) return fallback;
      return !!row.isActive;
    };

    const vendorPct = c.commissions?.find((x) => x.type === 'Vendor')?.percentage ?? 0;

    this.form.patchValue({
      app_name: c.app_name ?? '',
      vendorCommission: vendorPct,
      app_email: c.app_email ?? '',
      app_mobile: c.app_mobile ?? '',
      app_detail: c.app_detail ?? '',
      app_footer_text: c.app_footer_text ?? '',
      admin_logo: c.admin_logo ?? '',
      user_logo: c.user_logo ?? '',
      favicon: c.favicon ?? '',
      latitude: c.latitude ?? '',
      longitude: c.longitude ?? '',
      address: c.address ?? '',
      facebook: c.facebook ?? '',
      twitter: c.twitter ?? '',
      instagram: c.instagram ?? '',
      linkedin: c.linkedin ?? '',
      payCod: payActive('cod', true),
      payOnline: payActive('online', true),
      payWallet: payActive('wallet', false),
      website_theme_logo: c.website_theme_logo ?? '',
      free_coin: c.free_coin ?? 0,
      defaultTheme: c.defaultTheme ?? false,
      websiteTheme: c.websiteTheme ?? '',
      headerTextColor: c.headerTextColor ?? '',
      app_details: c.app_details ?? '',
    });
  }
}
