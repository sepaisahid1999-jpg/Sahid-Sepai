import type {
  Purchase,
  PurchasePaymentStatus,
  PurchaseType,
} from '../types';

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const PAYMENT_STATUS_OPTIONS: {
  value: PurchasePaymentStatus;
  label: string;
}[] = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CREDIT', label: 'Supplier Credit' },
];

export interface PurchaseCostBreakdown {
  baseAmount: number;
  freightAmount: number;
  otherExpenses: number;
  taxAmount: number;
  discount: number;
  capitalizableExpenses: number;
  netInventoryCost: number;
}

/**
 * Inventory Cost = Purchase Amount (Qty * Rate) + Capitalizable Direct Expenses (Freight + Other Expenses + Applicable Tax) - Relevant Discounts.
 */
export function calculateDetailedPurchaseCost(input: {
  quantity: number;
  purchaseRate: number;
  freightAmount?: number;
  otherExpenses?: number;
  taxAmount?: number;
  discount?: number;
}): PurchaseCostBreakdown {
  const qty = Math.max(0, Number(input.quantity) || 0);
  const rate = Math.max(0, Number(input.purchaseRate) || 0);
  const freightAmount = round2(Math.max(0, Number(input.freightAmount) || 0));
  const otherExpenses = round2(Math.max(0, Number(input.otherExpenses) || 0));
  const taxAmount = round2(Math.max(0, Number(input.taxAmount) || 0));
  const discount = round2(Math.max(0, Number(input.discount) || 0));

  const baseAmount = round2(qty * rate);
  const capitalizableExpenses = round2(freightAmount + otherExpenses + taxAmount);
  const grossWithExpenses = round2(baseAmount + capitalizableExpenses);
  const netInventoryCost = Math.max(0, round2(grossWithExpenses - discount));

  return {
    baseAmount,
    freightAmount,
    otherExpenses,
    taxAmount,
    discount,
    capitalizableExpenses,
    netInventoryCost,
  };
}

export function getPurchaseSign(type: PurchaseType): 1 | -1 {
  return type === 'RETURN_TO_SUPPLIER' || type === 'CANCELLATION_REVERSAL' ? -1 : 1;
}

export function getReversedPurchaseIdSet(purchases: Purchase[]): Set<string> {
  const reversed = new Set<string>();
  for (const p of purchases) {
    if (p.type === 'CANCELLATION_REVERSAL' && p.referencePurchaseId) {
      reversed.add(p.referencePurchaseId);
    }
  }
  return reversed;
}

export function normalizePartyInvoiceKey(
  supplierId: string,
  supplierName: string,
  invoiceNumber: string
): string {
  const party = supplierId.trim()
    ? supplierId.trim().toLowerCase()
    : supplierName.trim().toLowerCase().replace(/\s+/g, ' ');
  const inv = invoiceNumber.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${party}::${inv}`;
}

export function isDuplicateSupplierInvoice(
  purchases: Purchase[],
  params: {
    supplierId: string;
    supplierName: string;
    invoiceNumber: string;
    type: PurchaseType;
    ignorePurchaseId?: string;
  }
): Purchase | null {
  if (params.type !== 'PURCHASE') return null;
  const invTrimmed = params.invoiceNumber.trim();
  if (!invTrimmed) return null;

  const targetKey = normalizePartyInvoiceKey(
    params.supplierId,
    params.supplierName,
    invTrimmed
  );
  const reversedIds = getReversedPurchaseIdSet(purchases);

  for (const p of purchases) {
    if (p.type !== 'PURCHASE') continue;
    if (p.id === params.ignorePurchaseId || p.purchaseId === params.ignorePurchaseId) continue;
    if (reversedIds.has(p.id) || (p.purchaseId && reversedIds.has(p.purchaseId))) continue;

    const existingKey = normalizePartyInvoiceKey(
      p.supplierId || '',
      p.supplierName || '',
      p.invoiceNumber || ''
    );
    if (existingKey === targetKey) {
      return p;
    }
  }
  return null;
}

export interface PurchaseInputToValidate {
  purchaseDate: string;
  productId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  quantity: number;
  purchaseRate: number;
  freightAmount: number;
  otherExpenses: number;
  discount: number;
  taxAmount: number;
  paymentStatus: PurchasePaymentStatus;
  type: PurchaseType;
}

export interface PurchaseValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Partial<Record<keyof PurchaseInputToValidate, string>>;
  breakdown: PurchaseCostBreakdown;
}

export function validatePurchaseInput(
  input: PurchaseInputToValidate
): PurchaseValidationResult {
  const fieldErrors: Partial<Record<keyof PurchaseInputToValidate, string>> = {};
  const errors: string[] = [];

  const addError = (field: keyof PurchaseInputToValidate, msg: string) => {
    if (!fieldErrors[field]) fieldErrors[field] = msg;
    errors.push(msg);
  };

  if (!input.purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate.trim())) {
    addError('purchaseDate', 'Enter a valid purchase date (YYYY-MM-DD).');
  }

  if (!input.productId.trim()) {
    addError('productId', 'Select a valid product.');
  }

  if (input.supplierName.trim().length < 1) {
    addError('supplierName', 'Select or enter a supplier name.');
  }

  if (input.invoiceNumber.trim().length < 1) {
    addError('invoiceNumber', 'Supplier invoice number is required.');
  }

  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    addError('quantity', 'Quantity must be greater than zero.');
  }

  const rate = Number(input.purchaseRate);
  if (!Number.isFinite(rate) || rate < 0) {
    addError('purchaseRate', 'Purchase rate must be zero or greater.');
  }

  const freight = Number(input.freightAmount);
  if (!Number.isFinite(freight) || freight < 0) {
    addError('freightAmount', 'Freight amount cannot be negative.');
  }

  const other = Number(input.otherExpenses);
  if (!Number.isFinite(other) || other < 0) {
    addError('otherExpenses', 'Other expenses cannot be negative.');
  }

  const tax = Number(input.taxAmount);
  if (!Number.isFinite(tax) || tax < 0) {
    addError('taxAmount', 'Tax amount cannot be negative.');
  }

  const discount = Number(input.discount);
  if (!Number.isFinite(discount) || discount < 0) {
    addError('discount', 'Discount cannot be negative.');
  }

  const breakdown = calculateDetailedPurchaseCost({
    quantity: qty,
    purchaseRate: rate,
    freightAmount: freight,
    otherExpenses: other,
    taxAmount: tax,
    discount,
  });

  if (discount > round2(breakdown.baseAmount + breakdown.capitalizableExpenses)) {
    addError(
      'discount',
      'Discount cannot exceed purchase base amount plus direct expenses.'
    );
  }

  if (!['PAID', 'PARTIAL', 'PENDING', 'CREDIT'].includes(input.paymentStatus)) {
    addError('paymentStatus', 'Select a valid payment status.');
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
    breakdown,
  };
}

export function calculatePostReversalProductState(params: {
  prevAvailableStock: number;
  prevTotalPurchaseQty: number;
  prevTotalPurchaseAmount: number;
  reversedQty: number;
  reversedAmount: number;
}): {
  nextAvailableStock: number;
  nextTotalPurchaseQty: number;
  nextTotalPurchaseAmount: number;
  nextAvgPurchasePrice: number;
} {
  const nextAvailableStock = round2(params.prevAvailableStock - params.reversedQty);
  if (nextAvailableStock < 0) {
    throw new Error(
      `Cannot reverse ${params.reversedQty} units because only ${params.prevAvailableStock} units remain in stock (the rest has already been sold or dispatched).`
    );
  }

  const nextTotalPurchaseQty = Math.max(
    0,
    round2(params.prevTotalPurchaseQty - params.reversedQty)
  );
  const nextTotalPurchaseAmount = Math.max(
    0,
    round2(params.prevTotalPurchaseAmount - params.reversedAmount)
  );
  const nextAvgPurchasePrice =
    nextTotalPurchaseQty > 0
      ? round2(nextTotalPurchaseAmount / nextTotalPurchaseQty)
      : 0;

  return {
    nextAvailableStock,
    nextTotalPurchaseQty,
    nextTotalPurchaseAmount,
    nextAvgPurchasePrice,
  };
}
