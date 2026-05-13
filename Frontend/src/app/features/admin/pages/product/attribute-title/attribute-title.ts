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
} from '../../../../../core/services/admin-service/attribute.service';
import { showStatusToggleSuccessModal } from '../../../../../core/utils/status-toggle-swal';

@Component({
  selector: 'app-attribute-title',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './attribute-title.html',
  styleUrls: ['../../../admin.css'],
})
export class AttributeTitlePage {
  private readonly fb = inject(FormBuilder);
  private readonly attributes = inject(AttributeService);
  protected readonly titles = signal<AttributeTitle[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(40)]],
    status: this.fb.nonNullable.control<AttributeStatus>('active', { validators: [Validators.required] }),
  });

  constructor() {
    this.loadPage(1);
  }

  protected get titleLength(): number {
    return this.form.controls.title.value.length;
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    this.attributes
      .listAttributeTitles({ page, limit })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.titles.set(res.attributeTitles);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load attribute titles'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, status } = this.form.getRawValue();
    const id = this.editingId();
    this.saving.set(true);
    const req = id
      ? this.attributes.updateAttributeTitle(id, { title, status })
      : this.attributes.createAttributeTitle({ title, status });
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

  protected edit(row: AttributeTitle): void {
    this.editingId.set(row._id);
    this.form.patchValue({ title: row.title, status: row.status });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ title: '', status: 'active' });
  }

  protected async delete(row: AttributeTitle): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete attribute title?',
      text: `“${row.title}” will be removed if it has no values.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!r.isConfirmed) return;
    this.attributes.deleteAttributeTitle(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: AttributeTitle, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const checked = input.checked;
    const next: AttributeStatus = checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.attributes.updateAttributeTitle(row._id, { status: next }).subscribe({
      next: () => {
        this.titles.update((list) =>
          list.map((t) => (t._id === row._id ? { ...t, status: next } : t)),
        );
        showStatusToggleSuccessModal(row.title, next);
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
