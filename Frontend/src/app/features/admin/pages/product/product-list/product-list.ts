import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Category, CategoryService, CategoryStatus } from '../../../../../core/services/admin-service/category.service';
import { Product, ProductService, ProductVariantType } from '../../../../../core/services/admin-service/product.service';
import { SubCategory, SubCategoryService } from '../../../../../core/services/admin-service/subcategory.service';
import { showStatusToggleSuccessModal } from '../../../../../core/utils/status-toggle-swal';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './product-list.html',
  styleUrls: ['../../../admin.css'],
})
export class ProductListPage {
  private readonly fb = inject(FormBuilder);
  private readonly products = inject(ProductService);
  private readonly categories = inject(CategoryService);
  private readonly subcategories = inject(SubCategoryService);

  protected readonly rows = signal<Product[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly categoriesList = signal<Category[]>([]);
  protected readonly filterSubcategories = signal<SubCategory[]>([]);

  protected readonly variantTypes: Array<{ value: ProductVariantType; label: string }> = [
    { value: 'single', label: 'Single' },
    { value: 'multi', label: 'Multi variant' },
  ];

  protected readonly filters = this.fb.group({
    search: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<CategoryStatus | ''>(''),
    category: this.fb.nonNullable.control(''),
    subCategory: this.fb.nonNullable.control(''),
    variantType: this.fb.nonNullable.control<ProductVariantType | ''>(''),
  });

  constructor() {
    this.loadPage(1);
    this.categories.listCategories({ page: 1, limit: 500 }).subscribe({
      next: (res) => this.categoriesList.set(res.categories),
      error: () => {},
    });
    this.filters.controls.category.valueChanges.subscribe((catId) => {
      this.filters.patchValue({ subCategory: '' }, { emitEvent: false });
      if (catId) {
        this.subcategories.listSubCategories({ category: catId, page: 1, limit: 500 }).subscribe({
          next: (r) => this.filterSubcategories.set(r.subCategories),
          error: () => this.filterSubcategories.set([]),
        });
      } else this.filterSubcategories.set([]);
    });
  }

  protected categoryLabel(row: Product): string {
    const c = row.category;
    return typeof c === 'object' && c?.name ? c.name : '-';
  }

  protected subCategoryLabel(row: Product): string {
    const s = row.subCategory;
    return typeof s === 'object' && s?.name ? s.name : '-';
  }

  protected formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  protected applyFilters(): void {
    this.loadPage(1);
  }

  protected resetFilters(): void {
    this.filters.reset({
      search: '',
      status: '',
      category: '',
      subCategory: '',
      variantType: '',
    });
    this.filterSubcategories.set([]);
    this.loadPage(1);
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    const f = this.filters.getRawValue();
    this.products
      .listProducts({
        page,
        limit,
        search: f.search.trim() || undefined,
        status: (f.status || undefined) as CategoryStatus | undefined,
        category: f.category || undefined,
        subCategory: f.subCategory || undefined,
        variantType: (f.variantType || undefined) as ProductVariantType | undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.products);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load products'),
      });
  }

  protected async delete(row: Product): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete product?',
      text: `"${row.name}" will be removed permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    this.products.deleteProduct(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: Product, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next: CategoryStatus = input.checked ? 'active' : 'inactive';
    if (row.status === next) return;
    this.products.updateProduct(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((p) => (p._id === row._id ? { ...p, status: next } : p)));
        showStatusToggleSuccessModal(row.name, next);
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

  private toastError(message: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: message });
  }
}
