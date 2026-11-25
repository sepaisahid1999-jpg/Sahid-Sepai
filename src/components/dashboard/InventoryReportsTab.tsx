import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, HardDriveDownload, Search } from 'lucide-react';
import {
  filterRecordsByDate,
  formatINR,
  formatNumber,
  roundCurrency,
} from '../../lib/accounting';
import {
  exportFullJsonBackup,
  exportRowsToCSV,
  exportRowsToExcel,
  mapLowStockForExport,
  mapProductStockForExport,
  mapStockLedgerForExport,
} from '../../lib/reports';
import type {
  Category,
  CompanySettings,
  DateFilterPreset,
  Enquiry,
  Product,
  Purchase,
  Sale,
  StockTransaction,
} from '../../types';
import { DateRangeFilterBar } from './shared/DateRangeFilterBar';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface InventoryReportsTabProps {
  products: Product[];
  categories: Category[];
  purchases: Purchase[];
  sales: Sale[];
  transactions: StockTransaction[];
  enquiries: Enquiry[];
  settings: CompanySettings;
}

type StockSortKey = 'name' | 'category' | 'stock' | 'avgCost' | 'value';
type LedgerSortKey = 'date' | 'type' | 'product' | 'delta' | 'value' | 'resulting';

export function InventoryReportsTab({
  products,
  categories,
  purchases,
  sales,
  transactions,
  enquiries,
  settings,
}: InventoryReportsTabProps) {
  const [subView, setSubView] = useState<'valuation' | 'ledger'>('valuation');

  // Stock Valuation filters
  const [stockSearch, setStockSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'HEALTHY' | 'LOW' | 'OUT'>('ALL');
  const [stockSortKey, setStockSortKey] = useState<StockSortKey>('value');
  const [stockSortDir, setStockSortDir] = useState<SortDirection>('desc');
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(10);

  // Ledger filters
  const [preset, setPreset] = useState<DateFilterPreset>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [ledgerSortKey, setLedgerSortKey] = useState<LedgerSortKey>('date');
  const [ledgerSortDir, setLedgerSortDir] = useState<SortDirection>('desc');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(15);

  const summary = useMemo(() => {
    const totalStockValue = roundCurrency(products.reduce((a, p) => a + p.currentStockValue, 0));
    const totalUnits = roundCurrency(products.reduce((a, p) => a + p.availableStock, 0));
    const lowStockCount = products.filter(
      (p) =>
        p.status !== 'ARCHIVED' && p.availableStock > 0 && p.availableStock <= p.lowStockThreshold
    ).length;
    const outOfStockCount = products.filter(
      (p) => p.status !== 'ARCHIVED' && p.availableStock <= 0
    ).length;
    return { totalStockValue, totalUnits, lowStockCount, outOfStockCount };
  }, [products]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; stockValue: number; productCount: number; qty: number }>();
    for (const c of categories) {
      map.set(c.id, { name: c.name, stockValue: 0, productCount: 0, qty: 0 });
    }
    for (const p of products) {
      const existing = map.get(p.categoryId) || {
        name: p.categoryName || 'Uncategorized',
        stockValue: 0,
        productCount: 0,
        qty: 0,
      };
      existing.stockValue = roundCurrency(existing.stockValue + p.currentStockValue);
      existing.productCount += 1;
      existing.qty = roundCurrency(existing.qty + p.availableStock);
      map.set(p.categoryId, existing);
    }
    return Array.from(map.values())
      .filter((item) => item.productCount > 0)
      .sort((a, b) => b.stockValue - a.stockValue);
  }, [categories, products]);

  const maxCategoryValue = useMemo(
    () => Math.max(1, ...categoryBreakdown.map((c) => c.stockValue)),
    [categoryBreakdown]
  );

  const handleStockSort = (key: StockSortKey) => {
    if (stockSortKey === key) setStockSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setStockSortKey(key);
      setStockSortDir(key === 'name' || key === 'category' ? 'asc' : 'desc');
    }
    setStockPage(1);
  };

  const filteredStock = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    const list = products.filter((p) => {
      if (healthFilter === 'OUT' && p.availableStock > 0) return false;
      if (
        healthFilter === 'LOW' &&
        !(p.availableStock > 0 && p.availableStock <= p.lowStockThreshold)
      )
        return false;
      if (healthFilter === 'HEALTHY' && p.availableStock <= p.lowStockThreshold) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (stockSortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (stockSortKey === 'category') cmp = a.categoryName.localeCompare(b.categoryName);
      else if (stockSortKey === 'stock') cmp = a.availableStock - b.availableStock;
      else if (stockSortKey === 'avgCost') cmp = a.avgPurchasePrice - b.avgPurchasePrice;
      else if (stockSortKey === 'value') cmp = a.currentStockValue - b.currentStockValue;
      return stockSortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, stockSearch, healthFilter, stockSortKey, stockSortDir]);

  const pagedStock = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredStock.slice(start, start + stockPageSize);
  }, [filteredStock, stockPage, stockPageSize]);

  const handleLedgerSort = (key: LedgerSortKey) => {
    if (ledgerSortKey === key) setLedgerSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setLedgerSortKey(key);
      setLedgerSortDir(key === 'date' || key === 'value' || key === 'delta' ? 'desc' : 'asc');
    }
    setLedgerPage(1);
  };

  const filteredLedger = useMemo(() => {
    const byDate = filterRecordsByDate(transactions, 'txDate', preset, customStart, customEnd);
    const q = ledgerSearch.trim().toLowerCase();
    const list = byDate.filter((t) => {
      if (txTypeFilter !== 'ALL' && t.txType !== txTypeFilter) return false;
      if (!q) return true;
      return (
        t.productName.toLowerCase().includes(q) ||
        t.sku.toLowerCase().includes(q) ||
        t.txType.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        t.referenceId.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (ledgerSortKey === 'date') cmp = a.txDate.localeCompare(b.txDate);
      else if (ledgerSortKey === 'type') cmp = a.txType.localeCompare(b.txType);
      else if (ledgerSortKey === 'product') cmp = a.productName.localeCompare(b.productName);
      else if (ledgerSortKey === 'delta') cmp = a.quantityDelta - b.quantityDelta;
      else if (ledgerSortKey === 'value') cmp = a.totalValue - b.totalValue;
      else if (ledgerSortKey === 'resulting') cmp = a.resultingStock - b.resultingStock;
      return ledgerSortDir === 'asc' ? cmp : -cmp;
    });
  }, [transactions, preset, customStart, customEnd, ledgerSearch, txTypeFilter, ledgerSortKey, ledgerSortDir]);

  const pagedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerPageSize;
    return filteredLedger.slice(start, start + ledgerPageSize);
  }, [filteredLedger, ledgerPage, ledgerPageSize]);

  const dateSuffix = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ECF4EF] border border-[#14452F]/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-[#14452F]">Estimated Inventory Value</p>
          <p className="text-xl font-semibold text-[#14452F] font-mono-tabular mt-1">
            {formatINR(summary.totalStockValue)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Stock Units On Hand</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(summary.totalUnits)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Low Stock SKUs</p>
          <p className="text-xl font-semibold text-amber-700 font-mono-tabular mt-1">
            {formatNumber(summary.lowStockCount, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Out of Stock SKUs</p>
          <p className="text-xl font-semibold text-red-700 font-mono-tabular mt-1">
            {formatNumber(summary.outOfStockCount, 0)}
          </p>
        </div>
      </div>

      {/* Category Stock Value Chart + Quick Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Inventory Capitalization by Category
            </h3>
            <p className="text-xs text-slate-500">
              Live stock value distribution computed from product weighted average costs
            </p>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No categorized stock yet.</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => {
                const pct = Math.max(2, Math.round((item.stockValue / maxCategoryValue) * 100));
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">
                        {item.name}{' '}
                        <span className="text-slate-400 font-normal">
                          ({item.productCount} SKUs · {formatNumber(item.qty)} units)
                        </span>
                      </span>
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {formatINR(item.stockValue)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14452F] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Inventory Exports &amp; Backup
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export live stock valuation, low-stock reorder lists, immutable ledger movements, or a full JSON database backup.
            </p>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  exportRowsToCSV(mapProductStockForExport(products), `gazi-jute-stock-${dateSuffix}`)
                }
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Stock CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  exportRowsToExcel(
                    mapProductStockForExport(products),
                    'ProductStock',
                    `gazi-jute-stock-${dateSuffix}`
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Stock XLSX
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  exportRowsToCSV(mapLowStockForExport(products), `gazi-jute-low-stock-${dateSuffix}`)
                }
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Low Stock CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  exportRowsToExcel(
                    mapLowStockForExport(products),
                    'LowStock',
                    `gazi-jute-low-stock-${dateSuffix}`
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Low Stock XLSX
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                exportFullJsonBackup(
                  {
                    exportedAt: new Date().toISOString(),
                    settings,
                    categories,
                    products,
                    purchases,
                    sales,
                    stockTransactions: transactions,
                    enquiries,
                  },
                  `gazi-jute-full-backup-${dateSuffix}`
                )
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium text-[#14452F] bg-[#ECF4EF] hover:bg-[#DCECE3] rounded-lg"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              Download Full JSON Backup
            </button>
          </div>
        </div>
      </div>

      {/* Sub-view Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSubView('valuation')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            subView === 'valuation'
              ? 'bg-[#14452F] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Stock Valuation &amp; Alerts ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setSubView('ledger')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            subView === 'ledger'
              ? 'bg-[#14452F] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Immutable Stock Ledger ({transactions.length})
        </button>
      </div>

      {subView === 'valuation' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={stockSearch}
                onChange={(e) => {
                  setStockSearch(e.target.value);
                  setStockPage(1);
                }}
                placeholder="Search SKU, product name, category..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'All Stock' },
                  { id: 'HEALTHY', label: 'Healthy' },
                  { id: 'LOW', label: 'Low Stock' },
                  { id: 'OUT', label: 'Out of Stock' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setHealthFilter(tab.id);
                    setStockPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                    healthFilter === tab.id
                      ? 'bg-[#14452F] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredStock.length === 0 ? (
              <p className="p-10 text-center text-xs text-slate-500">
                No products match the selected stock health filter.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <SortableHeader
                          label="Product"
                          sortKey="name"
                          activeKey={stockSortKey}
                          direction={stockSortDir}
                          onSort={handleStockSort}
                          className="pl-4"
                        />
                        <SortableHeader
                          label="Category"
                          sortKey="category"
                          activeKey={stockSortKey}
                          direction={stockSortDir}
                          onSort={handleStockSort}
                        />
                        <SortableHeader
                          label="On Hand"
                          sortKey="stock"
                          activeKey={stockSortKey}
                          direction={stockSortDir}
                          onSort={handleStockSort}
                          align="right"
                        />
                        <th className="text-right py-3 px-3 font-semibold">Reorder At</th>
                        <SortableHeader
                          label="Avg Cost"
                          sortKey="avgCost"
                          activeKey={stockSortKey}
                          direction={stockSortDir}
                          onSort={handleStockSort}
                          align="right"
                        />
                        <SortableHeader
                          label="Stock Value"
                          sortKey="value"
                          activeKey={stockSortKey}
                          direction={stockSortDir}
                          onSort={handleStockSort}
                          align="right"
                        />
                        <th className="text-right py-3 px-4 font-semibold">Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedStock.map((p) => {
                        const isOut = p.availableStock <= 0;
                        const isLow = !isOut && p.availableStock <= p.lowStockThreshold;
                        return (
                          <tr key={p.productId} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900">{p.name}</span>
                              <span className="block text-[11px] font-mono-tabular text-slate-500">
                                {p.sku}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{p.categoryName}</td>
                            <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                              {formatNumber(p.availableStock)} {p.unit}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-tabular text-slate-500">
                              {formatNumber(p.lowStockThreshold)} {p.unit}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-tabular text-slate-700">
                              {formatINR(p.avgPurchasePrice)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                              {formatINR(p.currentStockValue)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  isOut
                                    ? 'bg-red-50 text-red-700'
                                    : isLow
                                      ? 'bg-amber-50 text-amber-800'
                                      : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  currentPage={stockPage}
                  totalItems={filteredStock.length}
                  pageSize={stockPageSize}
                  onPageChange={setStockPage}
                  onPageSizeChange={setStockPageSize}
                />
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <DateRangeFilterBar
            preset={preset}
            onPresetChange={(p) => {
              setPreset(p);
              setLedgerPage(1);
            }}
            customStart={customStart}
            onCustomStartChange={(v) => {
              setCustomStart(v);
              setLedgerPage(1);
            }}
            customEnd={customEnd}
            onCustomEndChange={(v) => {
              setCustomEnd(v);
              setLedgerPage(1);
            }}
          />

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setLedgerPage(1);
                  }}
                  placeholder="Search product, SKU, reference, notes..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <select
                value={txTypeFilter}
                onChange={(e) => {
                  setTxTypeFilter(e.target.value);
                  setLedgerPage(1);
                }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                aria-label="Filter ledger movement type"
              >
                <option value="ALL">All Movement Types</option>
                <option value="STOCK_IN">STOCK_IN</option>
                <option value="STOCK_OUT">STOCK_OUT</option>
                <option value="PURCHASE_CORRECTION">PURCHASE_CORRECTION</option>
                <option value="PURCHASE_REVERSAL">PURCHASE_REVERSAL</option>
                <option value="SALE_RETURN">SALE_RETURN</option>
                <option value="SALE_CANCELLATION">SALE_CANCELLATION</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportRowsToCSV(
                    mapStockLedgerForExport(filteredLedger),
                    `gazi-jute-ledger-${dateSuffix}`
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
                    mapStockLedgerForExport(filteredLedger),
                    'StockLedger',
                    `gazi-jute-ledger-${dateSuffix}`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                XLSX
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredLedger.length === 0 ? (
              <p className="p-10 text-center text-xs text-slate-500">
                No ledger transactions match the current filter.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <SortableHeader
                          label="Date"
                          sortKey="date"
                          activeKey={ledgerSortKey}
                          direction={ledgerSortDir}
                          onSort={handleLedgerSort}
                          className="pl-4"
                        />
                        <SortableHeader
                          label="Type"
                          sortKey="type"
                          activeKey={ledgerSortKey}
                          direction={ledgerSortDir}
                          onSort={handleLedgerSort}
                        />
                        <SortableHeader
                          label="Product"
                          sortKey="product"
                          activeKey={ledgerSortKey}
                          direction={ledgerSortDir}
                          onSort={handleLedgerSort}
                        />
                        <SortableHeader
                          label="Qty Delta"
                          sortKey="delta"
                          activeKey={ledgerSortKey}
                          direction={ledgerSortDir}
                          onSort={handleLedgerSort}
                          align="right"
                        />
                        <th className="text-right py-3 px-3 font-semibold">Unit Rate</th>
                        <SortableHeader
                          label="Total Value"
                          sortKey="value"
                          activeKey={ledgerSortKey}
                          direction={ledgerSortDir}
                          onSort={handleLedgerSort}
                          align="right"
                        />
                        <SortableHeader
                          label="Resulting Stock"
                          sortKey="resulting"
                          activeKey={ledgerSortKey}
                          direction={ledgerSortDir}
                          onSort={handleLedgerSort}
                          align="right"
                        />
                        <th className="text-right py-3 px-4 font-semibold">Avg Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedLedger.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70">
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
                  currentPage={ledgerPage}
                  totalItems={filteredLedger.length}
                  pageSize={ledgerPageSize}
                  onPageChange={setLedgerPage}
                  onPageSizeChange={setLedgerPageSize}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
