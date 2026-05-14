import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, fromEvent, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { MEDIA_URL } from '../../../../../core/config/api.config';
import { AttributeService, AttributeTitle, AttributeValue } from '../../../../../core/services/admin-service/attribute.service';
import { AuthService } from '../../../../../core/services/admin-service/auth.service';
import { Category, CategoryService, CategoryStatus } from '../../../../../core/services/admin-service/category.service';
import {
  Product,
  ProductCombination,
  ProductCombinationInput,
  ProductCreatePayload,
  ProductDiscountType,
  ProductRole,
  ProductService,
  ProductTaxType,
  ProductUpdatePayload,
  ProductVariantType,
} from '../../../../../core/services/admin-service/product.service';
import { SubCategory, SubCategoryService } from '../../../../../core/services/admin-service/subcategory.service';

const DISCOUNT_TYPES: Array<{ value: ProductDiscountType; label: string }> = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'flat', label: 'Flat amount' },
];

const TAX_TYPES: Array<{ value: ProductTaxType; label: string }> = [
  { value: 'inclusive', label: 'Inclusive' },
  { value: 'exclusive', label: 'Exclusive' },
];

const VARIANT_TYPES: Array<{ value: ProductVariantType; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'multi', label: 'Multi variant' },
];

type CombinationRowForm = FormGroup & {
  controls: {
    sku: AbstractControl<string>;
    price: AbstractControl<number>;
    discountValue: AbstractControl<number>;
    stock: AbstractControl<number>;
    status: AbstractControl<CategoryStatus>;
    attributes: FormArray<FormGroup>;
    existingImages: AbstractControl<string[]>;
  };
};

@Component({
  selector: 'app-product-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrls: ['../../../admin.css', './product-form.css'],
})
export class ProductFormComponent {
  /** When set, form loads product and submits as PATCH. */
  readonly productId = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly products = inject(ProductService);
  private readonly categories = inject(CategoryService);
  private readonly subcategories = inject(SubCategoryService);
  private readonly attributes = inject(AttributeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly variantPickerRoot = viewChild<ElementRef<HTMLElement>>('variantPickerRoot');

  protected readonly discountTypes = DISCOUNT_TYPES;
  protected readonly taxTypes = TAX_TYPES;
  protected readonly variantTypes = VARIANT_TYPES;

  protected readonly saving = signal(false);
  protected readonly loadingProduct = signal(false);
  protected readonly categoriesList = signal<Category[]>([]);
  protected readonly formSubcategories = signal<SubCategory[]>([]);
  protected readonly attributeTitlesList = signal<AttributeTitle[]>([]);
  protected readonly valuesByTitleId = signal<Record<string, AttributeValue[]>>({});
  protected readonly selectedAttributeTitleIds = signal<string[]>([]);
  protected readonly variantsLoading = signal(false);

  /** Attribute titles that can be used on variants (active only). */
  protected readonly activeAttributeTitles = computed(() =>
    this.attributeTitlesList().filter((t) => t.status === 'active'),
  );
  protected readonly thumbnailFile = signal<File | null>(null);
  protected readonly galleryFiles = signal<File[]>([]);
  protected readonly galleryPreviews = signal<string[]>([]);
  protected readonly existingThumbnailUrl = signal<string | null>(null);
  protected readonly existingGalleryUrls = signal<string[]>([]);
  protected readonly thumbnailBlobPreview = signal<string | null>(null);
  protected readonly combinationRowFiles = signal<Record<number, File[]>>({});
  /** Object URLs for pending combination row files (must revoke on remove / destroy). */
  private readonly combinationRowPreviewUrls = signal<Record<number, string[]>>({});

  protected readonly variantPanelTab = signal<'variants' | 'images'>('variants');
  protected readonly variantPickerOpen = signal(false);

  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    slug: this.fb.nonNullable.control(''),
    sku: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(80)]),
    description: this.fb.nonNullable.control('', [Validators.required]),
    shortDescription: this.fb.nonNullable.control(''),
    category: this.fb.nonNullable.control('', [Validators.required]),
    subCategory: this.fb.nonNullable.control('', [Validators.required]),
    moq: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    price: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    stock: this.fb.nonNullable.control(0, [Validators.min(0)]),
    discountType: this.fb.nonNullable.control<ProductDiscountType>('percentage', [Validators.required]),
    discountValue: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    taxType: this.fb.nonNullable.control<ProductTaxType>('inclusive', [Validators.required]),
    taxValue: this.fb.nonNullable.control(0, [Validators.min(0)]),
    variantType: this.fb.nonNullable.control<ProductVariantType>('single', [Validators.required]),
    status: this.fb.nonNullable.control<CategoryStatus>('active', [Validators.required]),
    role: this.fb.nonNullable.control<ProductRole>('Admin', [Validators.required]),
    adminApproved: this.fb.nonNullable.control(false),
    addedById: this.fb.nonNullable.control('', [Validators.required]),
    thumbnailUrl: this.fb.nonNullable.control(''),
    combinations: this.fb.array<CombinationRowForm>([]),
  });

  private lastLoadKey: string | null = null;

  constructor() {
    this.form.addValidators(() => this.discountValidator());
    this.loadCategoriesAndTitles();
    this.form.controls.category.valueChanges.subscribe((catId) => {
      this.form.patchValue({ subCategory: '' }, { emitEvent: false });
      if (catId) this.loadFormSubcategories(catId);
      else this.formSubcategories.set([]);
    });
    this.form.controls.variantType.valueChanges.subscribe((vt) => {
      if (vt === 'single') {
        this.clearCombinations();
        this.selectedAttributeTitleIds.set([]);
        this.clearCombinationRowUploadState();
        this.variantPanelTab.set('variants');
        this.variantPickerOpen.set(false);
      }
    });
    this.form.controls.discountType.valueChanges.subscribe(() => {
      this.applyDiscountValueValidators();
    });
    this.form.controls.discountValue.valueChanges.subscribe(() => this.form.updateValueAndValidity());
    this.applyDiscountValueValidators();

    effect(() => {
      const id = this.productId();
      const key = id ?? '';
      untracked(() => {
        if (this.lastLoadKey === key) return;
        this.lastLoadKey = key;
        if (id) this.loadProductById(id);
        else this.resetForCreate();
      });
    });

    this.destroyRef.onDestroy(() => {
      this.revokeGalleryPreviews();
      this.revokeThumbnailBlob();
      this.clearCombinationRowUploadState();
    });

    fromEvent(this.document, 'click')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: Event) => {
        if (!this.variantPickerOpen()) return;
        const root = this.variantPickerRoot()?.nativeElement;
        if (!root) return;
        const target = event.target;
        if (target instanceof Node && !root.contains(target)) {
          this.variantPickerOpen.set(false);
        }
      });
  }

  protected isEdit(): boolean {
    return Boolean(this.productId());
  }

  protected get combinations(): FormArray<CombinationRowForm> {
    return this.form.controls.combinations as FormArray<CombinationRowForm>;
  }

  protected get nameLength(): number {
    return this.form.controls.name.value.length;
  }

  protected mediaSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : `${MEDIA_URL}${path}`;
  }

  protected refId(ref: string | { _id: string } | undefined | null): string {
    if (!ref) return '';
    return typeof ref === 'string' ? ref : ref._id;
  }

  /** Titles not yet selected (for add dropdown). */
  protected readonly availableTitlesForPicker = computed(() => {
    const sel = new Set(this.selectedAttributeTitleIds());
    return this.activeAttributeTitles().filter((t) => !sel.has(t._id));
  });

  protected setVariantPanelTab(tab: 'variants' | 'images'): void {
    this.variantPanelTab.set(tab);
  }

  protected toggleVariantPicker(event?: Event): void {
    event?.stopPropagation();
    this.variantPickerOpen.update((v) => !v);
  }

  protected closeVariantPicker(): void {
    this.variantPickerOpen.set(false);
  }

  protected combinationFileCount(rowIndex: number): number {
    return this.combinationRowFiles()[rowIndex]?.length ?? 0;
  }

  protected existingCombinationImageCount(rowIndex: number): number {
    return this.existingCombinationImages(rowIndex).length;
  }

  /** Server-side image paths already on this combination (edit). */
  protected existingCombinationImages(rowIndex: number): string[] {
    const g = this.comboGroupAt(rowIndex) as CombinationRowForm;
    const list = g.controls.existingImages?.getRawValue();
    return Array.isArray(list) ? list.map(String).filter(Boolean) : [];
  }

  protected removeExistingCombinationImage(rowIndex: number, imageIndex: number): void {
    const row = this.combinations.at(rowIndex) as CombinationRowForm;
    const cur = this.existingCombinationImages(rowIndex);
    if (imageIndex < 0 || imageIndex >= cur.length) return;
    const next = cur.filter((_, i) => i !== imageIndex);
    row.controls.existingImages.setValue(next);
  }

  protected combinationPendingPreviewUrls(rowIndex: number): string[] {
    return this.combinationRowPreviewUrls()[rowIndex] ?? [];
  }

  protected onCombinationFileInputClick(event: Event): void {
    (event.target as HTMLInputElement).value = '';
  }

  protected onCombinationImagesSelected(rowIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const incoming = input.files ? Array.from(input.files) : [];
    const prev = this.combinationRowFiles()[rowIndex] ?? [];
    const merged = this.appendUniqueFiles(prev, incoming);
    this.replaceRowPendingCombinationFiles(rowIndex, merged);
    input.value = '';
  }

  protected removeCombinationPendingFile(rowIndex: number, fileIndex: number): void {
    const cur = [...(this.combinationRowFiles()[rowIndex] ?? [])];
    if (fileIndex < 0 || fileIndex >= cur.length) return;
    cur.splice(fileIndex, 1);
    this.replaceRowPendingCombinationFiles(rowIndex, cur);
  }

  protected removeCombinationRow(index: number): void {
    const previews = this.combinationRowPreviewUrls();
    const files = this.combinationRowFiles();
    const dropped = previews[index];
    if (dropped?.length) this.revokeObjectUrls(dropped);

    this.combinations.removeAt(index);

    const nextFiles: Record<number, File[]> = {};
    const nextPreviews: Record<number, string[]> = {};
    Object.entries(files).forEach(([k, v]) => {
      const i = Number(k);
      if (i < index) {
        nextFiles[i] = v;
        const pu = previews[i];
        if (pu?.length) nextPreviews[i] = pu;
      } else if (i > index) {
        nextFiles[i - 1] = v;
        const pu = previews[i];
        if (pu?.length) nextPreviews[i - 1] = pu;
      }
    });
    this.combinationRowFiles.set(nextFiles);
    this.combinationRowPreviewUrls.set(nextPreviews);
  }

  private fileFingerprint(f: File): string {
    return `${f.name}-${f.size}-${f.lastModified}`;
  }

  private appendUniqueFiles(existing: File[], more: File[]): File[] {
    const seen = new Set(existing.map((f) => this.fileFingerprint(f)));
    const out = [...existing];
    for (const f of more) {
      const k = this.fileFingerprint(f);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(f);
      }
    }
    return out;
  }

  private replaceRowPendingCombinationFiles(rowIndex: number, files: File[]): void {
    const prevUrls = this.combinationRowPreviewUrls()[rowIndex];
    if (prevUrls?.length) this.revokeObjectUrls(prevUrls);
    const nextUrls = files.map((f) => URL.createObjectURL(f));
    this.combinationRowPreviewUrls.update((m) => {
      const next = { ...m };
      if (files.length === 0) delete next[rowIndex];
      else next[rowIndex] = nextUrls;
      return next;
    });
    this.combinationRowFiles.update((m) => {
      const next = { ...m };
      if (files.length === 0) delete next[rowIndex];
      else next[rowIndex] = files;
      return next;
    });
  }

  private clearCombinationRowUploadState(): void {
    for (const urls of Object.values(this.combinationRowPreviewUrls())) {
      if (urls?.length) this.revokeObjectUrls(urls);
    }
    this.combinationRowPreviewUrls.set({});
    this.combinationRowFiles.set({});
  }

  private revokeObjectUrls(urls: string[]): void {
    for (const u of urls) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* noop */
      }
    }
  }

  protected addVariantTitle(titleId: string): void {
    if (this.form.controls.variantType.value !== 'multi') return;
    const cur = this.selectedAttributeTitleIds();
    if (cur.includes(titleId)) return;
    const sorted = this.sortTitleIdsByDisplayOrder([...cur, titleId]);
    this.applyVariantTitleSelection(sorted);
    this.variantPickerOpen.set(false);
  }

  protected removeVariantTitle(titleId: string): void {
    if (this.form.controls.variantType.value !== 'multi') return;
    const sorted = this.sortTitleIdsByDisplayOrder(this.selectedAttributeTitleIds().filter((id) => id !== titleId));
    this.applyVariantTitleSelection(sorted);
  }

  protected clearAllVariantTitles(): void {
    if (this.form.controls.variantType.value !== 'multi') return;
    this.applyVariantTitleSelection([]);
    this.variantPickerOpen.set(false);
  }

  /** Re-fetch values and rebuild the Cartesian product of variant rows. */
  protected refreshVariantCombinations(): void {
    const titles = this.selectedAttributeTitleIds();
    if (!titles.length) {
      void Swal.fire({ icon: 'info', title: 'Select variants', text: 'Choose at least one variant title first.' });
      return;
    }
    this.variantPanelTab.set('variants');
    this.loadValuesAndGenerateCombinations(titles);
  }

  /** Active values for dropdown; includes current value if missing from active list (e.g. inactive on edit). */
  protected variantValueSelectOptions(rowIndex: number, attrIndex: number): AttributeValue[] {
    const tid = this.attributeTitleIdAt(rowIndex, attrIndex);
    const list = this.valuesForTitle(tid);
    const active = list.filter((v) => v.status === 'active');
    const base = active.length > 0 ? active : list;
    const cur = String(
      (this.attributeControlsAt(rowIndex).at(attrIndex) as FormGroup).get('attributeValue')?.value ?? '',
    );
    const chosen = list.find((v) => v._id === cur);
    if (chosen && !base.some((v) => v._id === chosen._id)) {
      return [chosen, ...base];
    }
    return base;
  }

  /** Add one empty combination row (dropdowns per selected title) when auto-generation is not possible or for custom combos. */
  protected addManualCombinationRow(): void {
    if (this.form.controls.variantType.value !== 'multi') return;
    const titleIds = this.selectedAttributeTitleIds();
    if (!titleIds.length) {
      void Swal.fire({ icon: 'info', title: 'Select variants', text: 'Choose at least one variant title first.' });
      return;
    }
    titleIds.forEach((tid) => this.ensureValuesLoaded(tid));
    const attrs = this.fb.array(
      titleIds.map((tid) =>
        this.fb.group({
          attributeTitle: this.fb.nonNullable.control(tid),
          attributeValue: this.fb.control<string>('', { validators: [Validators.required] }),
        }),
      ),
    );
    const skuBase = Date.now();
    const basePrice = Number(this.form.controls.price.value) || 1;
    const baseStock = Number(this.form.controls.stock.value) || 0;
    const row = this.fb.group({
      sku: this.fb.nonNullable.control(this.makeVariantSku(skuBase), [Validators.required]),
      price: this.fb.nonNullable.control(basePrice, [Validators.required, Validators.min(1)]),
      discountValue: this.fb.nonNullable.control(0, [Validators.min(0)]),
      stock: this.fb.nonNullable.control(baseStock, [Validators.min(0)]),
      status: this.fb.nonNullable.control<CategoryStatus>('active'),
      attributes: attrs,
      existingImages: this.fb.nonNullable.control<string[]>([]),
    }) as CombinationRowForm;
    this.combinations.push(row);
    this.variantPanelTab.set('variants');
  }
  protected displayVariantColumnTitleIds(): string[] {
    if (this.combinations.length === 0) return this.selectedAttributeTitleIds();
    const n = this.attributeControlsAt(0).length;
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      out.push(this.attributeTitleIdAt(0, i));
    }
    return out;
  }

  protected comboGroupAt(i: number): FormGroup {
    return this.combinations.at(i) as FormGroup;
  }

  protected attrGroupAt(rowIndex: number, attrIndex: number): FormGroup {
    return this.attributeControlsAt(rowIndex).at(attrIndex) as FormGroup;
  }

  protected onVariantTypeChange(): void {
    this.applyDiscountValueValidators();
    if (this.form.controls.variantType.value === 'single') {
      this.clearCombinations();
      this.selectedAttributeTitleIds.set([]);
      this.clearCombinationRowUploadState();
      this.variantPanelTab.set('variants');
      this.variantPickerOpen.set(false);
    }
  }

  /** Apply sorted title ids: clear rows/files, then load + generate when non-empty. */
  private applyVariantTitleSelection(sortedIds: string[]): void {
    if (this.form.controls.variantType.value !== 'multi') return;
    this.selectedAttributeTitleIds.set(sortedIds);
    this.clearCombinations();
    this.clearCombinationRowUploadState();
    if (!sortedIds.length) return;
    this.loadValuesAndGenerateCombinations(sortedIds);
  }

  protected onDiscountTypeChange(): void {
    this.applyDiscountValueValidators();
    this.form.controls.discountValue.updateValueAndValidity();
  }

  protected blockMinusExponentKeys(event: KeyboardEvent): void {
    if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  protected onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.revokeThumbnailBlob();
    this.thumbnailFile.set(file);
    this.form.controls.thumbnailUrl.setValue('');
    if (file) {
      this.thumbnailBlobPreview.set(URL.createObjectURL(file));
    }
  }

  protected onGallerySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.revokeGalleryPreviews();
    this.galleryFiles.set(files);
    this.galleryPreviews.set(files.map((f) => URL.createObjectURL(f)));
  }

  protected attributeTitleLabel(id: string): string {
    return this.attributeTitlesList().find((t) => t._id === id)?.title ?? id;
  }

  protected valuesForTitle(titleId: string): AttributeValue[] {
    return this.valuesByTitleId()[titleId] ?? [];
  }

  protected attributeControlsAt(rowIndex: number): FormArray<FormGroup> {
    const row = this.combinations.at(rowIndex) as CombinationRowForm;
    return row.controls.attributes as FormArray<FormGroup>;
  }

  protected attributeTitleIdAt(rowIndex: number, attrIndex: number): string {
    const g = this.attributeControlsAt(rowIndex).at(attrIndex) as FormGroup;
    return String(g.get('attributeTitle')?.value ?? '');
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const vt = this.form.controls.variantType.value;
    const combos = this.mapCombinationsFromForm();
    if (vt === 'multi' && combos.length === 0) {
      void Swal.fire({ icon: 'warning', title: 'Combinations required', text: 'Add at least one variant combination.' });
      return;
    }
    if (vt === 'single' && combos.length > 0) {
      void Swal.fire({ icon: 'warning', title: 'Invalid combinations', text: 'Single variant products cannot have combinations.' });
      return;
    }

    const raw = this.form.getRawValue();
    const thumbFile = this.thumbnailFile();
    const thumbUrl = raw.thumbnailUrl.trim();
    const existing = this.existingThumbnailUrl();
    if (!thumbFile && !thumbUrl && !existing) {
      void Swal.fire({ icon: 'warning', title: 'Thumbnail required', text: 'Upload a thumbnail image or enter an image URL.' });
      return;
    }

    const attributeTitles = vt === 'multi' ? [...this.selectedAttributeTitleIds()] : ([] as string[]);
    const id = this.productId();
    const comboFiles = this.combinationRowFiles();
    const combinationImageGroups =
      Object.keys(comboFiles).length > 0
        ? Object.entries(comboFiles)
            .map(([k, files]) => ({ comboIndex: Number(k), files }))
            .filter((x) => x.files.length > 0)
        : [];
    const combinationImages = combinationImageGroups.length ? combinationImageGroups : undefined;

    const galleryList = this.galleryFiles();
    const imagesForUpdate =
      id && galleryList.length ? [...this.existingGalleryUrls()] : id ? undefined : ([] as string[]);

    const basePayload = {
      name: raw.name.trim(),
      slug: raw.slug.trim() || undefined,
      sku: raw.sku.trim(),
      description: raw.description.trim(),
      shortDescription: raw.shortDescription.trim() || undefined,
      category: raw.category,
      subCategory: raw.subCategory,
      moq: Number(raw.moq),
      price: Number(raw.price),
      stock: Number(raw.stock),
      discountType: raw.discountType,
      discountValue: Number(raw.discountValue),
      taxType: raw.taxType,
      taxValue: Number(raw.taxValue),
      variantType: vt,
      thumbnail: !thumbFile && !thumbUrl && existing ? existing : thumbUrl || undefined,
      ...(imagesForUpdate !== undefined ? { images: imagesForUpdate } : {}),
      combinations: vt === 'single' ? [] : combos,
      attributeTitles,
      status: raw.status,
      role: raw.role,
      adminApproved: raw.adminApproved,
      addedById: raw.addedById.trim(),
      thumbnailFile: thumbFile ?? undefined,
      imageFiles: galleryList.length ? galleryList : undefined,
      combinationImages,
    };

    this.saving.set(true);
    if (id) {
      const updateBody: ProductUpdatePayload = {
        ...basePayload,
        combinations: basePayload.combinations,
        attributeTitles: basePayload.attributeTitles,
      };
      this.products
        .updateProduct(id, updateBody)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            void Swal.fire({ icon: 'success', title: 'Updated', timer: 1400, showConfirmButton: false });
            void this.router.navigate(['/admin', 'products', id]);
          },
          error: (err) => this.toastError(err?.error?.message ?? 'Update failed'),
        });
    } else {
      const createBody: ProductCreatePayload = {
        ...(basePayload as Omit<ProductCreatePayload, 'images'>),
        images: [],
      };
      this.products
        .createProduct(createBody)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (res) => {
            void Swal.fire({ icon: 'success', title: 'Created', timer: 1400, showConfirmButton: false });
            void this.router.navigate(['/admin', 'products', res.product._id]);
          },
          error: (err) => this.toastError(err?.error?.message ?? 'Create failed'),
        });
    }
  }

  protected thumbnailPreviewUrl(): string | null {
    return this.thumbnailBlobPreview() ?? this.mediaSrc(this.existingThumbnailUrl());
  }

  private loadProductById(id: string): void {
    this.loadingProduct.set(true);
    this.valuesByTitleId.set({});
    this.products.getProductById(id).subscribe({
      next: (res) => {
        this.populateFromProduct(res.product);
        this.loadingProduct.set(false);
      },
      error: (err) => {
        this.loadingProduct.set(false);
        this.toastError(err?.error?.message ?? 'Product not found');
        void this.router.navigate(['/admin', 'products']);
      },
    });
  }

  private populateFromProduct(row: Product): void {
    this.thumbnailFile.set(null);
    this.revokeThumbnailBlob();
    this.galleryFiles.set([]);
    this.revokeGalleryPreviews();
    this.clearCombinationRowUploadState();
    this.existingThumbnailUrl.set(row.thumbnail);
    this.existingGalleryUrls.set(row.images ?? []);
    const catId = this.refId(row.category as string | { _id: string });
    const titleIds = (row.attributeTitles ?? []).map((t) => (typeof t === 'string' ? t : t._id));
    this.selectedAttributeTitleIds.set(titleIds);
    this.form.reset({
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      description: row.description,
      shortDescription: row.shortDescription ?? '',
      category: catId,
      subCategory: this.refId(row.subCategory as string | { _id: string }),
      moq: row.moq,
      price: row.price,
      stock: row.stock,
      discountType: row.discountType,
      discountValue: row.discountValue,
      taxType: row.taxType,
      taxValue: row.taxValue,
      variantType: row.variantType,
      status: row.status,
      role: row.role,
      adminApproved: row.adminApproved ?? false,
      addedById: this.refId(row.addedById as string | { _id: string }),
      thumbnailUrl: '',
      combinations: [],
    });
    if (catId) this.loadFormSubcategories(catId);
    this.setCombinationsFromProduct(row.combinations ?? []);
    titleIds.forEach((tid) => this.ensureValuesLoaded(tid));
    this.applyDiscountValueValidators();
    this.form.updateValueAndValidity();
  }

  private resetForCreate(): void {
    this.thumbnailFile.set(null);
    this.revokeThumbnailBlob();
    this.galleryFiles.set([]);
    this.revokeGalleryPreviews();
    this.clearCombinationRowUploadState();
    this.existingThumbnailUrl.set(null);
    this.existingGalleryUrls.set([]);
    this.selectedAttributeTitleIds.set([]);
    this.clearCombinations();
    this.valuesByTitleId.set({});
    const adminId = this.auth.adminUser()?._id ?? '';
    this.form.reset({
      name: '',
      slug: '',
      sku: '',
      description: '',
      shortDescription: '',
      category: '',
      subCategory: '',
      moq: 1,
      price: 1,
      stock: 0,
      discountType: 'percentage',
      discountValue: 0,
      taxType: 'inclusive',
      taxValue: 0,
      variantType: 'single',
      status: 'active',
      role: 'Admin',
      adminApproved: false,
      addedById: adminId,
      thumbnailUrl: '',
      combinations: [],
    });
    this.formSubcategories.set([]);
    this.applyDiscountValueValidators();
  }

  private revokeThumbnailBlob(): void {
    const u = this.thumbnailBlobPreview();
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* noop */
      }
    }
    this.thumbnailBlobPreview.set(null);
  }

  private discountValidator(): ValidationErrors | null {
    const type = this.form.controls.discountType.value;
    const v = Number(this.form.controls.discountValue.value);
    if (Number.isNaN(v)) return null;
    if (type === 'percentage' && v > 100) return { percentTooHigh: true };
    return null;
  }

  private applyDiscountValueValidators(): void {
    const ctrl = this.form.controls.discountValue;
    const type = this.form.controls.discountType.value;
    if (type === 'percentage') {
      ctrl.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
    } else {
      ctrl.setValidators([Validators.required, Validators.min(0)]);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private clearCombinations(): void {
    while (this.combinations.length) {
      this.combinations.removeAt(0);
    }
  }

  private mapCombinationsFromForm(): ProductCombinationInput[] {
    return this.combinations.controls.map((ctrl: AbstractControl) => {
      const g = ctrl as CombinationRowForm;
      const v = g.getRawValue() as {
        sku: string;
        price: number;
        discountValue: number;
        stock: number;
        status: CategoryStatus;
        attributes: Array<{ attributeTitle: string; attributeValue: string }>;
        existingImages: string[];
      };
      const attrs = (g.controls.attributes as FormArray).controls.map((a) => {
        const av = (a as FormGroup).getRawValue() as { attributeTitle: string; attributeValue: string };
        return { attributeTitle: av.attributeTitle, attributeValue: av.attributeValue };
      });
      return {
        sku: v.sku.trim(),
        price: Number(v.price),
        discountValue: Number(v.discountValue ?? 0),
        stock: Number(v.stock ?? 0),
        status: v.status,
        attributes: attrs,
        images: v.existingImages?.filter(Boolean) ?? [],
      };
    });
  }

  private setCombinationsFromProduct(rows: ProductCombination[]): void {
    this.clearCombinations();
    for (const row of rows) {
      const titles = row.attributes.map((a) => this.refId(a.attributeTitle));
      const attrs = this.fb.array(
        row.attributes.map((a) =>
          this.fb.group({
            attributeTitle: this.fb.nonNullable.control(this.refId(a.attributeTitle)),
            attributeValue: this.fb.control<string>(this.refId(a.attributeValue), {
              nonNullable: true,
              validators: [Validators.required],
            }),
          }),
        ),
      );
      const fg = this.fb.group({
        sku: this.fb.nonNullable.control(row.sku, [Validators.required]),
        price: this.fb.nonNullable.control(row.price, [Validators.required, Validators.min(1)]),
        discountValue: this.fb.nonNullable.control(row.discountValue, [Validators.min(0)]),
        stock: this.fb.nonNullable.control(row.stock, [Validators.min(0)]),
        status: this.fb.nonNullable.control<CategoryStatus>(row.status),
        attributes: attrs,
        existingImages: this.fb.nonNullable.control<string[]>(row.images ?? []),
      }) as CombinationRowForm;
      this.combinations.push(fg);
      titles.forEach((tid) => this.ensureValuesLoaded(tid));
    }
  }

  private ensureValuesLoaded(titleId: string): void {
    if (!titleId || this.valuesByTitleId()[titleId]?.length) return;
    this.attributes.listAttributeValues({ attributeTitle: titleId, limit: 500, page: 1 }).subscribe({
      next: (res) => {
        this.valuesByTitleId.update((m) => ({ ...m, [titleId]: res.attributeValues }));
      },
      error: () => {},
    });
  }

  private sortTitleIdsByDisplayOrder(ids: string[]): string[] {
    const order = new Map(this.activeAttributeTitles().map((t, i) => [t._id, i]));
    return [...ids].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
  }

  private loadValuesAndGenerateCombinations(titleIds: string[]): void {
    if (!titleIds.length) return;
    this.variantsLoading.set(true);
    const requests = titleIds.map((tid) =>
      this.attributes.listAttributeValues({ attributeTitle: tid, limit: 500, page: 1 }).pipe(
        catchError(() => of({ attributeValues: [] as AttributeValue[] })),
      ),
    );
    forkJoin(requests)
      .pipe(finalize(() => this.variantsLoading.set(false)))
      .subscribe({
        next: (results) => {
          this.valuesByTitleId.update((m) => {
            const next = { ...m };
            titleIds.forEach((tid, i) => {
              next[tid] = results[i].attributeValues;
            });
            return next;
          });
          this.generateCombinationRowsFromCartesian(titleIds);
        },
      });
  }

  private cartesianProduct<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restProd = this.cartesianProduct(rest);
    const out: T[][] = [];
    for (const item of first) {
      for (const combo of restProd) {
        out.push([item, ...combo]);
      }
    }
    return out;
  }

  private makeVariantSku(skuBase: number): string {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SKU-${skuBase}-${rand}`;
  }

  private generateCombinationRowsFromCartesian(titleIds: string[]): void {
    const activeVals = (id: string) =>
      (this.valuesByTitleId()[id] ?? []).filter((v) => v.status === 'active');
    const arrays = titleIds.map((id) => activeVals(id));
    if (arrays.some((a) => a.length === 0)) {
      void Swal.fire({
        icon: 'info',
        title: 'Variant values',
        text:
          'One or more selected variant titles have no active values yet. Add active values under Attributes, or use "Add combination row" to create a row and pick values from the dropdowns.',
      });
      return;
    }
    this.clearCombinationRowUploadState();
    this.clearCombinations();
    const combos = this.cartesianProduct(arrays);
    const basePrice = Number(this.form.controls.price.value) || 1;
    const baseStock = Number(this.form.controls.stock.value) || 0;
    const skuBase = Date.now();
    for (const combo of combos) {
      const attrs = this.fb.array(
        titleIds.map((tid, i) => {
          const val = combo[i] as AttributeValue;
          return this.fb.group({
            attributeTitle: this.fb.nonNullable.control(tid),
            attributeValue: this.fb.control<string>(val._id, {
              nonNullable: true,
              validators: [Validators.required],
            }),
          });
        }),
      );
      const row = this.fb.group({
        sku: this.fb.nonNullable.control(this.makeVariantSku(skuBase), [Validators.required]),
        price: this.fb.nonNullable.control(basePrice, [Validators.required, Validators.min(1)]),
        discountValue: this.fb.nonNullable.control(0, [Validators.min(0)]),
        stock: this.fb.nonNullable.control(baseStock, [Validators.min(0)]),
        status: this.fb.nonNullable.control<CategoryStatus>('active'),
        attributes: attrs,
        existingImages: this.fb.nonNullable.control<string[]>([]),
      }) as CombinationRowForm;
      this.combinations.push(row);
    }
  }

  private loadCategoriesAndTitles(): void {
    this.categories.listCategories({ page: 1, limit: 500 }).subscribe({
      next: (res) => this.categoriesList.set(res.categories),
      error: () => {},
    });
    this.attributes.listAttributeTitles({ page: 1, limit: 500 }).subscribe({
      next: (res) => this.attributeTitlesList.set(res.attributeTitles),
      error: () => {},
    });
  }

  private loadFormSubcategories(categoryId: string): void {
    this.subcategories.listSubCategories({ category: categoryId, page: 1, limit: 500 }).subscribe({
      next: (res) => this.formSubcategories.set(res.subCategories),
      error: () => this.formSubcategories.set([]),
    });
  }

  private revokeGalleryPreviews(): void {
    for (const url of this.galleryPreviews()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
    this.galleryPreviews.set([]);
  }

  private toastError(message: string): void {
    void Swal.fire({ icon: 'error', title: 'Error', text: message });
  }
}
