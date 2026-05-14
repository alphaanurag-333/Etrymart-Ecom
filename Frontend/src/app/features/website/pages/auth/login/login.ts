import { isDevMode, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { finalize } from 'rxjs/operators';
import { selectBrandTitle } from '../../../../../store/app-config/app-config.selectors';
import { UserAuthService } from '../../../../../core/services/user-service/auth.service';

@Component({
  selector: 'app-website-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class WebsiteLoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly userAuth = inject(UserAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(Store);

  protected readonly brandTitle = toSignal(this.store.select(selectBrandTitle), {
    initialValue: 'EtryMart',
  });

  protected readonly isDev = isDevMode();
  protected readonly step = signal<1 | 2>(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly lastDevOtp = signal<string | null>(null);
  protected readonly showOtpPlain = signal(false);
  protected readonly resendIn = signal(0);

  private resendInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly form = this.fb.nonNullable.group({
    mobile: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(10)]),
    otp: this.fb.nonNullable.control(''),
    referralCode: this.fb.nonNullable.control(''),
    agreeTerms: this.fb.nonNullable.control(false, { validators: [Validators.requiredTrue] }),
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearResendInterval());
  }

  protected toggleOtpVisibility(): void {
    this.showOtpPlain.update((v) => !v);
  }

  protected sendOtp(options?: { isResend?: boolean }): void {
    if (!options?.isResend) {
      if (!this.form.controls.agreeTerms.value) {
        this.form.controls.agreeTerms.markAsTouched();
        this.error.set('Please accept the Terms & Conditions and Privacy Policy.');
        return;
      }
    }

    const mobile = this.form.controls.mobile.value.trim().replace(/\D/g, '');
    if (mobile.length < 10) {
      this.error.set('Enter a valid mobile number (at least 10 digits).');
      return;
    }
    this.form.controls.mobile.setValue(mobile);
    this.error.set(null);
    this.loading.set(true);
    if (!options?.isResend) {
      this.lastDevOtp.set(null);
    }
    this.userAuth
      .sendOtp({ mobile })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          if (res.devOtp) {
            this.lastDevOtp.set(res.devOtp);
          }
          this.step.set(2);
          this.startResendCooldown();
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Could not send OTP.');
        },
      });
  }

  protected resendOtp(): void {
    if (this.resendIn() > 0 || this.loading()) return;
    this.sendOtp({ isResend: true });
  }

  protected verifyOtp(): void {
    const mobile = this.form.controls.mobile.value.trim();
    const otp = this.form.controls.otp.value.trim();
    if (!/^\d{6}$/.test(otp)) {
      this.error.set('Enter the 6-digit code.');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    const ref = this.form.controls.referralCode.value.trim();
    this.userAuth
      .verifyOtp({
        mobile,
        otp,
        referralCode: ref || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          const ret = this.route.snapshot.queryParamMap.get('returnUrl');
          const url = ret && ret.startsWith('/') && !ret.startsWith('//') ? ret : '/';
          void this.router.navigateByUrl(url);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Invalid or expired code.');
        },
      });
  }

  protected backToMobile(): void {
    this.clearResendInterval();
    this.resendIn.set(0);
    this.step.set(1);
    this.form.controls.otp.setValue('');
    this.error.set(null);
  }

  private startResendCooldown(): void {
    this.clearResendInterval();
    this.resendIn.set(60);
    this.resendInterval = setInterval(() => {
      this.resendIn.update((s) => {
        if (s <= 1) {
          this.clearResendInterval();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  private clearResendInterval(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }
}
