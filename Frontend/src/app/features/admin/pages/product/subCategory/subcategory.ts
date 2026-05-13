import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { MEDIA_URL } from '../../../../../core/config/api.config';
import { showStatusToggleSuccessModal } from '../../../../../core/utils/status-toggle-swal';
import { Category, CategoryService, CategoryStatus } from '../../../../../core/services/admin-service/category.service';
import {
  SubCategory,
  SubCategoryPayload,
  SubCategoryService,
} from '../../../../../core/services/admin-service/subcategory.service';

@Component({
  selector: 'app-admin-subcategory',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './subcategory.html',
  styleUrls: ['../../../admin.css'],
})
export class SubcategoryPage {
  private readonly fb = inject(FormBuilder);
  private readonly subcategories = inject(SubCategoryService);
  private readonly categories = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly iconFileInput = viewChild<ElementRef<HTMLInputElement>>('iconFileInput');

  protected readonly iconPickedPreviewUrl = signal<string | null>(null);
  protected readonly editingIconPath = signal<string | null>(null);

  protected readonly rows = signal<SubCategory[]>([]);
  protected readonly categoryOptions = signal<Category[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly categoriesLoading = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.group({
    category: this.fb.nonNullable.control('', Validators.required),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    description: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<CategoryStatus>('active'),
    iconFile: this.fb.control<File | null>(null),
  });

  constructor() {
    this.loadCategoryOptions();
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

  protected formIconPreviewUrl(): string | null {
    const picked = this.iconPickedPreviewUrl();
    if (picked) return picked;
    return this.iconSrc(this.editingIconPath());
  }

  protected categoryLabel(row: SubCategory): string {
    const c = row.category;
    if (c && typeof c === 'object' && 'name' in c) return (c as Category).name;
    return '—';
  }

  private loadCategoryOptions(): void {
    this.categoriesLoading.set(true);
    this.categories
      .listCategories({ page: 1, limit: 500, status: 'active' })
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: (res) => this.categoryOptions.set(res.categories),
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load categories'),
      });
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
    this.subcategories
      .listSubCategories({ page, limit })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.subCategories);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load subcategories'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.editingId();
    const { category, name, description, status, iconFile } = this.form.getRawValue();
    const desc = description?.trim() || null;
    const base: SubCategoryPayload = {
      category,
      name: name.trim(),
      description: desc,
      status,
    };
    if (iconFile instanceof File) {
      base.icon = iconFile;
    }

    this.saving.set(true);
    const req = id
      ? this.subcategories.updateSubCategory(id, base)
      : this.subcategories.createSubCategory(base);
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

  protected edit(row: SubCategory): void {
    const c = row.category;
    if (typeof c === 'object' && c && '_id' in c) {
      const full = c as Category;
      this.categoryOptions.update((opts) => (opts.some((o) => o._id === full._id) ? opts : [...opts, full]));
    }
    const cid =
      typeof c === 'object' && c && '_id' in c ? (c as { _id: string })._id : String(c);

    this.revokePickedIconPreview();
    this.editingId.set(row._id);
    this.editingIconPath.set(row.icon ?? null);
    this.form.patchValue({
      category: cid,
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
      category: '',
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

  protected async delete(row: SubCategory): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete subcategory?',
      text: `“${row.name}” will be removed if allowed by the server.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!r.isConfirmed) return;
    this.subcategories.deleteSubCategory(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: SubCategory, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const checked = input.checked;
    const next: CategoryStatus = checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.subcategories.updateSubCategory(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((s) => (s._id === row._id ? { ...s, status: next } : s)));
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
