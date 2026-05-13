import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { MEDIA_URL } from '../../../../core/config/api.config';
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
  protected readonly selectedProfileImage = signal<File | null>(null);
  protected readonly selectedProfileImagePreview = signal<string | null>(null);
  protected readonly adminUser = this.auth.adminUser;

  protected readonly adminInitial = computed(() => {
    const name = this.adminUser()?.name?.trim();
    return name ? name.charAt(0).toUpperCase() : 'A';
  });

  protected readonly profileImageUrl = computed(() => {
    const preview = this.selectedProfileImagePreview();
    if (preview) return preview;

    const image = this.adminUser()?.profileImage;
    if (!image) return null;
    return image.startsWith('http') ? image : `${MEDIA_URL}${image}`;
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

    if (this.profileForm.invalid || this.savingDetails()) return;

    const { name, phone } = this.profileForm.getRawValue();
    const selectedImage = this.selectedProfileImage();
    const profileUpdate = {
      name,
      phone: phone || null,
      ...(selectedImage ? { profileImage: selectedImage } : {}),
    };

    this.savingDetails.set(true);
    this.auth
      .updateAdminProfile(profileUpdate)
      .pipe(finalize(() => this.savingDetails.set(false)))
      .subscribe({
        next: (response) => {
          this.clearSelectedProfileImage();
          void Swal.fire({
            icon: 'success',
            title: 'Profile updated',
            text: response.message || 'Profile updated successfully.',
            timer: 1400,
            showConfirmButton: false,
          });
        },
        error: (error: unknown) => {
          void this.showError('Profile update failed', this.getErrorMessage(error));
        },
      });
  }

  protected onProfileImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      void this.showError('Invalid file', 'Please select a valid image file.');
      return;
    }

    this.clearSelectedProfileImage();
    this.selectedProfileImage.set(file);
    this.selectedProfileImagePreview.set(URL.createObjectURL(file));
  }

  protected submitPassword(): void {
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid || this.savingPassword()) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      void this.showError(
        'Password mismatch',
        'New password and confirm password must match.',
      );
      return;
    }

    this.savingPassword.set(true);
    this.auth
      .changeAdminPassword({ currentPassword, newPassword })
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: (response) => {
          this.passwordForm.reset();
          void Swal.fire({
            icon: 'success',
            title: 'Password updated',
            text: response.message || 'Password updated successfully.',
            timer: 1400,
            showConfirmButton: false,
          });
        },
        error: (error: unknown) => {
          void this.showError('Password update failed', this.getErrorMessage(error));
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

  private showError(title: string, text: string): Promise<unknown> {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#f59e0b',
    });
  }

  private clearSelectedProfileImage(): void {
    const preview = this.selectedProfileImagePreview();
    if (preview) URL.revokeObjectURL(preview);

    this.selectedProfileImage.set(null);
    this.selectedProfileImagePreview.set(null);
  }
}
