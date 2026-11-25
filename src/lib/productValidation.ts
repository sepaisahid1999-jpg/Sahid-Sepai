import { SCHEMA_LIMITS, UNIT_OPTIONS } from './constants.ts';
import type { Category, Product, ProductStatus } from '../types/index.ts';

export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const ALLOWED_PRODUCT_STATUSES: readonly ProductStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
];

export interface ProductValidationInput {
  sku: string;
  name: string;
  categoryId: string;
  description: string;
  unit: string;
  images: string[];
  lowStockThreshold: number | string;
  minOrderQty: number | string;
  status: ProductStatus;
}

export interface ProductValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Partial<Record<keyof ProductValidationInput, string>>;
}

export interface CategoryValidationInput {
  name: string;
  description?: string;
}

export interface CategoryValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Partial<Record<keyof CategoryValidationInput, string>>;
}

export interface ProductHistoryCounts {
  purchasesCount: number;
  salesCount: number;
  stockTransactionsCount: number;
  totalPurchaseQty: number;
  totalSalesQty: number;
}

export function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > SCHEMA_LIMITS.URL_MAX) return false;
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateImageFile(file: {
  name: string;
  size: number;
  type: string;
}): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: 'No image file provided.' };
  const normalizedType = (file.type || '').toLowerCase();
  if (!normalizedType.startsWith('image/')) {
    return {
      valid: false,
      error: `Unsupported file type for "${file.name}". Please select a JPG, PNG, WebP, GIF, or AVIF image.`,
    };
  }
  if (
    ALLOWED_IMAGE_MIME_TYPES.length > 0 &&
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      normalizedType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error: `Image format "${normalizedType}" is not supported. Use JPG, PNG, WebP, GIF, or AVIF.`,
    };
  }
  if (file.size <= 0) {
    return { valid: false, error: `File "${file.name}" is empty.` };
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return {
      valid: false,
      error: `Image "${file.name}" exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }
  return { valid: true };
}

export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export function validateProductInput(
  input: ProductValidationInput,
  existingProducts: Pick<Product, 'productId' | 'sku'>[] = [],
  editingProductId?: string
): ProductValidationResult {
  const fieldErrors: Partial<Record<keyof ProductValidationInput, string>> = {};
  const errors: string[] = [];

  const skuTrimmed = input.sku.trim();
  if (skuTrimmed.length < 2 || skuTrimmed.length > SCHEMA_LIMITS.SKU_MAX) {
    const msg = `SKU must be between 2 and ${SCHEMA_LIMITS.SKU_MAX} characters.`;
    fieldErrors.sku = msg;
    errors.push(msg);
  } else if (!/^[a-zA-Z0-9._-]+$/.test(skuTrimmed)) {
    const msg = 'SKU may only contain letters, numbers, hyphens (-), underscores (_), and dots (.).';
    fieldErrors.sku = msg;
    errors.push(msg);
  } else {
    const targetNorm = normalizeSku(skuTrimmed);
    const duplicate = existingProducts.find(
      (p) => p.productId !== editingProductId && normalizeSku(p.sku) === targetNorm
    );
    if (duplicate) {
      const msg = `SKU "${skuTrimmed}" is already assigned to another product.`;
      fieldErrors.sku = msg;
      errors.push(msg);
    }
  }

  const nameTrimmed = input.name.trim();
  if (nameTrimmed.length < 2 || nameTrimmed.length > SCHEMA_LIMITS.NAME_MAX) {
    const msg = `Product Name must be between 2 and ${SCHEMA_LIMITS.NAME_MAX} characters.`;
    fieldErrors.name = msg;
    errors.push(msg);
  }

  if (!input.categoryId.trim()) {
    const msg = 'Please select a valid product category.';
    fieldErrors.categoryId = msg;
    errors.push(msg);
  }

  const unitTrimmed = input.unit.trim();
  if (!UNIT_OPTIONS.includes(unitTrimmed as (typeof UNIT_OPTIONS)[number])) {
    const msg = `Unit "${unitTrimmed}" is not supported. Choose from: ${UNIT_OPTIONS.join(', ')}.`;
    fieldErrors.unit = msg;
    errors.push(msg);
  }

  if (input.description.trim().length > SCHEMA_LIMITS.DESCRIPTION_MAX) {
    const msg = `Description cannot exceed ${SCHEMA_LIMITS.DESCRIPTION_MAX} characters.`;
    fieldErrors.description = msg;
    errors.push(msg);
  }

  const lowStockNum = Number(input.lowStockThreshold);
  if (!Number.isFinite(lowStockNum) || lowStockNum < 0) {
    const msg = 'Low Stock Threshold must be a non-negative number (0 or greater).';
    fieldErrors.lowStockThreshold = msg;
    errors.push(msg);
  }

  const moqNum = Number(input.minOrderQty);
  if (!Number.isFinite(moqNum) || moqNum < 1) {
    const msg = 'Minimum Order Quantity (MOQ) must be at least 1.';
    fieldErrors.minOrderQty = msg;
    errors.push(msg);
  }

  if (!ALLOWED_PRODUCT_STATUSES.includes(input.status)) {
    const msg = 'Invalid product status.';
    fieldErrors.status = msg;
    errors.push(msg);
  }

  if (input.images.length > SCHEMA_LIMITS.IMAGES_MAX) {
    const msg = `You can attach at most ${SCHEMA_LIMITS.IMAGES_MAX} product images.`;
    fieldErrors.images = msg;
    errors.push(msg);
  } else {
    const invalidUrl = input.images.find((url) => !isSafeImageUrl(url));
    if (invalidUrl !== undefined) {
      const msg = 'All product images must use valid https://, http://, or workspace asset paths.';
      fieldErrors.images = msg;
      errors.push(msg);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

export function validateCategoryInput(
  input: CategoryValidationInput,
  existingCategories: Pick<Category, 'id' | 'name'>[] = [],
  editingCategoryId?: string
): CategoryValidationResult {
  const fieldErrors: Partial<Record<keyof CategoryValidationInput, string>> = {};
  const errors: string[] = [];

  const nameTrimmed = input.name.trim();
  if (nameTrimmed.length < 2 || nameTrimmed.length > SCHEMA_LIMITS.CATEGORY_MAX) {
    const msg = `Category name must be between 2 and ${SCHEMA_LIMITS.CATEGORY_MAX} characters.`;
    fieldErrors.name = msg;
    errors.push(msg);
  } else {
    const norm = nameTrimmed.toLowerCase();
    const duplicate = existingCategories.find(
      (c) => c.id !== editingCategoryId && c.name.trim().toLowerCase() === norm
    );
    if (duplicate) {
      const msg = `Category "${nameTrimmed}" already exists.`;
      fieldErrors.name = msg;
      errors.push(msg);
    }
  }

  if ((input.description || '').trim().length > 400) {
    const msg = 'Category description cannot exceed 400 characters.';
    fieldErrors.description = msg;
    errors.push(msg);
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

export function canHardDeleteProduct(counts: ProductHistoryCounts): {
  allowed: boolean;
  totalReferences: number;
  reason?: string;
} {
  const totalReferences =
    counts.purchasesCount + counts.salesCount + counts.stockTransactionsCount;
  const hasCounters = counts.totalPurchaseQty > 0 || counts.totalSalesQty > 0;

  if (totalReferences > 0 || hasCounters) {
    return {
      allowed: false,
      totalReferences,
      reason:
        'This product has historical purchase, sale, or stock ledger records. Permanent deletion is blocked to protect accounting integrity—please archive the product instead.',
    };
  }

  return { allowed: true, totalReferences: 0 };
}
