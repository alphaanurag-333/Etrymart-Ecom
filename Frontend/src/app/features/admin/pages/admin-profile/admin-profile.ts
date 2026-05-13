import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/admin-service/auth.service';

type ProfileTab = 'details' | 'password';

@Component({
  selector: 'app-admin-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-profile.html',
  styleUrls: ['../../admin.css'],
})
export class AdminProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly activeTab = signal<ProfileTab>('details');
  protected readonly savingDetails = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly profileMessage = signal<string | null>(null);
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordMessage = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly adminUser = this.auth.adminUser;

  protected readonly adminInitial = computed(() => {
    const name = this.adminUser()?.name?.trim();
    return name ? name.charAt(0).toUpperCase() : 'A';
  });

  protected readonly profileImageUrl = computed(() => {
    const image = this.adminUser()?.profileImage;
    if (!image) return null;
    return image.startsWith('http') ? image : `${this.auth.adminApiOrigin}${image}`;
  });

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    phone: [''],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const user = this.adminUser();
      if (!user) return;

      this.profileForm.patchValue(
        {
          name: user.name ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  protected setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  protected saveActiveTab(): void {
    if (this.activeTab() === 'password') {
      this.submitPassword();
      return;
    }

    this.submitProfile();
  }

  protected submitProfile(): void {
    this.profileForm.markAllAsTouched();
    this.profileMessage.set(null);
    this.profileError.set(null);

    if (this.profileForm.invalid || this.savingDetails()) return;

    const { name, phone } = this.profileForm.getRawValue();
    this.savingDetails.set(true);
    this.auth
      .updateAdminProfile({ name, phone: phone || null })
      .pipe(finalize(() => this.savingDetails.set(false)))
      .subscribe({
        next: (response) => {
          this.profileMessage.set(response.message || 'Profile updated successfully.');
        },
        error: (error: unknown) => {
          this.profileError.set(this.getErrorMessage(error));
        },
      });
  }

  protected submitPassword(): void {
    this.passwordForm.markAllAsTouched();
    this.passwordMessage.set(null);
    this.passwordError.set(null);

    if (this.passwordForm.invalid || this.savingPassword()) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordError.set('New password and confirm password must match.');
      return;
    }

    this.savingPassword.set(true);
    this.auth
      .changeAdminPassword({ currentPassword, newPassword })
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: (response) => {
          this.passwordForm.reset();
          this.passwordMessage.set(response.message || 'Password updated successfully.');
        },
        error: (error: unknown) => {
          this.passwordError.set(this.getErrorMessage(error));
        },
      });
  }

  protected get name() {
    return this.profileForm.controls.name;
  }

  protected get currentPassword() {
    return this.passwordForm.controls.currentPassword;
  }

  protected get newPassword() {
    return this.passwordForm.controls.newPassword;
  }

  protected get confirmPassword() {
    return this.passwordForm.controls.confirmPassword;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'Something went wrong. Please try again.';
    }
    if (error instanceof Error) return error.message;
    return 'Something went wrong. Please try again.';
  }
}
