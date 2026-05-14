import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { finalize } from 'rxjs/operators';
import { MEDIA_URL } from '../../../../../core/config/api.config';
import { selectBrandTitle } from '../../../../../store/app-config/app-config.selectors';
import {
  CustomerGender,
  CustomerUser,
  UserAuthService,
} from '../../../../../core/services/user-service/auth.service';

/** Region dropdown data (extend as needed). */
const REGION_TREE: Record<string, Record<string, string[]>> = {
  India: {
    'Madhya Pradesh': ['Gwalior', 'Indore', 'Bhopal', 'Jabalpur', 'Ujjain'],
    Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
    Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru'],
    Delhi: ['New Delhi'],
  },
};

const COUNTRIES = Object.keys(REGION_TREE).sort();

@Component({
  selector: 'app-website-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class WebsiteProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly userAuth = inject(UserAuthService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  protected readonly brandTitle = toSignal(this.store.select(selectBrandTitle), {
    initialValue: 'EtryMart',
  });

  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('avatarFile');

  protected readonly user = signal<CustomerUser | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);

  protected readonly countries = COUNTRIES;
  protected readonly genders: CustomerGender[] = ['male', 'female', 'other'];

  protected readonly states = signal<string[]>([]);
  protected readonly cities = signal<string[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: [{ value: '', disabled: true }],
    country: ['India', Validators.required],
    state: ['', Validators.required],
    city: ['', Validators.required],
    pincode: ['', [Validators.pattern(/^(\d{4,10})?$/)]],
    gender: this.fb.nonNullable.control<CustomerGender>('male', Validators.required),
  });

  constructor() {
    this.userAuth
      .getMe()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.applyUser(res.user),
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Could not load profile.');
          const u = this.userAuth.customerUser();
          if (u) this.applyUser(u);
        },
      });
  }

  protected mediaSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : `${MEDIA_URL}${path}`;
  }

  protected totalTryCoins(u: CustomerUser | null): number {
    return Number(u?.wallet_amount ?? 0);
  }

  protected earnedCoins(u: CustomerUser | null): number {
    return Number(u?.total_referral_coins ?? 0);
  }

  protected dailyCoins(u: CustomerUser | null): number {
    return Number(u?.daily_coins?.coins ?? 0);
  }

  protected displaySummary(u: CustomerUser): string {
    const n = u.name?.trim();
    if (n) return n;
    return u.mobile ?? 'Member';
  }

  protected onCountryChange(): void {
    const c = this.form.controls.country.value;
    const tree = REGION_TREE[c] ?? {};
    const st = Object.keys(tree).sort();
    this.states.set(st);
    const curState = this.form.controls.state.value;
    const nextState = curState && st.includes(curState) ? curState : (st[0] ?? '');
    this.form.patchValue({ state: nextState, city: '' }, { emitEvent: false });
    this.refreshCities();
  }

  protected onStateChange(): void {
    this.refreshCities();
  }

  protected pickAvatar(): void {
    this.fileInput()?.nativeElement.click();
  }

  /** Local preview only; wire to an upload API later to persist. */
  protected onAvatarFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      this.avatarPreview.set(url);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected cancelEdit(): void {
    const u = this.user();
    if (u) this.applyUser(u);
    this.avatarPreview.set(null);
    this.success.set(null);
    this.error.set(null);
  }

  protected saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    const v = this.form.getRawValue();
    const pin = v.pincode.trim();
    this.userAuth
      .updateMe({
        name: v.name.trim(),
        email: v.email.trim().toLowerCase(),
        country: v.country,
        state: v.state,
        city: v.city,
        pincode: pin || undefined,
        gender: v.gender,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          this.applyUser(res.user);
          this.success.set('Profile updated successfully.');
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Update failed.');
        },
      });
  }

  protected signOut(): void {
    this.userAuth.logout();
    void this.router.navigateByUrl('/');
  }

  private applyUser(u: CustomerUser): void {
    this.user.set(u);
    const country = u.country && REGION_TREE[u.country] ? u.country : 'India';
    const tree = REGION_TREE[country] ?? {};
    const stList = Object.keys(tree).sort();
    this.states.set(stList);
    const state = u.state && stList.includes(u.state) ? u.state : (stList[0] ?? '');
    const citiesList = [...(tree[state] ?? [])].sort();
    this.cities.set(citiesList);
    const city = u.city && citiesList.includes(u.city) ? u.city : (citiesList[0] ?? '');

    this.form.patchValue(
      {
        name: u.name ?? '',
        email: u.email ?? '',
        country,
        state,
        city,
        pincode: u.pincode ?? '',
        gender: (u.gender as CustomerGender) ?? 'male',
      },
      { emitEvent: false },
    );
    this.form.controls.mobile.setValue(u.mobile ?? '');
  }

  private refreshCities(): void {
    const c = this.form.controls.country.value;
    const s = this.form.controls.state.value;
    const list = [...(REGION_TREE[c]?.[s] ?? [])].sort();
    this.cities.set(list);
    const cur = this.form.controls.city.value;
    if (!list.includes(cur)) {
      this.form.patchValue({ city: list[0] ?? '' }, { emitEvent: false });
    }
  }
}
