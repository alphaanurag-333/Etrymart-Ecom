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
  Banner,
  BannerPayload,
  BannerService,
  BannerType,
} from '../../../../core/services/admin-service/banner.service';

const BANNER_TYPES: Array<{ value: BannerType; label: string }> = [
  { value: 'main_banner', label: 'Main banner' },
  { value: 'popup_banner', label: 'Popup banner' },
  { value: 'ads_img_banner', label: 'Ads image banner' },
  { value: 'ads_video_banner', label: 'Ads video banner' },
];

@Component({
  selector: 'app-admin-banner',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './admin-banner.html',
  styleUrls: ['../../admin.css'],
})
export class AdminBannerPage {
  private readonly fb = inject(FormBuilder);
  private readonly banners = inject(BannerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageFileInput = viewChild<ElementRef<HTMLInputElement>>('imageFileInput');
  private readonly videoFileInput = viewChild<ElementRef<HTMLInputElement>>('videoFileInput');

  protected readonly bannerTypes = BANNER_TYPES;
  protected readonly rows = signal<Banner[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingImagePath = signal<string | null>(null);
  protected readonly editingVideoPath = signal<string | null>(null);
  protected readonly pickedImagePreviewUrl = signal<string | null>(null);
  protected readonly pickedVideoPreviewUrl = signal<string | null>(null);

  protected readonly filters = this.fb.group({
    banner_type: this.fb.nonNullable.control<BannerType | ''>(''),
    status: this.fb.nonNullable.control<CategoryStatus | ''>(''),
  });

  protected readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    banner_type: this.fb.nonNullable.control<BannerType>('main_banner', [Validators.required]),
    status: this.fb.nonNullable.control<CategoryStatus>('active', [Validators.required]),
    start_date: this.fb.control<string | null>(null),
    end_date: this.fb.control<string | null>(null),
    pop_up_time: this.fb.control<number | null>(null, [Validators.min(0)]),
    advertising_link: this.fb.nonNullable.control(''),
    imageFile: this.fb.control<File | null>(null),
    videoFile: this.fb.control<File | null>(null),
  });

  constructor() {
    this.applyBannerTypeValidators();
    this.loadPage(1);
    this.destroyRef.onDestroy(() => {
      this.revokePickedImagePreview();
      this.revokePickedVideoPreview();
    });
  }

  protected get titleLength(): number {
    return this.form.controls.title.value.length;
  }

  protected selectedBannerType(): BannerType {
    return this.form.controls.banner_type.value;
  }

  protected showImageUpload(): boolean {
    return true;
  }

  protected showVideoUpload(): boolean {
    return this.selectedBannerType() === 'ads_video_banner';
  }

  protected showDateFields(): boolean {
    return this.selectedBannerType() !== 'main_banner';
  }

  protected showPopupTime(): boolean {
    return this.selectedBannerType() === 'popup_banner';
  }

  protected showAdvertisingLink(): boolean {
    return this.selectedBannerType() === 'popup_banner' || this.selectedBannerType() === 'ads_img_banner';
  }

  protected isImageRequiredMissing(): boolean {
    return !(this.form.controls.imageFile.value instanceof File) && !this.editingImagePath();
  }

  protected isVideoRequiredMissing(): boolean {
    return this.showVideoUpload() && !(this.form.controls.videoFile.value instanceof File) && !this.editingVideoPath();
  }

  protected onBannerTypeChange(): void {
    const type = this.selectedBannerType();

    if (type !== 'ads_video_banner') {
      this.revokePickedVideoPreview();
      this.form.patchValue({ videoFile: null });
      const video = this.videoFileInput()?.nativeElement;
      if (video) video.value = '';
    }

    this.applyBannerTypeValidators();

    if (type === 'main_banner') {
      this.form.patchValue({
        start_date: null,
        end_date: null,
        pop_up_time: null,
        advertising_link: '',
      });
      return;
    }

    if (type !== 'popup_banner') {
      this.form.patchValue({ pop_up_time: null });
    }

    if (type !== 'popup_banner' && type !== 'ads_img_banner') {
      this.form.patchValue({ advertising_link: '' });
    }
  }

  protected mediaSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : `${MEDIA_URL}${path}`;
  }

  protected formImagePreviewUrl(): string | null {
    const picked = this.pickedImagePreviewUrl();
    if (picked) return picked;
    return this.mediaSrc(this.editingImagePath());
  }

  protected formVideoPreviewUrl(): string | null {
    const picked = this.pickedVideoPreviewUrl();
    if (picked) return picked;
    return this.mediaSrc(this.editingVideoPath());
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.revokePickedImagePreview();
    this.form.patchValue({ imageFile: file });
    this.form.controls.imageFile.updateValueAndValidity();
    if (file) this.pickedImagePreviewUrl.set(URL.createObjectURL(file));
  }

  protected onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.revokePickedVideoPreview();
    this.form.patchValue({ videoFile: file });
    this.form.controls.videoFile.updateValueAndValidity();
    if (file) this.pickedVideoPreviewUrl.set(URL.createObjectURL(file));
  }

  protected applyFilters(): void {
    this.loadPage(1);
  }

  protected resetFilters(): void {
    this.filters.reset({
      banner_type: '',
      status: '',
    });
    this.loadPage(1);
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    const filters = this.filters.getRawValue();
    this.banners
      .listBanners({
        page,
        limit,
        banner_type: filters.banner_type || undefined,
        status: filters.status || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.banners);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load banners'),
      });
  }

  protected submit(): void {
    this.applyBannerTypeValidators();
    if (this.form.invalid || this.isImageRequiredMissing() || this.isVideoRequiredMissing()) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingId();
    const raw = this.form.getRawValue();
    const payload: BannerPayload = {
      title: raw.title.trim(),
      banner_type: raw.banner_type,
      status: raw.status,
    };

    if (this.showDateFields()) {
      payload.start_date = raw.start_date || null;
      payload.end_date = raw.end_date || null;
    }
    if (this.showPopupTime()) {
      payload.pop_up_time = raw.pop_up_time ?? null;
    }
    if (this.showAdvertisingLink()) {
      payload.advertising_link = raw.advertising_link.trim() || null;
    }
    if (raw.imageFile instanceof File) payload.image = raw.imageFile;
    if (this.showVideoUpload() && raw.videoFile instanceof File) payload.video = raw.videoFile;

    this.saving.set(true);
    const req = id ? this.banners.updateBanner(id, payload) : this.banners.createBanner(payload);
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

  protected edit(row: Banner): void {
    this.revokePickedImagePreview();
    this.revokePickedVideoPreview();
    this.editingId.set(row._id);
    this.editingImagePath.set(row.image ?? null);
    this.editingVideoPath.set(row.video ?? null);
    this.form.reset({
      title: row.title,
      banner_type: row.banner_type,
      status: row.status,
      start_date: this.toDateInput(row.start_date),
      end_date: this.toDateInput(row.end_date),
      pop_up_time: row.pop_up_time ?? null,
      advertising_link: row.advertising_link ?? '',
      imageFile: null,
      videoFile: null,
    });
    this.applyBannerTypeValidators();
    this.clearFileInputs();
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editingImagePath.set(null);
    this.editingVideoPath.set(null);
    this.revokePickedImagePreview();
    this.revokePickedVideoPreview();
    this.form.reset({
      title: '',
      banner_type: 'main_banner',
      status: 'active',
      start_date: null,
      end_date: null,
      pop_up_time: null,
      advertising_link: '',
      imageFile: null,
      videoFile: null,
    });
    this.applyBannerTypeValidators();
    this.clearFileInputs();
  }

  protected view(row: Banner): void {
    const imageUrl = this.mediaSrc(row.image);
    const videoUrl = this.mediaSrc(row.video);
    void Swal.fire({
      title: row.title,
      html: `
        <div style="text-align:left">
          <p><strong>Type:</strong> ${this.bannerTypeLabel(row.banner_type)}</p>
          <p><strong>Status:</strong> ${row.status}</p>
          ${row.advertising_link ? `<p><strong>Link:</strong> ${row.advertising_link}</p>` : ''}
          ${videoUrl ? `<p><a href="${videoUrl}" target="_blank" rel="noopener">Open video</a></p>` : ''}
        </div>
      `,
      imageUrl: imageUrl ?? undefined,
      imageAlt: row.title,
      confirmButtonColor: '#0ea5e9',
    });
  }

  protected async delete(row: Banner): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete banner?',
      text: `“${row.title}” will be removed permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    this.banners.deleteBanner(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: Banner, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next: CategoryStatus = input.checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.banners.updateBanner(row._id, { status: next }).subscribe({
      next: () => {
        this.loadPage(this.pagination().page);
        showStatusToggleSuccessModal(row.title, next);
      },
      error: (err) => {
        input.checked = row.status === 'active';
        this.toastError(err?.error?.message ?? 'Could not update status');
      },
    });
  }

  protected bannerTypeLabel(type: BannerType): string {
    return this.bannerTypes.find((item) => item.value === type)?.label ?? type;
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

  private toDateInput(value: string | null | undefined): string | null {
    if (!value) return null;
    return value.slice(0, 10);
  }

  private clearFileInputs(): void {
    const image = this.imageFileInput()?.nativeElement;
    const video = this.videoFileInput()?.nativeElement;
    if (image) image.value = '';
    if (video) video.value = '';
  }

  private applyBannerTypeValidators(): void {
    const start = this.form.controls.start_date;
    const end = this.form.controls.end_date;
    const popup = this.form.controls.pop_up_time;
    const link = this.form.controls.advertising_link;

    start.setValidators(this.showDateFields() ? [Validators.required] : null);
    end.setValidators(this.showDateFields() ? [Validators.required] : null);
    popup.setValidators(this.showPopupTime() ? [Validators.required, Validators.min(0)] : [Validators.min(0)]);
    link.setValidators(this.showAdvertisingLink() ? [Validators.required] : null);

    start.updateValueAndValidity({ emitEvent: false });
    end.updateValueAndValidity({ emitEvent: false });
    popup.updateValueAndValidity({ emitEvent: false });
    link.updateValueAndValidity({ emitEvent: false });
  }

  private revokePickedImagePreview(): void {
    const url = this.pickedImagePreviewUrl();
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    this.pickedImagePreviewUrl.set(null);
  }

  private revokePickedVideoPreview(): void {
    const url = this.pickedVideoPreviewUrl();
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    this.pickedVideoPreviewUrl.set(null);
  }

  private toastError(message: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: message });
  }
}
