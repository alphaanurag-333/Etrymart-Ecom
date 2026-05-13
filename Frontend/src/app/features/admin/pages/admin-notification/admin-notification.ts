import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { MEDIA_URL } from '../../../../core/config/api.config';
import {
  NotificationAudience,
  NotificationPayload,
  NotificationService,
  PushNotification,
} from '../../../../core/services/admin-service/notification.service';
import { CategoryStatus } from '../../../../core/services/admin-service/category.service';
import { showStatusToggleSuccessModal } from '../../../../core/utils/status-toggle-swal';

type AudienceTab = {
  value: NotificationAudience;
  label: string;
  icon: string;
};

const AUDIENCE_TABS: AudienceTab[] = [
  { value: 'users', label: 'Users', icon: 'groups' },
  { value: 'vendors', label: 'Vendors', icon: 'storefront' },
  { value: 'all', label: 'All Users', icon: 'campaign' },
];

@Component({
  selector: 'app-admin-notification',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './admin-notification.html',
  styleUrls: ['../../admin.css'],
})
export class AdminNotificationPage {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageFileInput = viewChild<ElementRef<HTMLInputElement>>('imageFileInput');

  protected readonly tabs = AUDIENCE_TABS;
  protected readonly activeAudience = signal<NotificationAudience>('users');
  protected readonly listAudience = signal<NotificationAudience>('users');
  protected readonly rows = signal<PushNotification[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingImagePath = signal<string | null>(null);
  protected readonly pickedImagePreviewUrl = signal<string | null>(null);
  protected readonly editingTitle = signal('EtryMart Notification');

  protected readonly form = this.fb.group({
    message: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(1000)]),
    imageFile: this.fb.control<File | null>(null),
  });

  constructor() {
    this.loadPage(1);
    this.destroyRef.onDestroy(() => this.revokePickedImagePreview());
  }

  protected get messageLength(): number {
    return this.form.controls.message.value.length;
  }

  protected sendButtonLabel(): string {
    const label = this.tabs.find((tab) => tab.value === this.activeAudience())?.label ?? 'Users';
    return this.editingId() ? 'Update Notification' : `Send to ${label}`;
  }

  protected setAudience(audience: NotificationAudience): void {
    this.activeAudience.set(audience);
  }

  protected setListAudience(audience: NotificationAudience): void {
    this.listAudience.set(audience);
    this.loadPage(1);
  }

  protected imageSrc(image: string | null | undefined): string | null {
    if (!image) return null;
    return image.startsWith('http') ? image : `${MEDIA_URL}${image}`;
  }

  protected formImagePreviewUrl(): string | null {
    const picked = this.pickedImagePreviewUrl();
    if (picked) return picked;
    return this.imageSrc(this.editingImagePath());
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.revokePickedImagePreview();
    this.form.patchValue({ imageFile: file });
    if (file) {
      this.pickedImagePreviewUrl.set(URL.createObjectURL(file));
    }
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    this.notifications
      .listNotifications({ page, limit, audience: this.listAudience() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.notifications);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load notifications'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingId();
    const { message, imageFile } = this.form.getRawValue();
    const payload: NotificationPayload = {
      title: this.editingTitle(),
      description: message.trim(),
      audience: this.activeAudience(),
      status: 'active',
    };
    if (imageFile instanceof File) {
      payload.image = imageFile;
    }

    this.saving.set(true);
    const req = id
      ? this.notifications.updateNotification(id, payload)
      : this.notifications.createNotification(payload);
    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        void Swal.fire({
          icon: 'success',
          title: id ? 'Notification updated' : 'Notification sent',
          text: res.push
            ? `Sent: ${res.push.successCount}, Failed: ${res.push.failureCount}`
            : undefined,
          timer: 1800,
          showConfirmButton: false,
        });
        this.cancelEdit();
        this.listAudience.set(this.activeAudience());
        this.loadPage(1);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Request failed'),
    });
  }

  protected edit(row: PushNotification): void {
    this.revokePickedImagePreview();
    this.editingId.set(row._id);
    this.editingTitle.set(row.title || 'EtryMart Notification');
    this.editingImagePath.set(row.image ?? null);
    this.activeAudience.set(row.audience ?? 'users');
    this.form.reset({
      message: row.description,
      imageFile: null,
    });
    this.clearImageFileInput();
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editingTitle.set('EtryMart Notification');
    this.editingImagePath.set(null);
    this.revokePickedImagePreview();
    this.form.reset({
      message: '',
      imageFile: null,
    });
    this.clearImageFileInput();
  }

  protected view(row: PushNotification): void {
    void Swal.fire({
      title: row.title || 'Notification',
      text: row.description,
      imageUrl: this.imageSrc(row.image) ?? undefined,
      imageAlt: row.title,
      confirmButtonColor: '#0ea5e9',
    });
  }

  protected resend(row: PushNotification): void {
    this.notifications.resendNotification(row._id, row.audience ?? this.listAudience()).subscribe({
      next: (res) => {
        void Swal.fire({
          icon: 'success',
          title: 'Notification resent',
          text: res.push ? `Sent: ${res.push.successCount}, Failed: ${res.push.failureCount}` : undefined,
          timer: 1800,
          showConfirmButton: false,
        });
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Resend failed'),
    });
  }

  protected async delete(row: PushNotification): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete notification?',
      text: 'This notification will be removed from the list.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    this.notifications.deleteNotification(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: PushNotification, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next: CategoryStatus = input.checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.notifications.updateNotification(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((item) => (item._id === row._id ? { ...item, status: next } : item)));
        showStatusToggleSuccessModal('Notification', next);
      },
      error: (err) => {
        input.checked = row.status === 'active';
        this.toastError(err?.error?.message ?? 'Could not update status');
      },
    });
  }

  protected serialFor(index: number): number {
    const p = this.pagination();
    return (p.page - 1) * p.limit + index + 1;
  }

  protected goPrev(): void {
    const p = this.pagination();
    if (p.page > 1) this.loadPage(p.page - 1);
  }

  protected goNext(): void {
    const p = this.pagination();
    if (p.page < p.pages) this.loadPage(p.page + 1);
  }

  private clearImageFileInput(): void {
    const el = this.imageFileInput()?.nativeElement;
    if (el) el.value = '';
  }

  private revokePickedImagePreview(): void {
    const url = this.pickedImagePreviewUrl();
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    this.pickedImagePreviewUrl.set(null);
  }

  private toastError(message: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: message });
  }
}
