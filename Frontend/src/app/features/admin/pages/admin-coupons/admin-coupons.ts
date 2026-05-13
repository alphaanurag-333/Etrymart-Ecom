import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { CategoryStatus } from '../../../../core/services/admin-service/category.service';
import {
  Coupon,
  CouponDiscountType,
  CouponPayload,
  CouponService,
} from '../../../../core/services/admin-service/coupon.service';
import { showStatusToggleSuccessModal } from '../../../../core/utils/status-toggle-swal';

const DISCOUNT_TYPES: Array<{ value: CouponDiscountType; label: string }> = [
  { value: 'percent', label: 'Percentage' },
  { value: 'flat', label: 'Flat amount' },
];

@Component({
  selector: 'app-admin-coupons',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './admin-coupons.html',
  styleUrls: ['../../admin.css'],
})
export class AdminCouponsPage {
  private readonly fb = inject(FormBuilder);
  private readonly coupons = inject(CouponService);

  protected readonly discountTypes = DISCOUNT_TYPES;
  protected readonly rows = signal<Coupon[]>([]);
  protected readonly pagination = signal({ page: 1, limit: 10, total: 0, pages: 1 });
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly filters = this.fb.group({
    search: this.fb.nonNullable.control(''),
    discountType: this.fb.nonNullable.control<CouponDiscountType | ''>(''),
    status: this.fb.nonNullable.control<CategoryStatus | ''>(''),
  });

  protected readonly form = this.fb.group({
    couponTitle: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    couponCode: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(40)]),
    discountType: this.fb.nonNullable.control<CouponDiscountType>('percent', [Validators.required]),
    discountAmount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0), Validators.max(100)]),
    minimumPurchase: this.fb.nonNullable.control(0, [Validators.min(0)]),
    startDate: this.fb.control<string | null>(null),
    expireDate: this.fb.control<string | null>(null),
    status: this.fb.nonNullable.control<CategoryStatus>('active', [Validators.required]),
  });

  constructor() {
    this.applyDiscountAmountValidators();
    this.form.addValidators(this.discountRulesValidator);
    this.loadPage(1);
  }

  protected get titleLength(): number {
    return this.form.controls.couponTitle.value.length;
  }

  protected get codeLength(): number {
    return this.form.controls.couponCode.value.length;
  }

  protected hasFlatDiscountTooHigh(): boolean {
    return (
      this.form.hasError('flatDiscountTooHigh') &&
      (this.form.controls.discountAmount.touched || this.form.controls.minimumPurchase.touched)
    );
  }

  protected onDiscountTypeChange(): void {
    this.applyDiscountAmountValidators();
    const da = this.form.controls.discountAmount;
    if (this.form.controls.discountType.value === 'percent' && da.value > 100) {
      da.setValue(100, { emitEvent: false });
    }
    da.updateValueAndValidity();
    this.form.controls.minimumPurchase.updateValueAndValidity();
    this.form.updateValueAndValidity();
  }

  protected onDiscountValueChange(): void {
    this.form.updateValueAndValidity();
  }

  /** Stops minus, plus, and exponent keys so `type="number"` cannot go negative or scientific. */
  protected blockMinusExponentKeys(event: KeyboardEvent): void {
    if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  protected onDiscountAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    if (raw === '') {
      this.onDiscountValueChange();
      return;
    }
    let n = Number(raw.replace(/,/g, ''));
    if (Number.isNaN(n)) {
      this.onDiscountValueChange();
      return;
    }
    if (n < 0) {
      n = 0;
    } else if (this.form.controls.discountType.value === 'percent' && n > 100) {
      n = 100;
    }
    this.form.controls.discountAmount.setValue(n, { emitEvent: false });
    this.form.controls.discountAmount.updateValueAndValidity();
    this.onDiscountValueChange();
  }

  protected onMinimumPurchaseInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    if (raw === '') {
      this.onDiscountValueChange();
      return;
    }
    let n = Number(raw.replace(/,/g, ''));
    if (Number.isNaN(n)) {
      this.onDiscountValueChange();
      return;
    }
    if (n < 0) {
      n = 0;
    }
    this.form.controls.minimumPurchase.setValue(n, { emitEvent: false });
    this.form.controls.minimumPurchase.updateValueAndValidity();
    this.onDiscountValueChange();
  }

  protected applyFilters(): void {
    this.loadPage(1);
  }

  protected resetFilters(): void {
    this.filters.reset({
      search: '',
      discountType: '',
      status: '',
    });
    this.loadPage(1);
  }

  protected loadPage(page: number): void {
    this.loading.set(true);
    const { limit } = this.pagination();
    const filters = this.filters.getRawValue();

    this.coupons
      .listCoupons({
        page,
        limit,
        search: filters.search.trim() || undefined,
        discountType: filters.discountType || undefined,
        status: filters.status || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rows.set(res.coupons);
          this.pagination.set(res.pagination);
        },
        error: (err) => this.toastError(err?.error?.message ?? 'Failed to load coupons'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingId();
    const raw = this.form.getRawValue();
    const payload: CouponPayload = {
      couponTitle: raw.couponTitle.trim(),
      couponCode: raw.couponCode.trim().toUpperCase(),
      discountType: raw.discountType,
      discountAmount: raw.discountAmount,
      minimumPurchase: raw.minimumPurchase ?? 0,
      startDate: raw.startDate || null,
      expireDate: raw.expireDate || null,
      status: raw.status,
    };

    this.saving.set(true);
    const req = id ? this.coupons.updateCoupon(id, payload) : this.coupons.createCoupon(payload);
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

  protected edit(row: Coupon): void {
    this.editingId.set(row._id);
    this.form.reset({
      couponTitle: row.couponTitle,
      couponCode: row.couponCode,
      discountType: row.discountType,
      discountAmount: row.discountAmount,
      minimumPurchase: row.minimumPurchase ?? 0,
      startDate: this.toDateInput(row.startDate),
      expireDate: this.toDateInput(row.expireDate),
      status: row.status,
    });
    this.applyDiscountAmountValidators();
    this.form.updateValueAndValidity();
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      couponTitle: '',
      couponCode: '',
      discountType: 'percent',
      discountAmount: 0,
      minimumPurchase: 0,
      startDate: null,
      expireDate: null,
      status: 'active',
    });
    this.applyDiscountAmountValidators();
    this.form.updateValueAndValidity();
  }

  protected view(row: Coupon): void {
    void Swal.fire({
      title: row.couponTitle,
      html: `
        <div style="text-align:left">
          <p><strong>Code:</strong> ${row.couponCode}</p>
          <p><strong>Discount:</strong> ${this.formatDiscount(row)}</p>
          <p><strong>Minimum purchase:</strong> ${this.formatMoney(row.minimumPurchase)}</p>
          <p><strong>Status:</strong> ${row.status}</p>
          ${row.startDate ? `<p><strong>Start date:</strong> ${this.formatDate(row.startDate)}</p>` : ''}
          ${row.expireDate ? `<p><strong>Expire date:</strong> ${this.formatDate(row.expireDate)}</p>` : ''}
        </div>
      `,
      confirmButtonColor: '#0ea5e9',
    });
  }

  protected async delete(row: Coupon): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete coupon?',
      text: `"${row.couponTitle}" will be removed permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    this.coupons.deleteCoupon(row._id).subscribe({
      next: () => {
        void Swal.fire({ icon: 'success', title: 'Deleted', timer: 1400, showConfirmButton: false });
        this.loadPage(this.pagination().page);
      },
      error: (err) => this.toastError(err?.error?.message ?? 'Delete failed'),
    });
  }

  protected toggleStatus(row: Coupon, event: Event): void {
    const input = event.target as HTMLInputElement;
    const next: CategoryStatus = input.checked ? 'active' : 'inactive';
    if (row.status === next) return;

    this.coupons.updateCoupon(row._id, { status: next }).subscribe({
      next: () => {
        this.rows.update((list) => list.map((item) => (item._id === row._id ? { ...item, status: next } : item)));
        showStatusToggleSuccessModal(row.couponTitle, next);
      },
      error: (err) => {
        input.checked = row.status === 'active';
        this.toastError(err?.error?.message ?? 'Could not update status');
      },
    });
  }

  protected discountTypeLabel(type: CouponDiscountType): string {
    return this.discountTypes.find((item) => item.value === type)?.label ?? type;
  }

  protected formatDiscount(row: Coupon): string {
    return row.discountType === 'percent'
      ? `${row.discountAmount}%`
      : this.formatMoney(row.discountAmount);
  }

  protected formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
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

  private applyDiscountAmountValidators(): void {
    const type = this.form.controls.discountType.value;
    const ctrl = this.form.controls.discountAmount;
    if (type === 'percent') {
      ctrl.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
    } else {
      ctrl.setValidators([Validators.required, Validators.min(0)]);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  /** Flat: discount (rupees) must not exceed minimum purchase; percent uses 0–100 on the control only. */
  private discountRulesValidator(control: AbstractControl): ValidationErrors | null {
    const discountType = control.get('discountType')?.value as CouponDiscountType | null;
    if (discountType !== 'flat') {
      return null;
    }

    const discountAmount = Number(control.get('discountAmount')?.value);
    const minimumPurchaseRaw = control.get('minimumPurchase')?.value;
    const minimumPurchase = minimumPurchaseRaw === null || minimumPurchaseRaw === undefined || minimumPurchaseRaw === ''
      ? 0
      : Number(minimumPurchaseRaw);

    if (Number.isNaN(discountAmount) || Number.isNaN(minimumPurchase)) {
      return null;
    }

    if (discountAmount > minimumPurchase) {
      return { flatDiscountTooHigh: true };
    }

    return null;
  }

  private toastError(message: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: message });
  }
}
