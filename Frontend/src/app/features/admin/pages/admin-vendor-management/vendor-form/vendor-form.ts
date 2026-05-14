import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  Vendor,
  VendorAccountType,
  VendorApprovalStatus,
  VendorGender,
  VendorPayload,
  VendorService,
  VendorStatus,
} from '../../../../../core/services/admin-service/vendor.service';

const MIN_PASSWORD_LENGTH = 8;

function optionalPasswordValidator(control: { value: unknown }) {
  const v = String(control.value ?? '');
  if (!v) return null;
  return v.length >= MIN_PASSWORD_LENGTH ? null : { minPassword: true };
}

@Component({
  selector: 'app-admin-vendor-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './vendor-form.html',
  styleUrls: ['../../../admin.css'],
})
export class AdminVendorFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vendorsApi = inject(VendorService);
  private readonly router = inject(Router);

  /** When set, form runs in edit mode and is patched from this vendor. */
  readonly initialVendor = input<Vendor | null>(null);

  protected readonly saving = signal(false);
  private lastPatchedId: string | null = null;

  protected profileFile: File | null = null;
  protected aadhaarFrontFile: File | null = null;
  protected aadhaarBackFile: File | null = null;
  protected panCardFile: File | null = null;
  protected shopLogoFile: File | null = null;
  protected shopBannerFile: File | null = null;
  protected shopImageFiles: File[] = [];
  protected shopVideoFiles: File[] = [];

  protected readonly genders: VendorGender[] = ['male', 'female', 'other'];
  protected readonly accountTypes: VendorAccountType[] = ['Current', 'Savings'];
  protected readonly statuses: VendorStatus[] = ['active', 'inactive', 'blocked'];
  protected readonly approvals: VendorApprovalStatus[] = ['pending', 'approved', 'rejected', 'suspended'];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.maxLength(20)]],
    businessName: ['', [Validators.required, Validators.maxLength(200)]],
    password: ['', []],
    businessPhone: [''],
    gstin: [''],
    panCardNumber: [''],
    businessAddress: [''],
    bankName: [''],
    branchName: [''],
    accountNo: [''],
    ifsc: [''],
    accountType: this.fb.nonNullable.control<VendorAccountType>('Current'),
    gender: this.fb.nonNullable.control<VendorGender>('male'),
    dob: [''],
    fcm_id: [''],
    status: this.fb.nonNullable.control<VendorStatus>('active'),
    approvalStatus: this.fb.nonNullable.control<VendorApprovalStatus>('pending'),
  });

  constructor() {
    effect(() => {
      const v = this.initialVendor();
      untracked(() => {
        const pwdCtrl = this.form.controls.password;
        if (v?._id) {
          pwdCtrl.setValidators([optionalPasswordValidator]);
          pwdCtrl.updateValueAndValidity({ emitEvent: false });
          if (this.lastPatchedId === v._id) return;
          this.lastPatchedId = v._id;
          this.patchFromVendor(v);
        } else {
          this.lastPatchedId = null;
          this.resetFiles();
          this.form.reset({
            name: '',
            email: '',
            phone: '',
            businessName: '',
            password: '',
            businessPhone: '',
            gstin: '',
            panCardNumber: '',
            businessAddress: '',
            bankName: '',
            branchName: '',
            accountNo: '',
            ifsc: '',
            accountType: 'Current',
            gender: 'male',
            dob: '',
            fcm_id: '',
            status: 'active',
            approvalStatus: 'pending',
          });
          pwdCtrl.setValidators([Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]);
          pwdCtrl.updateValueAndValidity({ emitEvent: false });
        }
      });
    });
  }

  private resetFiles(): void {
    this.profileFile = null;
    this.aadhaarFrontFile = null;
    this.aadhaarBackFile = null;
    this.panCardFile = null;
    this.shopLogoFile = null;
    this.shopBannerFile = null;
    this.shopImageFiles = [];
    this.shopVideoFiles = [];
  }

  private patchFromVendor(v: Vendor): void {
    this.resetFiles();
    const dobStr = v.dob ? String(v.dob).slice(0, 10) : '';
    this.form.patchValue({
      name: v.name,
      email: v.email,
      phone: v.phone,
      businessName: v.businessName,
      password: '',
      businessPhone: v.businessPhone ?? '',
      gstin: v.gstin ?? '',
      panCardNumber: v.panCardNumber ?? '',
      businessAddress: v.businessAddress ?? '',
      bankName: v.bankName ?? '',
      branchName: v.branchName ?? '',
      accountNo: v.accountNo ?? '',
      ifsc: v.ifsc ?? '',
      accountType: (v.accountType as VendorAccountType) || 'Current',
      gender: (v.gender as VendorGender) || 'male',
      dob: dobStr,
      fcm_id: v.fcm_id ?? '',
      status: v.status,
      approvalStatus: v.approvalStatus,
    });
  }

  protected isEdit(): boolean {
    return Boolean(this.initialVendor()?._id);
  }

  protected onFilePick(
    event: Event,
    kind: 'profile' | 'aadhaarFront' | 'aadhaarBack' | 'pan' | 'shopLogo' | 'shopBanner' | 'shopImages' | 'shopVideos',
  ): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    if (kind === 'shopImages') {
      this.shopImageFiles = Array.from(files);
    } else if (kind === 'shopVideos') {
      this.shopVideoFiles = Array.from(files);
    } else {
      const f = files[0];
      if (kind === 'profile') this.profileFile = f;
      if (kind === 'aadhaarFront') this.aadhaarFrontFile = f;
      if (kind === 'aadhaarBack') this.aadhaarBackFile = f;
      if (kind === 'pan') this.panCardFile = f;
      if (kind === 'shopLogo') this.shopLogoFile = f;
      if (kind === 'shopBanner') this.shopBannerFile = f;
    }
    input.value = '';
  }

  protected clearPicked(kind: 'profile' | 'aadhaarFront' | 'aadhaarBack' | 'pan' | 'shopLogo' | 'shopBanner' | 'shopImages' | 'shopVideos'): void {
    if (kind === 'profile') this.profileFile = null;
    if (kind === 'aadhaarFront') this.aadhaarFrontFile = null;
    if (kind === 'aadhaarBack') this.aadhaarBackFile = null;
    if (kind === 'pan') this.panCardFile = null;
    if (kind === 'shopLogo') this.shopLogoFile = null;
    if (kind === 'shopBanner') this.shopBannerFile = null;
    if (kind === 'shopImages') this.shopImageFiles = [];
    if (kind === 'shopVideos') this.shopVideoFiles = [];
  }

  protected fileLabel(kind: 'profile' | 'aadhaarFront' | 'aadhaarBack' | 'pan' | 'shopLogo' | 'shopBanner' | 'shopImages' | 'shopVideos'): string {
    if (kind === 'shopImages') return this.shopImageFiles.length ? `${this.shopImageFiles.length} file(s)` : 'No new files';
    if (kind === 'shopVideos') return this.shopVideoFiles.length ? `${this.shopVideoFiles.length} file(s)` : 'No new files';
    const f =
      kind === 'profile'
        ? this.profileFile
        : kind === 'aadhaarFront'
          ? this.aadhaarFrontFile
          : kind === 'aadhaarBack'
            ? this.aadhaarBackFile
            : kind === 'pan'
              ? this.panCardFile
              : kind === 'shopLogo'
                ? this.shopLogoFile
                : this.shopBannerFile;
    return f?.name ?? 'No file chosen';
  }

  protected cancelLink(): string[] {
    const v = this.initialVendor();
    if (v?._id) return ['/admin/vendors', v._id];
    return ['/admin/vendors/list'];
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      void Swal.fire({ icon: 'warning', title: 'Check the form', text: 'Please fix validation errors.' });
      return;
    }

    const raw = this.form.getRawValue();
    const id = this.initialVendor()?._id;

    const payload: VendorPayload = {
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      phone: raw.phone.trim(),
      businessName: raw.businessName.trim(),
      businessPhone: raw.businessPhone.trim() || null,
      gstin: raw.gstin.trim() || null,
      panCardNumber: raw.panCardNumber.trim() || null,
      businessAddress: raw.businessAddress.trim() || null,
      bankName: raw.bankName.trim() || null,
      branchName: raw.branchName.trim() || null,
      accountNo: raw.accountNo.trim() || null,
      ifsc: raw.ifsc.trim() || null,
      accountType: raw.accountType,
      gender: raw.gender,
      fcm_id: raw.fcm_id.trim() || null,
      status: raw.status,
      approvalStatus: raw.approvalStatus,
    };

    const pwd = raw.password.trim();
    if (pwd) {
      payload.password = pwd;
    }

    if (raw.dob.trim()) {
      payload.dob = raw.dob.trim();
    } else if (id) {
      payload.dob = '';
    }

    if (this.profileFile) payload.file = this.profileFile;
    if (this.aadhaarFrontFile) payload.aadhaarCardFront = this.aadhaarFrontFile;
    if (this.aadhaarBackFile) payload.aadhaarCardBack = this.aadhaarBackFile;
    if (this.panCardFile) payload.panCardFront = this.panCardFile;
    if (this.shopLogoFile) payload.shopLogo = this.shopLogoFile;
    if (this.shopBannerFile) payload.shopBanner = this.shopBannerFile;
    if (this.shopImageFiles.length) payload.shopImages = [...this.shopImageFiles];
    if (this.shopVideoFiles.length) payload.shopVideos = [...this.shopVideoFiles];

    this.saving.set(true);
    const req = id
      ? this.vendorsApi.updateVendor(id, payload)
      : this.vendorsApi.createVendor(payload);

    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (res) => {
        void Swal.fire({
          icon: 'success',
          title: id ? 'Vendor updated' : 'Vendor created',
          timer: 1600,
          showConfirmButton: false,
        });
        void this.router.navigate(['/admin/vendors', res.vendor._id]);
      },
      error: (err) => {
        void Swal.fire({
          icon: 'error',
          title: 'Save failed',
          text: err?.error?.message ?? 'Unknown error',
        });
      },
    });
  }
}
