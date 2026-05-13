import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { MEDIA_URL } from '../../../../core/config/api.config';
import { showStatusToggleSuccessModal } from '../../../../core/utils/status-toggle-swal';
import { CategoryStatus } from '../../../../core/services/admin-service/category.service';
import {
  TryOnBanner,
  TryOnBannerPayload,
  TryOnBannerService,
} from '../../../../core/services/admin-service/try-on-banner.service';

@Component({
  selector: 'app-admin-tryon-banner',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './admin-tryonBanner.html',
  styleUrls: ['../../admin.css'],
})
export class AdminTryonBannerPage {
  private readonly fb = inject(FormBuilder);
  private readonly banners = inject(TryOnBannerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageFileInput = viewChild<ElementRef<HTMLInputElement>>('imageFileInput');

  protected readonly rows = signal<TryOnBanner[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingImagePath = signal<string | null>(null);
  protected readonly pickedImagePreviewUrl = signal<string | null>(null);

  protected readonly form = this.fb.group({
    status: this.fb.nonNullable.control<CategoryStatus>('active'),
    imageFile: this.fb.control<File | null>(null, Validators.required),
  });

  constructor() {
    this.loadPage(1);
    this.destroyRef.onDestroy(() => this.revokePickedImagePreview());
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
    this.form.controls.imageFile.markAsTouched();
    if (file) {
      this.pickedImagePreviewUrl.set(URL.createObjectURL(file));
    }
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    this.banners
      .listTryOnBanners({ page, limit })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.tryOnBanners);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load try-on banners'),
      });
  }

  protected submit(): void {
    const id = this.editingId();
    const { status, imageFile } = this.form.getRawValue();

    if (!id && !(imageFile instanceof File)) {
      this.form.controls.imageFile.setErrors({ required: true });
      this.form.controls.imageFile.markAsTouched();
      return;
    }

    const payload: Partial<TryOnBannerPayload> = { status };
    if (imageFile instanceof File) {
      payload.popupImage = imageFile;
    }

    this.saving.set(true);
    const req = id
      ? this.banners.updateTryOnBanner(id, payload)
      : this.banners.createTryOnBanner(payload as TryOnBannerPayload);
    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        void Swal.fire({
          icon: 'success',
          title: id ? 'Updated' : 'Created',
          timer: 1600,
          showConfirmButton: false,
        });
        this.cancelEdit();
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Request failed'),
    });
  }

  protected edit(row: TryOnBanner): void {
    this.revokePickedImagePreview();
    this.editingId.set(row._id);
    this.editingImagePath.set(row.popupImage);
    this.form.controls.imageFile.clearValidators();
    this.form.controls.imageFile.updateValueAndValidity();
    this.form.reset({
      status: row.status,
      imageFile: null,
    });
    this.clearImageFileInput();
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editingImagePath.set(null);
    this.revokePickedImagePreview();
    this.form.controls.imageFile.setValidators(Validators.required);
    this.form.controls.imageFile.updateValueAndValidity();
    this.form.reset({
      status: 'active',
      imageFile: null,
    });
    this.clearImageFileInput();
  }

  protected async delete(row: TryOnBanner): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete try-on banner?',
      text: 'This banner will be removed permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    this.banners.deleteTryOnBanner(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: TryOnBanner, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next: CategoryStatus = input.checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.banners.updateTryOnBanner(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((item) => (item._id === row._id ? { ...item, status: next } : item)));
        showStatusToggleSuccessModal('Try-on banner', next);
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
