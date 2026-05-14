import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { Faq, FaqService, FaqStatus } from '../../../../core/services/admin-service/faq.service';
import { showStatusToggleSuccessModal } from '../../../../core/utils/status-toggle-swal';

function htmlNotEmpty(control: AbstractControl): ValidationErrors | null {
  const raw = control.value;
  if (raw === null || raw === undefined) return { required: true };
  const str = String(raw);
  const text = str.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return { required: true };
  return null;
}

@Component({
  selector: 'app-admin-faq',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, CKEditorModule],
  templateUrl: './admin-faq.html',
  styleUrls: ['./admin-faq.css', '../../admin.css'],
})
export class AdminFaqPage {
  private readonly fb = inject(FormBuilder);
  private readonly faqs = inject(FaqService);

  /** `@ckeditor/ckeditor5-build-classic` typings do not match `ckeditor5@48` `EditorRelaxedConstructor`; runtime is supported. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly Editor: any = ClassicEditor;
  protected readonly rows = signal<Faq[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly ckEditorMount = signal(0);

  protected readonly form = this.fb.group({
    question: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    answer: this.fb.nonNullable.control('', [Validators.required, htmlNotEmpty]),
    sortOrder: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    status: this.fb.nonNullable.control<FaqStatus>('active', [Validators.required]),
  });

  constructor() {
    this.loadList();
  }

  protected edit(row: Faq): void {
    this.editingId.set(row._id);
    this.form.reset({
      question: row.question,
      answer: row.answer ?? '',
      sortOrder: row.sortOrder ?? 0,
      status: row.status,
    });
    this.ckEditorMount.update((k) => k + 1);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      question: '',
      answer: '',
      sortOrder: 0,
      status: 'active',
    });
    this.ckEditorMount.update((k) => k + 1);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingId();
    const raw = this.form.getRawValue();
    const payload = {
      question: raw.question.trim(),
      answer: raw.answer,
      sortOrder: Number(raw.sortOrder),
      status: raw.status,
    };

    this.saving.set(true);
    const req = id ? this.faqs.updateFaq(id, payload) : this.faqs.createFaq(payload);
    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        void Swal.fire({
          icon: 'success',
          title: id ? 'FAQ updated' : 'FAQ created',
          timer: 1600,
          showConfirmButton: false,
        });
        this.cancelEdit();
        this.loadList();
      },
      error: (err) => this.toastError(err?.error?.message ?? (id ? 'Update failed' : 'Create failed')),
    });
  }

  protected toggleStatus(row: Faq, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next: FaqStatus = input.checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.faqs.updateFaq(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((f) => (f._id === row._id ? { ...f, status: next } : f)));
        showStatusToggleSuccessModal(row.question, next);
      },
      error: (err) => {
        input.checked = row.status === 'active';
        this.toastError(err?.error?.message ?? 'Could not update status');
      },
    });
  }

  protected async preview(row: Faq): Promise<void> {
    await Swal.fire({
      title: row.question,
      width: 720,
      html: `<div class="text-start border rounded p-3" style="max-height:60vh;overflow:auto">${row.answer}</div>`,
      confirmButtonColor: '#0ea5e9',
    });
  }

  protected async confirmDelete(row: Faq): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete FAQ?',
      text: 'This cannot be undone.',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;

    this.faqs.deleteFaq(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false });
        if (this.editingId() === row._id) this.cancelEdit();
        this.loadList();
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  private loadList(): void {
    this.loading.set(true);
    this.faqs
      .listFaqs({ page: 1, limit: 100 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.rows.set(res.faqs ?? []),
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load FAQs'),
      });
  }

  private toastError(message: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: message });
  }
}
