import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import {
  filterRecordsByDate,
  formatINR,
  formatNumber,
  roundCurrency,
} from '../../lib/accounting';
import { getPurchaseSign, getReversedPurchaseIdSet } from '../../lib/purchaseValidation';
import {
  exportRowsToCSV,
  exportRowsToExcel,
  mapPurchasesForExport,
  mapSalesForExport,
} from '../../lib/reports';
import type { DateFilterPreset, Purchase, Sale } from '../../types';
import { DateRangeFilterBar } from './shared/DateRangeFilterBar';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface TransactionHistoryTabProps {
  mode: 'purchases' | 'sales';
  purchases?: Purchase[];
  sales?: Sale[];
}

type SortKey = 'date' | 'invoice' | 'product' | 'party' | 'qty' | 'amount' | 'profit';

export function TransactionHistoryTab({
  mode,
  purchases = [],
  sales = [],
}: TransactionHistoryTabProps) {
  const [preset, setPreset] = useState<DateFilterPreset>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'amount' || key === 'profit' || key === 'qty' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const reversedPurchaseIds = useMemo(
    () => getReversedPurchaseIdSet(purchases),
    [purchases]
  );

  const filteredPurchases = useMemo(() => {
    if (mode !== 'purchases') return [];
    const byDate = filterRecordsByDate(purchases, 'purchaseDate', preset, customStart, customEnd);
    const q = search.trim().toLowerCase();
    const list = byDate.filter((p) => {
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
      if (!q) return true;
      return (
        (p.purchaseId || p.id).toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.purchaseDate.localeCompare(b.purchaseDate);
      else if (sortKey === 'invoice') cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      else if (sortKey === 'product') cmp = a.productName.localeCompare(b.productName);
      else if (sortKey === 'party') cmp = a.supplierName.localeCompare(b.supplierName);
      else if (sortKey === 'qty') cmp = a.quantity - b.quantity;
      else if (sortKey === 'amount') cmp = a.totalAmount - b.totalAmount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [mode, purchases, preset, customStart, customEnd, search, typeFilter, sortKey, sortDir]);

  const filteredSales = useMemo(() => {
    if (mode !== 'sales') return [];
    const byDate = filterRecordsByDate(sales, 'saleDate', preset, customStart, customEnd);
    const q = search.trim().toLowerCase();
    const list = byDate.filter((s) => {
      if (typeFilter !== 'ALL' && s.type !== typeFilter) return false;
      if (!q) return true;
      return (
        s.productName.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.saleDate.localeCompare(b.saleDate);
      else if (sortKey === 'invoice') cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      else if (sortKey === 'product') cmp = a.productName.localeCompare(b.productName);
      else if (sortKey === 'party') cmp = a.customerName.localeCompare(b.customerName);
      else if (sortKey === 'qty') cmp = a.quantity - b.quantity;
      else if (sortKey === 'amount') cmp = a.totalAmount - b.totalAmount;
      else if (sortKey === 'profit') cmp = a.grossProfit - b.grossProfit;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [mode, sales, preset, customStart, customEnd, search, typeFilter, sortKey, sortDir]);

  const purchaseTotals = useMemo(() => {
    let netQty = 0;
    let netValue = 0;
    let totalExpenses = 0;
    for (const p of filteredPurchases) {
      const sign = getPurchaseSign(p.type);
      netQty += sign * p.quantity;
      netValue += sign * p.totalAmount;
      totalExpenses += sign * p.additionalExpenses;
    }
    return {
      count: filteredPurchases.length,
      netQty: roundCurrency(netQty),
      netValue: roundCurrency(netValue),
      totalExpenses: roundCurrency(totalExpenses),
    };
  }, [filteredPurchases]);

  const salesTotals = useMemo(() => {
    let netQty = 0;
    let netRevenue = 0;
    let netCogs = 0;
    let netProfit = 0;
    for (const s of filteredSales) {
      const sign = s.type === 'CUSTOMER_RETURN' ? -1 : 1;
      netQty += sign * s.quantity;
      netRevenue += sign * s.totalAmount;
      netCogs += sign * s.costOfGoodsSold;
      netProfit += sign * s.grossProfit;
    }
    return {
      count: filteredSales.length,
      netQty: roundCurrency(netQty),
      netRevenue: roundCurrency(netRevenue),
      netCogs: roundCurrency(netCogs),
      netProfit: roundCurrency(netProfit),
    };
  }, [filteredSales]);

  const totalCount = mode === 'purchases' ? filteredPurchases.length : filteredSales.length;
  const pagedPurchases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, page, pageSize]);

  const pagedSales = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, page, pageSize]);

  const dateSuffix = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
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

      {/* Period Summary Strip */}
      {mode === 'purchases' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500">Purchase Entries</p>
            <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
              {formatNumber(purchaseTotals.count, 0)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500">Net Purchased Quantity</p>
            <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
              {formatNumber(purchaseTotals.netQty)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500">Freight &amp; Handling Expenses</p>
            <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
              {formatINR(purchaseTotals.totalExpenses)}
            </p>
          </div>
          <div className="bg-[#ECF4EF] border border-[#14452F]/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-[#14452F]">Net Purchase Value</p>
            <p className="text-xl font-semibold text-[#14452F] font-mono-tabular mt-1">
              {formatINR(purchaseTotals.netValue)}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500">Sales Invoices</p>
            <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
              {formatNumber(salesTotals.count, 0)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500">Net Sales Revenue</p>
            <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
              {formatINR(salesTotals.netRevenue)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</p>
            <p className="text-xl font-semibold text-slate-700 font-mono-tabular mt-1">
              {formatINR(salesTotals.netCogs)}
            </p>
          </div>
          <div className="bg-[#ECF4EF] border border-[#14452F]/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-[#14452F]">Period Gross Profit</p>
            <p
              className={`text-xl font-semibold font-mono-tabular mt-1 ${
                salesTotals.netProfit >= 0 ? 'text-[#14452F]' : 'text-red-700'
              }`}
            >
              {formatINR(salesTotals.netProfit)}
            </p>
          </div>
        </div>
      )}

      {/* Search, Type Filter & Export Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                mode === 'purchases'
                  ? 'Search invoice, product, SKU, supplier...'
                  : 'Search invoice, product, SKU, customer...'
              }
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            aria-label="Filter transaction type"
          >
            <option value="ALL">All Entry Types</option>
            {mode === 'purchases' ? (
              <>
                <option value="PURCHASE">Standard Purchase</option>
                <option value="CORRECTION">Inward Correction</option>
                <option value="RETURN_TO_SUPPLIER">Return to Supplier</option>
                <option value="CANCELLATION_REVERSAL">Cancellation / Edit Reversal</option>
              </>
            ) : (
              <>
                <option value="SALE">Wholesale Sale</option>
                <option value="CORRECTION">Outward Correction</option>
                <option value="CUSTOMER_RETURN">Customer Return</option>
              </>
            )}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              mode === 'purchases'
                ? exportRowsToCSV(
                    mapPurchasesForExport(filteredPurchases),
                    `gazi-jute-purchases-${dateSuffix}`
                  )
                : exportRowsToCSV(
                    mapSalesForExport(filteredSales),
                    `gazi-jute-sales-${dateSuffix}`
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
              mode === 'purchases'
                ? exportRowsToExcel(
                    mapPurchasesForExport(filteredPurchases),
                    'Purchases',
                    `gazi-jute-purchases-${dateSuffix}`
                  )
                : exportRowsToExcel(
                    mapSalesForExport(filteredSales),
                    'Sales',
                    `gazi-jute-sales-${dateSuffix}`
                  )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {totalCount === 0 ? (
          <p className="p-12 text-center text-xs text-slate-500">
            No {mode === 'purchases' ? 'purchase' : 'sales'} records match the selected date range and filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              {mode === 'purchases' ? (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <SortableHeader
                        label="Date"
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
                        sortKey="party"
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
                      <th className="text-right py-3 px-3 font-semibold">Rate</th>
                      <th className="text-right py-3 px-3 font-semibold">Expenses</th>
                      <SortableHeader
                        label="Total Amount"
                        sortKey="amount"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        align="right"
                        className="pr-4"
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedPurchases.map((p) => {
                      const isNeg = getPurchaseSign(p.type) < 0;
                      const isReversed =
                        reversedPurchaseIds.has(p.id) ||
                        Boolean(p.purchaseId && reversedPurchaseIds.has(p.purchaseId));
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                            {p.purchaseDate}
                            <span className="block text-[10px] text-slate-400">
                              {p.purchaseId || p.id}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono-tabular text-slate-800 whitespace-nowrap">
                            {p.invoiceNumber}
                            {isReversed && (
                              <span className="block text-[10px] text-amber-700 font-semibold">
                                Reversed
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-900">{p.productName}</span>
                            <span className="block text-[11px] font-mono-tabular text-slate-500">
                              {p.sku} · {p.type} · {p.paymentStatus || 'PAID'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700">{p.supplierName}</td>
                          <td className="py-3 px-3 text-right font-mono-tabular whitespace-nowrap">
                            {isNeg ? '-' : ''}
                            {formatNumber(p.quantity)} {p.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-slate-700">
                            {formatINR(p.purchaseRate)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-slate-600">
                            {formatINR(p.additionalExpenses)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                              isReversed
                                ? 'line-through text-slate-400'
                                : isNeg
                                  ? 'text-amber-700'
                                  : 'text-slate-900'
                            }`}
                          >
                            {isNeg ? '-' : ''}
                            {formatINR(p.totalAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <SortableHeader
                        label="Date"
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
                        label="Customer"
                        sortKey="party"
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
                      <SortableHeader
                        label="Net Sale"
                        sortKey="amount"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <th className="text-right py-3 px-3 font-semibold">COGS</th>
                      <SortableHeader
                        label="Gross Profit"
                        sortKey="profit"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        align="right"
                        className="pr-4"
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                          {s.saleDate}
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-slate-800 whitespace-nowrap">
                          {s.invoiceNumber}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-900">{s.productName}</span>
                          <span className="block text-[11px] font-mono-tabular text-slate-500">
                            {s.sku} · {s.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{s.customerName}</td>
                        <td className="py-3 px-3 text-right font-mono-tabular whitespace-nowrap">
                          {s.type === 'CUSTOMER_RETURN' ? '+' : ''}
                          {formatNumber(s.quantity)} {s.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                          {s.type === 'CUSTOMER_RETURN' ? '-' : ''}
                          {formatINR(s.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-slate-600">
                          {formatINR(s.costOfGoodsSold)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                            s.type === 'CUSTOMER_RETURN'
                              ? 'text-amber-700'
                              : s.grossProfit >= 0
                                ? 'text-[#14452F]'
                                : 'text-red-700'
                          }`}
                        >
                          {s.type === 'CUSTOMER_RETURN' ? '-' : ''}
                          {formatINR(s.grossProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={totalCount}
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
