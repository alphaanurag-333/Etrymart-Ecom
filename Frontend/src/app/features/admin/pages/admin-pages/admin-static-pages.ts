import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  StaticPage,
  StaticPageService,
  StaticPageStatus,
} from '../../../../core/services/admin-service/static-page.service';
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
  selector: 'app-admin-static-pages',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, CKEditorModule],
  templateUrl: './admin-static-pages.html',
  styleUrls: ['./admin-static-pages.css', '../../admin.css'],
})
export class AdminStaticPagesPage {
  private readonly fb = inject(FormBuilder);
  private readonly pages = inject(StaticPageService);

  /** `@ckeditor/ckeditor5-build-classic` typings do not match `ckeditor5@48` `EditorRelaxedConstructor`; runtime is supported. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly Editor: any = ClassicEditor;
  protected readonly rows = signal<StaticPage[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  /** Bumps when opening the editor so CKEditor remounts with the correct HTML. */
  protected readonly ckEditorMount = signal(0);

  protected readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    slug: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(1)]),
    content: this.fb.nonNullable.control('', [Validators.required, htmlNotEmpty]),
    status: this.fb.nonNullable.control<StaticPageStatus>('active', [Validators.required]),
  });

  constructor() {
    this.loadList();
  }

  protected edit(row: StaticPage): void {
    this.editingId.set(row._id);
    this.form.reset({
      title: row.title,
      slug: row.slug,
      content: row.content ?? '',
      status: row.status,
    });
    this.ckEditorMount.update((k) => k + 1);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      title: '',
      slug: '',
      content: '',
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
      title: raw.title.trim(),
      slug: raw.slug.trim().toLowerCase(),
      content: raw.content,
      status: raw.status,
    };

    this.saving.set(true);
    const req = id ? this.pages.updatePage(id, payload) : this.pages.createPage(payload);
    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        void Swal.fire({
          icon: 'success',
          title: id ? 'Page updated' : 'Page created',
          timer: 1600,
          showConfirmButton: false,
        });
        this.cancelEdit();
        this.loadList();
      },
      error: (err) => this.toastError(err?.error?.message ?? (id ? 'Update failed' : 'Create failed')),
    });
  }

  protected toggleStatus(row: StaticPage, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next: StaticPageStatus = input.checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.pages.updatePage(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((p) => (p._id === row._id ? { ...p, status: next } : p)));
        showStatusToggleSuccessModal(row.title, next);
      },
      error: (err) => {
        input.checked = row.status === 'active';
        this.toastError(err?.error?.message ?? 'Could not update status');
      },
    });
  }

  protected async preview(row: StaticPage): Promise<void> {
    await Swal.fire({
      title: row.title,
      width: 720,
      html: `<div class="text-start small text-muted mb-2">/${row.slug}</div><div class="text-start border rounded p-3" style="max-height:60vh;overflow:auto">${row.content}</div>`,
      confirmButtonColor: '#0ea5e9',
    });
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  private loadList(): void {
    this.loading.set(true);
    this.pages
      .listPages()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.rows.set(res.data ?? []),
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load pages'),
      });
  }

  private toastError(message: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: message });
  }
}
