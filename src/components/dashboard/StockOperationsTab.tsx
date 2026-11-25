import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History, Search } from 'lucide-react';
import {
  calculatePurchaseTotal,
  calculateSaleMetrics,
  formatINR,
  formatNumber,
  todayYMD,
} from '../../lib/accounting';
import { recordStockInPurchase, recordStockOutSale } from '../../services/firestoreService';
import type {
  Customer,
  Product,
  Purchase,
  PurchaseType,
  Sale,
  SaleType,
  StockTransaction,
  Supplier,
} from '../../types';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { PaginationBar } from './shared/PaginationBar';

interface StockOperationsTabProps {
  mode: 'stock-in' | 'stock-out' | 'ledger';
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  purchases: Purchase[];
  sales: Sale[];
  transactions: StockTransaction[];
  readOnly?: boolean;
}

export function StockOperationsTab({
  mode,
  products,
  suppliers,
  customers,
  purchases,
  sales,
  transactions,
  readOnly = false,
}: StockOperationsTabProps) {
  // Stock In State
  const [inProductId, setInProductId] = useState(products[0]?.productId || '');
  const [inDate, setInDate] = useState(todayYMD());
  const [inSupplierId, setInSupplierId] = useState('');
  const [inSupplierName, setInSupplierName] = useState('');
  const [inInvoice, setInInvoice] = useState('');
  const [inQty, setInQty] = useState('');
  const [inRate, setInRate] = useState('');
  const [inExpenses, setInExpenses] = useState('0');
  const [inNotes, setInNotes] = useState('');
  const [inType, setInType] = useState<PurchaseType>('PURCHASE');

  // Stock Out State
  const [outProductId, setOutProductId] = useState(products[0]?.productId || '');
  const [outDate, setOutDate] = useState(todayYMD());
  const [outCustomerId, setOutCustomerId] = useState('');
  const [outCustomerName, setOutCustomerName] = useState('');
  const [outInvoice, setOutInvoice] = useState('');
  const [outQty, setOutQty] = useState('');
  const [outRate, setOutRate] = useState('');
  const [outDiscount, setOutDiscount] = useState('0');
  const [outCharges, setOutCharges] = useState('0');
  const [outNotes, setOutNotes] = useState('');
  const [outType, setOutType] = useState<SaleType>('SALE');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingConfirm, setPendingConfirm] = useState<'in' | 'out' | null>(null);

  const activeStockProducts = useMemo(
    () => products.filter((p) => p.status !== 'ARCHIVED'),
    [products]
  );

  const selectedInProduct = useMemo(
    () => activeStockProducts.find((p) => p.productId === inProductId) || activeStockProducts[0],
    [activeStockProducts, inProductId]
  );

  const selectedOutProduct = useMemo(
    () => activeStockProducts.find((p) => p.productId === outProductId) || activeStockProducts[0],
    [activeStockProducts, outProductId]
  );

  const calculatedPurchaseTotal = calculatePurchaseTotal(
    Number(inQty) || 0,
    Number(inRate) || 0,
    Number(inExpenses) || 0
  );

  const salePreview = calculateSaleMetrics(
    Number(outQty) || 0,
    Number(outRate) || 0,
    Number(outDiscount) || 0,
    Number(outCharges) || 0,
    selectedOutProduct?.avgPurchasePrice || 0
  );

  const executeStockIn = async () => {
    if (!selectedInProduct) return;
    const supplierObj = suppliers.find((s) => s.id === inSupplierId);
    const resolvedSupplierName = (supplierObj?.name || inSupplierName).trim();

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await recordStockInPurchase({
        productId: selectedInProduct.productId,
        purchaseDate: inDate,
        supplierId: supplierObj?.id || '',
        supplierName: resolvedSupplierName,
        invoiceNumber: inInvoice.trim(),
        quantity: Number(inQty),
        purchaseRate: Number(inRate),
        additionalExpenses: Number(inExpenses) || 0,
        notes: inNotes.trim(),
        type: inType,
      });
      setSuccessMsg(
        `Recorded ${inType} for ${selectedInProduct.name} (${inQty} ${selectedInProduct.unit}). Weighted average purchase price updated.`
      );
      setInInvoice('');
      setInQty('');
      setInRate('');
      setInExpenses('0');
      setInNotes('');
      setPendingConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stock In failed.');
      setPendingConfirm(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!selectedInProduct) {
      setError('Create a product first before recording Stock In.');
      return;
    }

    const supplierObj = suppliers.find((s) => s.id === inSupplierId);
    const resolvedSupplierName = (supplierObj?.name || inSupplierName).trim();
    if (!resolvedSupplierName) {
      setError('Please select or enter a supplier name.');
      return;
    }

    if (inType !== 'PURCHASE') {
      setPendingConfirm('in');
      return;
    }
    await executeStockIn();
  };

  const executeStockOut = async () => {
    if (!selectedOutProduct) return;
    const customerObj = customers.find((c) => c.id === outCustomerId);
    const resolvedCustomerName = (customerObj?.name || outCustomerName).trim();
    const qtyNum = Number(outQty);

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await recordStockOutSale({
        productId: selectedOutProduct.productId,
        customerId: customerObj?.id || '',
        customerName: resolvedCustomerName,
        saleDate: outDate,
        invoiceNumber: outInvoice.trim(),
        quantity: qtyNum,
        saleRate: Number(outRate),
        discount: Number(outDiscount) || 0,
        additionalCharges: Number(outCharges) || 0,
        notes: outNotes.trim(),
        type: outType,
      });
      setSuccessMsg(
        `Recorded ${outType} for ${selectedOutProduct.name}. Stock, average sale price, and gross profit updated.`
      );
      setOutInvoice('');
      setOutQty('');
      setOutRate('');
      setOutDiscount('0');
      setOutCharges('0');
      setOutNotes('');
      setPendingConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stock Out failed.');
      setPendingConfirm(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!selectedOutProduct) {
      setError('Create a product first before recording Stock Out.');
      return;
    }

    const customerObj = customers.find((c) => c.id === outCustomerId);
    const resolvedCustomerName = (customerObj?.name || outCustomerName).trim();
    if (!resolvedCustomerName) {
      setError('Please select or enter a customer name.');
      return;
    }

    const qtyNum = Number(outQty);
    if (outType !== 'CUSTOMER_RETURN' && qtyNum > selectedOutProduct.availableStock) {
      setError(
        `Cannot sell ${qtyNum} ${selectedOutProduct.unit}. Available stock is ${selectedOutProduct.availableStock} ${selectedOutProduct.unit}. Negative stock is prohibited.`
      );
      return;
    }

    if (outType !== 'SALE') {
      setPendingConfirm('out');
      return;
    }
    await executeStockOut();
  };

  const filteredLedger = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.productName.toLowerCase().includes(q) ||
        t.sku.toLowerCase().includes(q) ||
        t.txType.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
    );
  }, [transactions, historySearch]);

  const filteredPurchases = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q)
    );
  }, [purchases, historySearch]);

  const filteredSales = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        s.productName.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.invoiceNumber.toLowerCase().includes(q)
    );
  }, [sales, historySearch]);

  if (mode === 'ledger') {
    const pagedLedger = filteredLedger.slice((page - 1) * pageSize, page * pageSize);
    return (
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#14452F]" />
            <h3 className="text-sm font-semibold text-slate-900">
              Immutable Stock Transactions Ledger ({filteredLedger.length})
            </h3>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={historySearch}
              onChange={(e) => {
                setHistorySearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by product, SKU, or type..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {filteredLedger.length === 0 ? (
            <p className="p-10 text-center text-xs text-slate-500">
              No stock transactions logged yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-3 font-semibold">Type</th>
                      <th className="text-left py-3 px-3 font-semibold">Product</th>
                      <th className="text-right py-3 px-3 font-semibold">Qty Change</th>
                      <th className="text-right py-3 px-3 font-semibold">Unit Rate</th>
                      <th className="text-right py-3 px-3 font-semibold">Total Value</th>
                      <th className="text-right py-3 px-3 font-semibold">Resulting Stock</th>
                      <th className="text-right py-3 px-4 font-semibold">Resulting Avg Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedLedger.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono-tabular text-slate-600">{t.txDate}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{t.txType}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-900">{t.productName}</span>
                          <span className="block text-[11px] font-mono-tabular text-slate-500">
                            {t.sku}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono-tabular font-semibold ${
                            t.quantityDelta >= 0 ? 'text-[#14452F]' : 'text-amber-700'
                          }`}
                        >
                          {t.quantityDelta >= 0
                            ? `+${formatNumber(t.quantityDelta)}`
                            : formatNumber(t.quantityDelta)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-700">
                          {formatINR(t.unitRate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-900">
                          {formatINR(t.totalValue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-900">
                          {formatNumber(t.resultingStock)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-700">
                          {formatINR(t.resultingAvgPurchasePrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                currentPage={page}
                totalItems={filteredLedger.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  const pagedPurchases = filteredPurchases.slice((page - 1) * pageSize, page * pageSize);
  const pagedSales = filteredSales.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="underline shrink-0">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 text-xs text-[#14452F] font-medium flex items-center justify-between gap-3">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {!readOnly && mode === 'stock-in' && (
        <form
          onSubmit={handleStockInSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowDownLeft className="w-5 h-5 text-[#14452F]" />
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Stock In / Purchase Entry
              </h3>
              <p className="text-xs text-slate-500">
                Automatically recalculates weighted average purchase price and inventory valuation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Product *</label>
              <select
                required
                value={selectedInProduct?.productId || ''}
                onChange={(e) => setInProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {activeStockProducts.length === 0 && (
                  <option value="">No active/inactive products available</option>
                )}
                {activeStockProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} ({p.sku}) — Stock: {p.availableStock} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Entry Type *</label>
              <select
                value={inType}
                onChange={(e) => setInType(e.target.value as PurchaseType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="PURCHASE">Standard Purchase (Stock In)</option>
                <option value="CORRECTION">Inward Stock Correction (+)</option>
                <option value="RETURN_TO_SUPPLIER">Return to Supplier (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={inDate}
                onChange={(e) => setInDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Supplier *</label>
              {suppliers.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={inSupplierId}
                    onChange={(e) => setInSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Enter custom supplier name --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {!inSupplierId && (
                    <input
                      type="text"
                      required
                      value={inSupplierName}
                      onChange={(e) => setInSupplierName(e.target.value)}
                      placeholder="Supplier / Mill Name"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={inSupplierName}
                  onChange={(e) => setInSupplierName(e.target.value)}
                  placeholder="Supplier / Mill Name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={inInvoice}
                onChange={(e) => setInInvoice(e.target.value)}
                placeholder="e.g. PUR-2026-001"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity ({selectedInProduct?.unit || 'unit'}) *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={inQty}
                onChange={(e) => setInQty(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purchase Rate (₹ per unit) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={inRate}
                onChange={(e) => setInRate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Additional Expenses (Freight/Loading ₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={inExpenses}
                onChange={(e) => setInExpenses(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200 flex flex-col justify-center">
              <span className="text-[11px] text-slate-500">Calculated Total Amount</span>
              <span className="text-base font-semibold text-[#14452F] font-mono-tabular">
                {formatINR(calculatedPurchaseTotal)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={inNotes}
              onChange={(e) => setInNotes(e.target.value)}
              placeholder="Lot grade, transport vehicle, unloading remarks..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || activeStockProducts.length === 0}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
            >
              {submitting ? 'Saving Transaction...' : 'Save Stock In Purchase'}
            </button>
          </div>
        </form>
      )}

      {!readOnly && mode === 'stock-out' && (
        <form
          onSubmit={handleStockOutSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowUpRight className="w-5 h-5 text-[#14452F]" />
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Stock Out / Sales Entry
              </h3>
              <p className="text-xs text-slate-500">
                Enforces non-negative stock, updates weighted average sale price, and computes COGS &amp; gross profit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Product *</label>
              <select
                required
                value={selectedOutProduct?.productId || ''}
                onChange={(e) => setOutProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {activeStockProducts.length === 0 && (
                  <option value="">No active/inactive products available</option>
                )}
                {activeStockProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} ({p.sku}) — Avail: {p.availableStock} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Transaction Type *
              </label>
              <select
                value={outType}
                onChange={(e) => setOutType(e.target.value as SaleType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="SALE">Wholesale Sale (Stock Out)</option>
                <option value="CORRECTION">Outward Correction (-)</option>
                <option value="CUSTOMER_RETURN">Customer Return / Cancellation (+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sale Date *</label>
              <input
                type="date"
                required
                value={outDate}
                onChange={(e) => setOutDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Customer *</label>
              {customers.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={outCustomerId}
                    onChange={(e) => setOutCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Enter custom customer name --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {!outCustomerId && (
                    <input
                      type="text"
                      required
                      value={outCustomerName}
                      onChange={(e) => setOutCustomerName(e.target.value)}
                      placeholder="Customer / Buyer Name"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={outCustomerName}
                  onChange={(e) => setOutCustomerName(e.target.value)}
                  placeholder="Customer / Buyer Name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={outInvoice}
                onChange={(e) => setOutInvoice(e.target.value)}
                placeholder="e.g. INV-2026-001"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity ({selectedOutProduct?.unit || 'unit'}) *{' '}
                {selectedOutProduct && (
                  <span className="text-slate-500 font-normal">
                    (Avail: {formatNumber(selectedOutProduct.availableStock)})
                  </span>
                )}
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={outQty}
                onChange={(e) => setOutQty(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sale Rate (₹ per unit) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={outRate}
                onChange={(e) => setOutRate(e.target.value)}
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
                value={outDiscount}
                onChange={(e) => setOutDiscount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Additional Charges (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={outCharges}
                onChange={(e) => setOutCharges(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-[#F8FAF9] border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Net Sale Amount</span>
              <span className="text-base font-semibold text-slate-950 font-mono-tabular">
                {formatINR(salePreview.netSaleTotal)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">
                COGS (at {formatINR(selectedOutProduct?.avgPurchasePrice || 0)} avg cost)
              </span>
              <span className="text-base font-semibold text-slate-700 font-mono-tabular">
                {formatINR(salePreview.costOfGoodsSold)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Estimated Gross Profit</span>
              <span
                className={`text-base font-semibold font-mono-tabular ${
                  salePreview.grossProfit >= 0 ? 'text-[#14452F]' : 'text-red-700'
                }`}
              >
                {formatINR(salePreview.grossProfit)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={outNotes}
              onChange={(e) => setOutNotes(e.target.value)}
              placeholder="Dispatch LR number, payment terms, remarks..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || activeStockProducts.length === 0}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
            >
              {submitting ? 'Saving Transaction...' : 'Save Stock Out Sale'}
            </button>
          </div>
        </form>
      )}

      {/* Recent / Filtered History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {mode === 'stock-in'
              ? `Recent Purchases (${filteredPurchases.length})`
              : `Recent Sales (${filteredSales.length})`}
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={historySearch}
              onChange={(e) => {
                setHistorySearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice, product, party..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>
        {mode === 'stock-in' ? (
          filteredPurchases.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500">No purchase records yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-semibold">Date</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Invoice</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Product</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Supplier</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Qty</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Rate</th>
                      <th className="text-right py-2.5 px-3 font-semibold">Expenses</th>
                      <th className="text-right py-2.5 px-4 font-semibold">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono-tabular text-slate-600">
                          {p.purchaseDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-slate-700">
                          {p.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {p.productName}
                          <span className="block text-[11px] text-slate-500 font-normal">
                            {p.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{p.supplierName}</td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          {formatNumber(p.quantity)} {p.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          {formatINR(p.purchaseRate)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          {formatINR(p.additionalExpenses)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                          {formatINR(p.totalAmount)}
                        </td>
                      </tr>
                    ))}
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
          )
        ) : filteredSales.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No sales records yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold">Date</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Invoice</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Product</th>
                    <th className="text-left py-2.5 px-3 font-semibold">Customer</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Qty</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Net Sale</th>
                    <th className="text-right py-2.5 px-3 font-semibold">COGS</th>
                    <th className="text-right py-2.5 px-4 font-semibold">Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-tabular text-slate-600">
                        {s.saleDate}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-slate-700">
                        {s.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {s.productName}
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {s.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{s.customerName}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {formatNumber(s.quantity)} {s.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                        {formatINR(s.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-600">
                        {formatINR(s.costOfGoodsSold)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono-tabular font-semibold ${
                          s.grossProfit >= 0 ? 'text-[#14452F]' : 'text-red-700'
                        }`}
                      >
                        {formatINR(s.grossProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={filteredSales.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={
          pendingConfirm === 'in'
            ? `Confirm ${inType} stock adjustment?`
            : `Confirm ${outType} stock adjustment?`
        }
        description={
          pendingConfirm === 'in'
            ? `You are about to record a ${inType} entry of ${inQty} ${selectedInProduct?.unit || ''} for ${selectedInProduct?.name || ''} (Invoice ${inInvoice}).`
            : `You are about to record a ${outType} entry of ${outQty} ${selectedOutProduct?.unit || ''} for ${selectedOutProduct?.name || ''} (Invoice ${outInvoice}).`
        }
        variant="primary"
        confirmLabel="Confirm & Post Entry"
        busy={submitting}
        onConfirm={() => (pendingConfirm === 'in' ? executeStockIn() : executeStockOut())}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
