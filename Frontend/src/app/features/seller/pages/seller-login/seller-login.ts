import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/admin-service/auth.service';

@Component({
  selector: 'app-seller-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-screen">
      <div class="auth-card card shadow-sm border-0 rounded-4 p-4 p-md-5">
        <div class="auth-brand">
          <span class="panel-brand__mark panel-brand__mark--seller"></span>
          <div>
            <div class="heading-3">Seller sign in</div>
            <p class="text-muted text-sm mb-0">Session-based stub — replace with OAuth or OTP.</p>
          </div>
        </div>

        <form class="form-stack mt-4" [formGroup]="form" (ngSubmit)="submit()">
          <div class="mb-3">
            <label class="form-label" for="s-email">Email</label>
            <input
              id="s-email"
              class="form-control"
              type="email"
              formControlName="email"
              autocomplete="username"
            />
          </div>
          <div class="mb-3">
            <label class="form-label" for="s-pass">Password</label>
            <input
              id="s-pass"
              class="form-control"
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
          </div>
          <button class="btn btn-warning fw-semibold w-100" type="submit" [disabled]="form.invalid">
            Continue
          </button>
        </form>

        <p class="text-center text-sm text-muted mt-4 mb-0">
          <a routerLink="/" class="link">Back to website</a>
        </p>
      </div>
    </div>
  `,
})
export class SellerLoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['seller@etrymart.local', [Validators.required, Validators.email]],
    password: ['anything', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.auth.loginSeller();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/seller';
    void this.router.navigateByUrl(returnUrl);
  }
}
