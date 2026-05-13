import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  AttributeService,
  AttributeStatus,
  AttributeTitle,
  AttributeValue,
} from '../../../../../core/services/admin-service/attribute.service';
import { showStatusToggleSuccessModal } from '../../../../../core/utils/status-toggle-swal';

@Component({
  selector: 'app-attribute-value',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './attribute-value.html',
  styleUrls: ['../../../admin.css'],
})
export class AttributeValuePage {
  private readonly fb = inject(FormBuilder);
  private readonly attributes = inject(AttributeService);

  protected readonly values = signal<AttributeValue[]>([]);
  protected readonly titleOptions = signal<AttributeTitle[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly titlesLoading = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    attributeTitle: ['', Validators.required],
    value: ['', [Validators.required, Validators.maxLength(60)]],
    status: this.fb.nonNullable.control<AttributeStatus>('active', { validators: [Validators.required] }),
  });

  constructor() {
    this.loadTitleOptions();
    this.loadPage(1);
  }

  protected get valueLength(): number {
    return this.form.controls.value.value.length;
  }

  protected titleLabel(row: AttributeValue): string {
    const t = row.attributeTitle;
    if (t && typeof t === 'object' && 'title' in t) return (t as { title: string }).title;
    return '—';
  }

  private loadTitleOptions(): void {
    this.titlesLoading.set(true);
    this.attributes
      .listAttributeTitles({ page: 1, limit: 500, status: 'active' })
      .pipe(finalize(() => this.titlesLoading.set(false)))
      .subscribe({
        next: (res) => this.titleOptions.set(res.attributeTitles),
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load attribute titles'),
      });
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    this.attributes
      .listAttributeValues({ page, limit })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.values.set(res.attributeValues);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load attribute values'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const id = this.editingId();
    this.saving.set(true);
    const req = id
      ? this.attributes.updateAttributeValue(id, {
          attributeTitle: raw.attributeTitle,
          value: raw.value,
          status: raw.status,
        })
      : this.attributes.createAttributeValue({
          attributeTitle: raw.attributeTitle,
          value: raw.value,
          status: raw.status,
        });
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

  protected edit(row: AttributeValue): void {
    const t = row.attributeTitle;
    const tid =
      typeof t === 'object' && t && '_id' in t ? (t as { _id: string })._id : String(t);
    if (typeof t === 'object' && t && 'title' in t) {
      const full = t as AttributeTitle;
      this.titleOptions.update((opts) => (opts.some((o) => o._id === full._id) ? opts : [...opts, full]));
    }
    this.editingId.set(row._id);
    this.form.patchValue({
      attributeTitle: tid,
      value: row.value,
      status: row.status,
    });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ attributeTitle: '', value: '', status: 'active' });
  }

  protected async delete(row: AttributeValue): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete attribute value?',
      text: `“${row.value}” will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!r.isConfirmed) return;
    this.attributes.deleteAttributeValue(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: AttributeValue, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const checked = input.checked;
    const next: AttributeStatus = checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.attributes.updateAttributeValue(row._id, { status: next }).subscribe({
      next: () => {
        this.values.update((list) =>
          list.map((v) => (v._id === row._id ? { ...v, status: next } : v)),
        );
        showStatusToggleSuccessModal(row.value, next);
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
