import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  Ban,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import {
  calculateNextWeightedAveragePurchase,
  filterRecordsByDate,
  formatINR,
  formatNumber,
  roundCurrency,
  todayYMD,
} from '../../lib/accounting';
import {
  PAYMENT_STATUS_OPTIONS,
  calculateDetailedPurchaseCost,
  calculatePostReversalProductState,
  getPurchaseSign,
  getReversedPurchaseIdSet,
  isDuplicateSupplierInvoice,
  validatePurchaseInput,
} from '../../lib/purchaseValidation';
import {
  exportRowsToCSV,
  exportRowsToExcel,
  mapPurchasesForExport,
} from '../../lib/reports';
import {
  generateSafeId,
  recordStockInPurchase,
  reverseOrCancelPurchase,
  saveSupplier,
  updatePurchasePaymentStatus,
} from '../../services/firestoreService';
import type {
  CompanySettings,
  DateFilterPreset,
  Product,
  Purchase,
  PurchasePaymentStatus,
  PurchaseType,
  Supplier,
} from '../../types';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { DateRangeFilterBar } from './shared/DateRangeFilterBar';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface PurchaseManagementTabProps {
  initialView?: 'entry' | 'history';
  products: Product[];
  suppliers: Supplier[];
  purchases: Purchase[];
  settings: CompanySettings;
}

type SortKey = 'date' | 'purchaseId' | 'invoice' | 'product' | 'supplier' | 'qty' | 'amount';

function paymentBadgeClass(status: PurchasePaymentStatus | undefined): string {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'PARTIAL':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'CREDIT':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'PENDING':
    default:
      return 'bg-rose-50 text-rose-800 border-rose-200';
  }
}

export function PurchaseManagementTab({
  initialView = 'entry',
  products,
  suppliers,
  purchases,
  settings,
}: PurchaseManagementTabProps) {
  const [activeView, setActiveView] = useState<'entry' | 'history'>(initialView);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const activeStockProducts = useMemo(
    () => products.filter((p) => p.status !== 'ARCHIVED'),
    [products]
  );

  // New Purchase Form State
  const [nextPurchaseId, setNextPurchaseId] = useState(() => generateSafeId('pur'));
  const [purchaseDate, setPurchaseDate] = useState(todayYMD());
  const [entryType, setEntryType] = useState<PurchaseType>('PURCHASE');
  const [productId, setProductId] = useState(activeStockProducts[0]?.productId || '');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [freightAmount, setFreightAmount] = useState('0');
  const [otherExpenses, setOtherExpenses] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('PAID');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingNonStandardConfirm, setPendingNonStandardConfirm] = useState(false);

  // Quick Supplier Modal State
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supGst, setSupGst] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // History Search, Filter, Sort, Pagination
  const [preset, setPreset] = useState<DateFilterPreset>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Controlled Reversal / Cancel Modal
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reversingBusy, setReversingBusy] = useState(false);

  // Controlled Edit via Reversal Modal
  const [editTarget, setEditTarget] = useState<Purchase | null>(null);
  const [editProductId, setEditProductId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editInvoice, setEditInvoice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editFreight, setEditFreight] = useState('0');
  const [editOtherExp, setEditOtherExp] = useState('0');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editTax, setEditTax] = useState('0');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PurchasePaymentStatus>('PAID');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Print Voucher / Report Preview Modal
  const [printVoucher, setPrintVoucher] = useState<Purchase | null>(null);
  const [printSummaryOpen, setPrintSummaryOpen] = useState(false);

  const selectedProduct = useMemo(
    () =>
      activeStockProducts.find((p) => p.productId === productId) || activeStockProducts[0],
    [activeStockProducts, productId]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId]
  );

  const resolvedSupplierName = (selectedSupplier?.name || supplierName).trim();

  const reversedPurchaseIds = useMemo(
    () => getReversedPurchaseIdSet(purchases),
    [purchases]
  );

  const duplicateWarning = useMemo(
    () =>
      isDuplicateSupplierInvoice(purchases, {
        supplierId: selectedSupplier?.id || '',
        supplierName: resolvedSupplierName,
        invoiceNumber,
        type: entryType,
      }),
    [purchases, selectedSupplier, resolvedSupplierName, invoiceNumber, entryType]
  );

  const costBreakdown = useMemo(
    () =>
      calculateDetailedPurchaseCost({
        quantity: Number(quantity) || 0,
        purchaseRate: Number(purchaseRate) || 0,
        freightAmount: Number(freightAmount) || 0,
        otherExpenses: Number(otherExpenses) || 0,
        discount: Number(discount) || 0,
        taxAmount: Number(taxAmount) || 0,
      }),
    [quantity, purchaseRate, freightAmount, otherExpenses, discount, taxAmount]
  );

  const discountExceedsGross =
    (Number(discount) || 0) >
    roundCurrency(costBreakdown.baseAmount + costBreakdown.capitalizableExpenses);

  const weightedAvgPreview = useMemo(() => {
    if (!selectedProduct) return null;
    const qtyNum = Number(quantity) || 0;
    if (qtyNum <= 0) {
      return {
        nextStock: selectedProduct.availableStock,
        nextAvgCost: selectedProduct.avgPurchasePrice,
        error: null as string | null,
      };
    }

    if (entryType === 'RETURN_TO_SUPPLIER' || entryType === 'CANCELLATION_REVERSAL') {
      try {
        const res = calculatePostReversalProductState({
          prevAvailableStock: selectedProduct.availableStock,
          prevTotalPurchaseQty: selectedProduct.totalPurchaseQty,
          prevTotalPurchaseAmount: selectedProduct.totalPurchaseAmount,
          reversedQty: qtyNum,
          reversedAmount: costBreakdown.netInventoryCost,
        });
        return {
          nextStock: res.nextAvailableStock,
          nextAvgCost: res.nextAvgPurchasePrice,
          error: null as string | null,
        };
      } catch (err) {
        return {
          nextStock: selectedProduct.availableStock,
          nextAvgCost: selectedProduct.avgPurchasePrice,
          error: err instanceof Error ? err.message : 'Insufficient stock',
        };
      }
    }

    const avg = calculateNextWeightedAveragePurchase(
      selectedProduct.totalPurchaseQty,
      selectedProduct.totalPurchaseAmount,
      qtyNum,
      costBreakdown.netInventoryCost
    );
    return {
      nextStock: roundCurrency(selectedProduct.availableStock + qtyNum),
      nextAvgCost: avg.nextAvgPurchasePrice,
      error: null as string | null,
    };
  }, [selectedProduct, quantity, entryType, costBreakdown.netInventoryCost]);

  const applyTaxPreset = (pct: number) => {
    const base = roundCurrency((Number(quantity) || 0) * (Number(purchaseRate) || 0));
    setTaxAmount(String(roundCurrency((base * pct) / 100)));
  };

  const executePurchaseSubmit = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const savedId = await recordStockInPurchase({
        purchaseId: nextPurchaseId,
        productId: selectedProduct.productId,
        purchaseDate,
        supplierId: selectedSupplier?.id || '',
        supplierName: resolvedSupplierName,
        invoiceNumber: invoiceNumber.trim(),
        quantity: Number(quantity),
        purchaseRate: Number(purchaseRate),
        freightAmount: Number(freightAmount) || 0,
        otherExpenses: Number(otherExpenses) || 0,
        discount: Number(discount) || 0,
        taxAmount: Number(taxAmount) || 0,
        paymentStatus,
        notes: notes.trim(),
        type: entryType,
      });

      setSuccessMsg(
        `Saved ${entryType} (${savedId}) for ${selectedProduct.name} — ${quantity} ${selectedProduct.unit}, Final Cost ${formatINR(costBreakdown.netInventoryCost)}. Stock and weighted average cost updated.`
      );
      setNextPurchaseId(generateSafeId('pur'));
      setInvoiceNumber('');
      setQuantity('');
      setPurchaseRate('');
      setFreightAmount('0');
      setOtherExpenses('0');
      setDiscount('0');
      setTaxAmount('0');
      setNotes('');
      setPendingNonStandardConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save purchase transaction.');
      setPendingNonStandardConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePurchaseFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedProduct) {
      setError('Create an active/inactive product first before recording Stock In.');
      return;
    }

    const validation = validatePurchaseInput({
      purchaseDate,
      productId: selectedProduct.productId,
      supplierId: selectedSupplier?.id || '',
      supplierName: resolvedSupplierName,
      invoiceNumber,
      quantity: Number(quantity),
      purchaseRate: Number(purchaseRate),
      freightAmount: Number(freightAmount) || 0,
      otherExpenses: Number(otherExpenses) || 0,
      discount: Number(discount) || 0,
      taxAmount: Number(taxAmount) || 0,
      paymentStatus,
      type: entryType,
    });

    if (!validation.valid) {
      setError(validation.errors[0] || 'Please fix the highlighted fields.');
      return;
    }

    if (duplicateWarning) {
      setError(
        `Duplicate supplier invoice blocked: "${invoiceNumber.trim()}" already exists for "${duplicateWarning.supplierName}".`
      );
      return;
    }

    if (weightedAvgPreview?.error) {
      setError(weightedAvgPreview.error);
      return;
    }

    if (entryType !== 'PURCHASE') {
      setPendingNonStandardConfirm(true);
      return;
    }

    await executePurchaseSubmit();
  };

  const handleQuickAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supName.trim().length < 2) {
      setSupplierError('Supplier name must be at least 2 characters.');
      return;
    }
    setSupplierError(null);
    setSavingSupplier(true);
    try {
      const newSupId = await saveSupplier({
        name: supName.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        address: supAddress.trim(),
        gstNumber: supGst.trim(),
        notes: supNotes.trim(),
      });
      setSupplierId(newSupId);
      setSupplierName('');
      setSupName('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      setSupGst('');
      setSupNotes('');
      setSupplierModalOpen(false);
    } catch (err) {
      setSupplierError(err instanceof Error ? err.message : 'Unable to save supplier.');
    } finally {
      setSavingSupplier(false);
    }
  };

  const openEditModal = (p: Purchase) => {
    setEditTarget(p);
    setEditProductId(p.productId);
    setEditDate(p.purchaseDate);
    setEditSupplierId(p.supplierId || '');
    setEditSupplierName(p.supplierId ? '' : p.supplierName);
    setEditInvoice(p.invoiceNumber);
    setEditQty(String(p.quantity));
    setEditRate(String(p.purchaseRate));
    setEditFreight(String(p.freightAmount ?? 0));
    setEditOtherExp(
      String(p.otherExpenses ?? (p.freightAmount === undefined ? p.additionalExpenses : 0))
    );
    setEditDiscount(String(p.discount ?? 0));
    setEditTax(String(p.taxAmount ?? 0));
    setEditPaymentStatus(p.paymentStatus || 'PAID');
    setEditNotes(p.notes || '');
    setEditReason('');
    setEditError(null);
  };

  const editBreakdown = useMemo(
    () =>
      calculateDetailedPurchaseCost({
        quantity: Number(editQty) || 0,
        purchaseRate: Number(editRate) || 0,
        freightAmount: Number(editFreight) || 0,
        otherExpenses: Number(editOtherExp) || 0,
        discount: Number(editDiscount) || 0,
        taxAmount: Number(editTax) || 0,
      }),
    [editQty, editRate, editFreight, editOtherExp, editDiscount, editTax]
  );

  const handleConfirmEditViaReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editReason.trim()) {
      setEditError('Please state a reason for editing this purchase transaction.');
      return;
    }

    const supObj = suppliers.find((s) => s.id === editSupplierId);
    const resolvedSupName = (supObj?.name || editSupplierName).trim();

    setEditBusy(true);
    setEditError(null);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await reverseOrCancelPurchase({
        originalPurchaseId: editTarget.id,
        reason: editReason.trim(),
        mode: 'EDIT',
        replacementInput: {
          productId: editProductId,
          purchaseDate: editDate,
          supplierId: supObj?.id || '',
          supplierName: resolvedSupName,
          invoiceNumber: editInvoice.trim(),
          quantity: Number(editQty),
          purchaseRate: Number(editRate),
          freightAmount: Number(editFreight) || 0,
          otherExpenses: Number(editOtherExp) || 0,
          discount: Number(editDiscount) || 0,
          taxAmount: Number(editTax) || 0,
          paymentStatus: editPaymentStatus,
          notes: editNotes.trim(),
        },
      });
      setSuccessMsg(
        `Controlled edit complete: created reversal (${result.reversalId}) and corrected purchase (${result.replacementId}). Historical record preserved.`
      );
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Controlled edit failed.');
    } finally {
      setEditBusy(false);
    }
  };

  const handleConfirmCancelReversal = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setError('A cancellation reason is required to post a reversal entry.');
      return;
    }
    setReversingBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await reverseOrCancelPurchase({
        originalPurchaseId: cancelTarget.id,
        reason: cancelReason.trim(),
        mode: 'CANCEL',
      });
      setSuccessMsg(
        `Purchase ${cancelTarget.invoiceNumber} cancelled via reversal entry (${result.reversalId}). Stock and weighted average cost recalculated.`
      );
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel purchase.');
      setCancelTarget(null);
    } finally {
      setReversingBusy(false);
    }
  };

  const handleInlinePaymentStatusChange = async (
    purchase: Purchase,
    nextStatus: PurchasePaymentStatus
  ) => {
    setError(null);
    try {
      await updatePurchasePaymentStatus(purchase.id, nextStatus);
      setSuccessMsg(
        `Payment status for ${purchase.invoiceNumber} updated to ${nextStatus}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update payment status.');
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'amount' || key === 'qty' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const filteredPurchases = useMemo(() => {
    const byDate = filterRecordsByDate(purchases, 'purchaseDate', preset, customStart, customEnd);
    const q = search.trim().toLowerCase();
    const list = byDate.filter((p) => {
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
      if (paymentFilter !== 'ALL' && (p.paymentStatus || 'PAID') !== paymentFilter) return false;
      if (!q) return true;
      return (
        (p.purchaseId || p.id).toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.purchaseDate.localeCompare(b.purchaseDate);
      else if (sortKey === 'purchaseId')
        cmp = (a.purchaseId || a.id).localeCompare(b.purchaseId || b.id);
      else if (sortKey === 'invoice') cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      else if (sortKey === 'product') cmp = a.productName.localeCompare(b.productName);
      else if (sortKey === 'supplier') cmp = a.supplierName.localeCompare(b.supplierName);
      else if (sortKey === 'qty') cmp = a.quantity - b.quantity;
      else if (sortKey === 'amount') cmp = a.totalAmount - b.totalAmount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    purchases,
    preset,
    customStart,
    customEnd,
    search,
    typeFilter,
    paymentFilter,
    sortKey,
    sortDir,
  ]);

  const summaryTotals = useMemo(() => {
    let netQty = 0;
    let netValue = 0;
    let netExpenses = 0;
    let pendingAmount = 0;

    for (const p of filteredPurchases) {
      const sign = getPurchaseSign(p.type);
      netQty += sign * p.quantity;
      netValue += sign * p.totalAmount;
      netExpenses += sign * p.additionalExpenses;
      if (
        sign > 0 &&
        !reversedPurchaseIds.has(p.id) &&
        (!p.purchaseId || !reversedPurchaseIds.has(p.purchaseId)) &&
        (p.paymentStatus === 'PENDING' ||
          p.paymentStatus === 'PARTIAL' ||
          p.paymentStatus === 'CREDIT')
      ) {
        pendingAmount += p.totalAmount;
      }
    }

    return {
      count: filteredPurchases.length,
      netQty: roundCurrency(netQty),
      netValue: roundCurrency(netValue),
      netExpenses: roundCurrency(netExpenses),
      pendingAmount: roundCurrency(pendingAmount),
    };
  }, [filteredPurchases, reversedPurchaseIds]);

  const pagedPurchases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, page, pageSize]);

  const dateSuffix = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Feedback Banners */}
      {error && (
        <div className="no-print p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="underline shrink-0">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="no-print p-3.5 rounded-xl bg-[#ECF4EF] border border-[#14452F]/25 text-xs text-[#14452F] font-medium flex items-center justify-between gap-3">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Navigation Toggle */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveView('entry')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeView === 'entry'
                ? 'bg-[#14452F] text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            New Purchase / Stock In
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeView === 'history'
                ? 'bg-[#14452F] text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Purchase History &amp; Invoices ({purchases.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPrintSummaryOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Purchase Report
        </button>
      </div>

      {/* Purchase & Stock In Entry Form */}
      {activeView === 'entry' && (
        <form
          onSubmit={handlePurchaseFormSubmit}
          className="no-print bg-white border border-slate-200 rounded-xl p-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#ECF4EF] text-[#14452F]">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Record Purchase &amp; Stock In
                </h2>
                <p className="text-xs text-slate-500">
                  Inventory Cost = Base + Freight + Other Expenses + Tax − Discount. Updates stock &amp; weighted average cost atomically.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Purchase ID (Auto)</span>
              <span className="inline-block px-2.5 py-1 text-xs font-mono-tabular font-semibold bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                {nextPurchaseId}
              </span>
            </div>
          </div>

          {/* Row 1: Date, Entry Type, Product, Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Transaction Type *
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as PurchaseType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="PURCHASE">Standard Purchase (Stock In)</option>
                <option value="CORRECTION">Inward Stock Correction (+)</option>
                <option value="RETURN_TO_SUPPLIER">Return to Supplier (-)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product *
              </label>
              <select
                required
                value={selectedProduct?.productId || ''}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {activeStockProducts.length === 0 && (
                  <option value="">No active or inactive products available</option>
                )}
                {activeStockProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} ({p.sku}) — {formatNumber(p.availableStock)} {p.unit} on hand · Avg {formatINR(p.avgPurchasePrice)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Supplier (+ Quick Add), Supplier Invoice Number, Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Supplier *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierError(null);
                    setSupplierModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#14452F] hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Quick Add Supplier
                </button>
              </div>
              <div className="space-y-1.5">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Enter custom supplier name --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gstNumber ? `(${s.gstNumber})` : ''}
                    </option>
                  ))}
                </select>
                {!supplierId && (
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Supplier / Jute Mill Name"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Supplier Invoice Number *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. MILL-INV-2026-041"
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono-tabular ${
                  duplicateWarning ? 'border-red-400 bg-red-50/40' : 'border-slate-300'
                }`}
              />
              {duplicateWarning && (
                <p className="mt-1 text-[11px] text-red-700 font-medium">
                  Duplicate invoice already exists ({duplicateWarning.purchaseDate}).
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payment Status *
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PurchasePaymentStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Quantity, Unit, Purchase Rate, Freight, Other Expenses, Discount, Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity *
              </label>
              <div className="flex">
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-300 rounded-l-lg font-mono-tabular"
                />
                <span className="px-3 py-2 text-xs font-medium bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-slate-700">
                  {selectedProduct?.unit || 'unit'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purchase Rate (₹ / {selectedProduct?.unit || 'unit'}) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={purchaseRate}
                onChange={(e) => setPurchaseRate(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Freight (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={freightAmount}
                onChange={(e) => setFreightAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Other Expenses (Loading/Weighing ₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={otherExpenses}
                onChange={(e) => setOtherExpenses(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono-tabular ${
                  discountExceedsGross ? 'border-red-400 bg-red-50/40' : 'border-slate-300'
                }`}
              />
              {discountExceedsGross && (
                <p className="mt-1 text-[11px] text-red-700">
                  Discount cannot exceed gross amount + expenses.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Tax (where applicable ₹)
                </label>
                <div className="flex items-center gap-1">
                  {[0, 5, 12, 18].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyTaxPreset(pct)}
                      className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                      title={`Compute ${pct}% tax on base purchase amount`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Notes / Lorry &amp; Grade Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bale grade, transporter LR #, unloading location, payment terms..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Live Calculation Breakdown & Weighted Average Impact */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 rounded-xl bg-[#F8FAF9] border border-slate-200">
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Base Amount</span>
                <span className="font-mono-tabular font-medium text-slate-800">
                  {formatINR(costBreakdown.baseAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">+ Freight &amp; Exp</span>
                <span className="font-mono-tabular font-medium text-slate-800">
                  {formatINR(roundCurrency(costBreakdown.freightAmount + costBreakdown.otherExpenses))}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">+ Tax</span>
                <span className="font-mono-tabular font-medium text-slate-800">
                  {formatINR(costBreakdown.taxAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">− Discount</span>
                <span className="font-mono-tabular font-medium text-amber-700">
                  {formatINR(costBreakdown.discount)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#14452F] font-semibold block text-[11px]">
                  Final Purchase Cost
                </span>
                <span className="text-base font-bold text-[#14452F] font-mono-tabular">
                  {formatINR(costBreakdown.netInventoryCost)}
                </span>
              </div>
            </div>

            {selectedProduct && weightedAvgPreview && (
              <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Stock Impact</span>
                  <span className="font-mono-tabular text-slate-800">
                    {formatNumber(selectedProduct.availableStock)} →{' '}
                    <strong className="text-slate-950">
                      {formatNumber(weightedAvgPreview.nextStock)} {selectedProduct.unit}
                    </strong>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Weighted Avg Cost</span>
                  <span className="font-mono-tabular text-slate-800">
                    {formatINR(selectedProduct.avgPurchasePrice)} →{' '}
                    <strong className="text-[#14452F]">
                      {formatINR(weightedAvgPreview.nextAvgCost)}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {weightedAvgPreview?.error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{weightedAvgPreview.error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-500">
              Historical purchase entries remain untouched; new batches update weighted average cost forward only.
            </p>
            <button
              type="submit"
              disabled={
                submitting ||
                activeStockProducts.length === 0 ||
                Boolean(duplicateWarning) ||
                discountExceedsGross ||
                Boolean(weightedAvgPreview?.error)
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Recording Atomic Transaction...' : 'Save Purchase & Update Stock'}
            </button>
          </div>
        </form>
      )}

      {/* Summary KPI Strip */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Purchase Ledger Entries</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(summaryTotals.count, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Net Purchased Quantity</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(summaryTotals.netQty)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Net Direct Expenses &amp; Tax</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatINR(summaryTotals.netExpenses)}
          </p>
        </div>
        <div className="bg-[#ECF4EF] border border-[#14452F]/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-[#14452F]">Net Final Purchase Cost</p>
          <p className="text-xl font-semibold text-[#14452F] font-mono-tabular mt-1">
            {formatINR(summaryTotals.netValue)}
          </p>
          {summaryTotals.pendingAmount > 0 && (
            <p className="text-[11px] text-amber-800 font-mono-tabular mt-0.5">
              Unpaid / Credit: {formatINR(summaryTotals.pendingAmount)}
            </p>
          )}
        </div>
      </div>

      {/* Purchase Search, Filters & Export Bar */}
      <div className="no-print space-y-4">
        <DateRangeFilterBar
          preset={preset}
          onPresetChange={(p) => {
            setPreset(p);
            setPage(1);
          }}
          customStart={customStart}
          onCustomStartChange={(v) => {
            setCustomStart(v);
            setPage(1);
          }}
          customEnd={customEnd}
          onCustomEndChange={(v) => {
            setCustomEnd(v);
            setPage(1);
          }}
        />

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Purchase ID, invoice #, product, SKU, supplier..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              aria-label="Filter by entry type"
            >
              <option value="ALL">All Entry Types</option>
              <option value="PURCHASE">Standard Purchase</option>
              <option value="CORRECTION">Inward Correction</option>
              <option value="RETURN_TO_SUPPLIER">Return to Supplier</option>
              <option value="CANCELLATION_REVERSAL">Cancellation / Edit Reversal</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              aria-label="Filter by payment status"
            >
              <option value="ALL">All Payment Statuses</option>
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPrintSummaryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
            <button
              type="button"
              onClick={() =>
                exportRowsToCSV(
                  mapPurchasesForExport(filteredPurchases),
                  `gazi-jute-purchases-${dateSuffix}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportRowsToExcel(
                  mapPurchasesForExport(filteredPurchases),
                  'Purchases',
                  `gazi-jute-purchases-${dateSuffix}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Purchase History Table */}
      <div className="no-print bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <p className="p-12 text-center text-xs text-slate-500">
            No purchase invoices match the current search or date filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <SortableHeader
                      label="Date & ID"
                      sortKey="date"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableHeader
                      label="Invoice"
                      sortKey="invoice"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Product"
                      sortKey="product"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Supplier"
                      sortKey="supplier"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Qty"
                      sortKey="qty"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="text-right py-3 px-3 font-semibold">Rate / Exp / Disc / Tax</th>
                    <SortableHeader
                      label="Final Cost"
                      sortKey="amount"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="text-left py-3 px-3 font-semibold">Payment</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedPurchases.map((p) => {
                    const pid = p.purchaseId || p.id;
                    const isReversalEntry =
                      p.type === 'CANCELLATION_REVERSAL' || p.type === 'RETURN_TO_SUPPLIER';
                    const isReversed =
                      reversedPurchaseIds.has(p.id) || reversedPurchaseIds.has(pid);
                    const freight = p.freightAmount ?? 0;
                    const otherExp =
                      p.otherExpenses ??
                      (p.freightAmount === undefined ? p.additionalExpenses : 0);
                    const disc = p.discount ?? 0;
                    const tax = p.taxAmount ?? 0;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/70 ${
                          isReversed ? 'bg-slate-50/60 opacity-75' : ''
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono-tabular text-slate-800 block">
                            {p.purchaseDate}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            {pid}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono-tabular font-medium text-slate-900 block">
                            {p.invoiceNumber}
                          </span>
                          {isReversed ? (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">
                              Reversed / Superseded
                            </span>
                          ) : p.type === 'CANCELLATION_REVERSAL' ? (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-800 rounded">
                              Reversal Entry
                            </span>
                          ) : p.type === 'RETURN_TO_SUPPLIER' ? (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 rounded">
                              Supplier Return
                            </span>
                          ) : p.referencePurchaseId ? (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-800 rounded">
                              Edited Replacement
                            </span>
                          ) : null}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-900">{p.productName}</span>
                          <span className="block text-[11px] font-mono-tabular text-slate-500">
                            {p.sku}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-700">{p.supplierName}</td>

                        <td className="py-3 px-3 text-right font-mono-tabular whitespace-nowrap">
                          {isReversalEntry ? '−' : ''}
                          {formatNumber(p.quantity)} {p.unit}
                        </td>

                        <td className="py-3 px-3 text-right font-mono-tabular text-[11px] text-slate-600 whitespace-nowrap">
                          <span className="block text-slate-800">
                            {formatINR(p.purchaseRate)}/{p.unit}
                          </span>
                          <span className="block text-slate-400">
                            +{formatINR(roundCurrency(freight + otherExp))} exp · +{formatINR(tax)} tax
                            {disc > 0 ? ` · −${formatINR(disc)}` : ''}
                          </span>
                        </td>

                        <td
                          className={`py-3 px-3 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                            isReversed
                              ? 'line-through text-slate-400'
                              : isReversalEntry
                                ? 'text-rose-700'
                                : 'text-slate-950'
                          }`}
                        >
                          {isReversalEntry ? '−' : ''}
                          {formatINR(p.totalAmount)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {isReversalEntry || isReversed ? (
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded border ${paymentBadgeClass(
                                p.paymentStatus
                              )}`}
                            >
                              {p.paymentStatus || 'PAID'}
                            </span>
                          ) : (
                            <select
                              value={p.paymentStatus || 'PAID'}
                              onChange={(e) =>
                                void handleInlinePaymentStatusChange(
                                  p,
                                  e.target.value as PurchasePaymentStatus
                                )
                              }
                              aria-label={`Payment status for ${p.invoiceNumber}`}
                              className={`px-2 py-1 text-[11px] font-semibold rounded border cursor-pointer ${paymentBadgeClass(
                                p.paymentStatus
                              )}`}
                            >
                              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPrintVoucher(p)}
                              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                              title="Print Purchase Voucher"
                              aria-label={`Print voucher for ${p.invoiceNumber}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {!isReversalEntry && !isReversed && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                                  title="Edit via Controlled Reversal"
                                  aria-label={`Edit purchase ${p.invoiceNumber}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelTarget(p);
                                    setCancelReason('');
                                  }}
                                  className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                  title="Cancel via Controlled Reversal"
                                  aria-label={`Cancel purchase ${p.invoiceNumber}`}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={filteredPurchases.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Quick Add Supplier Modal */}
      {supplierModalOpen && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Add New Supplier Record
              </h3>
              <button
                type="button"
                onClick={() => setSupplierModalOpen(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {supplierError && (
              <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {supplierError}
              </p>
            )}
            <form onSubmit={handleQuickAddSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supplier / Mill Name *
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supGst}
                    onChange={(e) => setSupGst(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {savingSupplier ? 'Saving...' : 'Save & Select Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controlled Edit via Reversal Modal */}
      {editTarget && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Edit Purchase via Controlled Reversal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Original record ({editTarget.purchaseId || editTarget.id}) stays immutable. Submitting posts a reversal entry and creates the corrected purchase atomically.
                </p>
              </div>
              <button
                type="button"
                disabled={editBusy}
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {editError}
              </p>
            )}

            <form onSubmit={handleConfirmEditViaReversal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product *
                  </label>
                  <select
                    value={editProductId}
                    onChange={(e) => setEditProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {activeStockProducts.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.name} ({p.sku}) — On hand: {formatNumber(p.availableStock)} {p.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Supplier *
                  </label>
                  <select
                    value={editSupplierId}
                    onChange={(e) => setEditSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Custom supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {!editSupplierId && (
                    <input
                      type="text"
                      required
                      value={editSupplierName}
                      onChange={(e) => setEditSupplierName(e.target.value)}
                      className="mt-1.5 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Supplier Invoice # *
                  </label>
                  <input
                    type="text"
                    required
                    value={editInvoice}
                    onChange={(e) => setEditInvoice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as PurchasePaymentStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Purchase Rate (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Freight (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editFreight}
                    onChange={(e) => setEditFreight(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Other Expenses (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editOtherExp}
                    onChange={(e) => setEditOtherExp(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tax (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editTax}
                    onChange={(e) => setEditTax(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Original Cost: <strong className="font-mono-tabular">{formatINR(editTarget.totalAmount)}</strong>
                </span>
                <span className="text-[#14452F] font-semibold">
                  Corrected Final Cost: <strong className="font-mono-tabular text-sm">{formatINR(editBreakdown.netInventoryCost)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Updated Notes
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Correction / Audit Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Supplier revised rate or short-weight adjustment"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={editBusy}
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {editBusy ? 'Posting Reversal & Replacement...' : 'Post Reversal & Save Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controlled Cancellation / Reversal Modal */}
      {cancelTarget && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-50 text-red-700 shrink-0">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Cancel Purchase via Reversal?
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Invoice <strong>{cancelTarget.invoiceNumber}</strong> ({formatNumber(cancelTarget.quantity)} {cancelTarget.unit} of {cancelTarget.productName}, {formatINR(cancelTarget.totalAmount)}) will remain archived and a matching{' '}
                    <span className="font-mono-tabular">CANCELLATION_REVERSAL</span> entry will deduct stock and adjust weighted average cost.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={reversingBusy}
                onClick={() => setCancelTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cancellation Reason (Recorded in Audit Log) *
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Wrong invoice posted / Supplier order cancelled"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={reversingBusy}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Keep Record
              </button>
              <button
                type="button"
                disabled={reversingBusy || !cancelReason.trim()}
                onClick={() => void handleConfirmCancelReversal()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg"
              >
                {reversingBusy ? 'Reversing...' : 'Confirm & Post Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Return to Supplier / Correction */}
      <ConfirmDialog
        open={pendingNonStandardConfirm}
        title={`Confirm ${entryType} entry?`}
        description={`Post ${entryType} (${nextPurchaseId}) for ${quantity} ${selectedProduct?.unit || ''} of ${selectedProduct?.name || ''} (Invoice ${invoiceNumber}, Final Cost ${formatINR(costBreakdown.netInventoryCost)}).`}
        variant="primary"
        confirmLabel="Confirm & Post Entry"
        busy={submitting}
        onConfirm={executePurchaseSubmit}
        onCancel={() => setPendingNonStandardConfirm(false)}
      />

      {/* Printable Purchase Voucher Preview Modal */}
      {printVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="print-area bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 space-y-6 my-8 print:border-0 print:my-0">
            <div className="no-print flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Purchase Voucher Print Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setPrintVoucher(null)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-950">
                  {settings.companyName}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">{settings.address}</p>
                <p className="text-xs text-slate-600">
                  {settings.contactNumbers.join(' · ')} · {settings.email}
                </p>
                {settings.gstNumber && (
                  <p className="text-xs font-mono-tabular text-slate-600 mt-0.5">
                    GSTIN: {settings.gstNumber}
                  </p>
                )}
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-[#14452F] uppercase tracking-wide">
                  Purchase &amp; Stock In Voucher
                </p>
                <p className="font-mono-tabular text-slate-800 mt-1">
                  ID: {printVoucher.purchaseId || printVoucher.id}
                </p>
                <p className="font-mono-tabular text-slate-700">
                  Date: {printVoucher.purchaseDate}
                </p>
                <p className="font-mono-tabular text-slate-700">
                  Entry Type: {printVoucher.type}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Supplier</span>
                <strong className="text-slate-900">{printVoucher.supplierName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Supplier Invoice #</span>
                <strong className="font-mono-tabular text-slate-900">
                  {printVoucher.invoiceNumber}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Product &amp; SKU</span>
                <strong className="text-slate-900">
                  {printVoucher.productName} ({printVoucher.sku})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Status</span>
                <strong className="text-slate-900">
                  {printVoucher.paymentStatus || 'PAID'}
                </strong>
              </div>
            </div>

            <table className="w-full text-xs border border-slate-200">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Quantity &amp; Rate</td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-900">
                    {formatNumber(printVoucher.quantity)} {printVoucher.unit} ×{' '}
                    {formatINR(printVoucher.purchaseRate)} ={' '}
                    {formatINR(roundCurrency(printVoucher.quantity * printVoucher.purchaseRate))}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Freight</td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-900">
                    {formatINR(printVoucher.freightAmount ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Other Direct Expenses</td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-900">
                    {formatINR(
                      printVoucher.otherExpenses ??
                        (printVoucher.freightAmount === undefined
                          ? printVoucher.additionalExpenses
                          : 0)
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Tax (where applicable)</td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-900">
                    {formatINR(printVoucher.taxAmount ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Discount</td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-amber-700">
                    − {formatINR(printVoucher.discount ?? 0)}
                  </td>
                </tr>
                <tr className="bg-[#ECF4EF]">
                  <td className="py-3 px-3 font-semibold text-[#14452F]">
                    Final Capitalized Purchase Cost
                  </td>
                  <td className="py-3 px-3 text-right font-mono-tabular font-bold text-sm text-[#14452F]">
                    {formatINR(printVoucher.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {printVoucher.notes && (
              <div className="text-xs text-slate-700">
                <strong className="text-slate-900">Notes:</strong> {printVoucher.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Filtered Purchase Summary Report Modal */}
      {printSummaryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="print-area bg-white border border-slate-200 rounded-xl max-w-5xl w-full p-8 space-y-5 my-8 print:border-0 print:my-0">
            <div className="no-print flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Purchase Summary Report Preview ({filteredPurchases.length} entries)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Report
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSummaryOpen(false)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-950">
                  {settings.companyName} — Purchase &amp; Stock In Report
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {settings.address} · {settings.contactNumbers.join(', ')}
                </p>
              </div>
              <div className="text-right text-xs font-mono-tabular text-slate-600">
                <p>Generated: {todayYMD()}</p>
                <p>Records: {filteredPurchases.length}</p>
                <p className="font-semibold text-slate-900">
                  Net Value: {formatINR(summaryTotals.netValue)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-700 bg-slate-50">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Invoice #</th>
                    <th className="text-left py-2 px-2">Supplier</th>
                    <th className="text-left py-2 px-2">Product</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Rate</th>
                    <th className="text-right py-2 px-2">Exp/Tax</th>
                    <th className="text-right py-2 px-2">Disc</th>
                    <th className="text-right py-2 px-2">Final Cost</th>
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPurchases.map((p) => {
                    const sign = getPurchaseSign(p.type);
                    return (
                      <tr key={p.id}>
                        <td className="py-2 px-2 font-mono-tabular">{p.purchaseDate}</td>
                        <td className="py-2 px-2 font-mono-tabular">{p.invoiceNumber}</td>
                        <td className="py-2 px-2">{p.supplierName}</td>
                        <td className="py-2 px-2">
                          {p.productName} ({p.type})
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular">
                          {sign < 0 ? '−' : ''}
                          {formatNumber(p.quantity)} {p.unit}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular">
                          {formatINR(p.purchaseRate)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular">
                          {formatINR(p.additionalExpenses)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular">
                          {formatINR(p.discount ?? 0)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular font-semibold">
                          {sign < 0 ? '−' : ''}
                          {formatINR(p.totalAmount)}
                        </td>
                        <td className="py-2 px-2">{p.paymentStatus || 'PAID'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
