import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { MEDIA_URL } from '../../../../../core/config/api.config';
import { showStatusToggleSuccessModal } from '../../../../../core/utils/status-toggle-swal';
import {
  Category,
  CategoryPayload,
  CategoryService,
  CategoryStatus,
} from '../../../../../core/services/admin-service/category.service';

@Component({
  selector: 'app-admin-category',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './category.html',
  styleUrls: ['../../../admin.css'],
})
export class CategoryPage {
  private readonly fb = inject(FormBuilder);
  private readonly categories = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly iconFileInput = viewChild<ElementRef<HTMLInputElement>>('iconFileInput');

  /** Blob URL for a newly picked file (revoked when replaced or cleared). */
  protected readonly iconPickedPreviewUrl = signal<string | null>(null);
  /** Server icon path while editing, shown until user picks a replacement. */
  protected readonly editingIconPath = signal<string | null>(null);

  protected readonly rows = signal<Category[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    description: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<CategoryStatus>('active'),
    iconFile: this.fb.control<File | null>(null),
  });

  constructor() {
    this.loadPage(1);
    this.destroyRef.onDestroy(() => this.revokePickedIconPreview());
  }

  protected get nameLength(): number {
    return this.form.controls.name.value.length;
  }

  protected iconSrc(icon: string | null | undefined): string | null {
    if (!icon) return null;
    return icon.startsWith('http') ? icon : `${MEDIA_URL}${icon}`;
  }

  /** Image shown next to the icon file field: new pick, else existing icon in edit mode. */
  protected formIconPreviewUrl(): string | null {
    const picked = this.iconPickedPreviewUrl();
    if (picked) return picked;
    return this.iconSrc(this.editingIconPath());
  }

  protected onIconSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.revokePickedIconPreview();
    this.form.patchValue({ iconFile: file });
    if (file) {
      this.iconPickedPreviewUrl.set(URL.createObjectURL(file));
    }
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    this.categories
      .listCategories({ page, limit })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.categories);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load categories'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.editingId();
    const { name, description, status, iconFile } = this.form.getRawValue();
    const desc = description?.trim() || null;
    const base: CategoryPayload = {
      name: name.trim(),
      description: desc,
      status,
    };
    if (iconFile instanceof File) {
      base.icon = iconFile;
    }

    this.saving.set(true);
    const req = id
      ? this.categories.updateCategory(id, base)
      : this.categories.createCategory(base);
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

  protected edit(row: Category): void {
    this.revokePickedIconPreview();
    this.editingId.set(row._id);
    this.editingIconPath.set(row.icon ?? null);
    this.form.patchValue({
      name: row.name,
      description: row.description ?? '',
      status: row.status,
      iconFile: null,
    });
    this.clearIconFileInput();
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editingIconPath.set(null);
    this.revokePickedIconPreview();
    this.form.reset({
      name: '',
      description: '',
      status: 'active',
      iconFile: null,
    });
    this.clearIconFileInput();
  }

  private clearIconFileInput(): void {
    const el = this.iconFileInput()?.nativeElement;
    if (el) el.value = '';
  }

  private revokePickedIconPreview(): void {
    const u = this.iconPickedPreviewUrl();
    if (u?.startsWith('blob:')) {
      URL.revokeObjectURL(u);
    }
    this.iconPickedPreviewUrl.set(null);
  }

  protected async delete(row: Category): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete category?',
      text: `“${row.name}” will be removed if allowed by the server.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!r.isConfirmed) return;
    this.categories.deleteCategory(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: Category, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const checked = input.checked;
    const next: CategoryStatus = checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.categories.updateCategory(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((c) => (c._id === row._id ? { ...c, status: next } : c)));
        showStatusToggleSuccessModal(row.name, next);
      },
      error: (err) => {
        input.checked = row.status === 'active';
        this.toastError(err?.error?.message ?? 'Could not update status');
      },
    });
  }

  protected serialFor(i: number): number {
    const p = this.pagination();
    return (p.page - 1) * p.limit + i + 1;
  }

  protected goPrev(): void {
    const p = this.pagination();
    if (p.page > 1) this.loadPage(p.page - 1);
  }

  protected goNext(): void {
    const p = this.pagination();
    if (p.page < p.pages) this.loadPage(p.page + 1);
  }

  private toastError(msg: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: msg });
  }
}
