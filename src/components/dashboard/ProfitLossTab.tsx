import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Search, TrendingUp } from 'lucide-react';
import {
  computeMonthlySeries,
  filterRecordsByDate,
  formatINR,
  formatNumber,
  roundCurrency,
} from '../../lib/accounting';
import { getPurchaseSign } from '../../lib/purchaseValidation';
import { exportRowsToCSV, exportRowsToExcel } from '../../lib/reports';
import type { DateFilterPreset, Product, Purchase, Sale } from '../../types';
import { DateRangeFilterBar } from './shared/DateRangeFilterBar';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface ProfitLossTabProps {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
}

type SortKey = 'name' | 'soldQty' | 'revenue' | 'cogs' | 'profit' | 'margin';

interface ProductProfitRow {
  productId: string;
  sku: string;
  name: string;
  categoryName: string;
  unit: string;
  soldQty: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPct: number;
  stockValue: number;
}

export function ProfitLossTab({ products, purchases, sales }: ProfitLossTabProps) {
  const [preset, setPreset] = useState<DateFilterPreset>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('profit');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredPurchases = useMemo(
    () => filterRecordsByDate(purchases, 'purchaseDate', preset, customStart, customEnd),
    [purchases, preset, customStart, customEnd]
  );

  const filteredSales = useMemo(
    () => filterRecordsByDate(sales, 'saleDate', preset, customStart, customEnd),
    [sales, preset, customStart, customEnd]
  );

  const pnl = useMemo(() => {
    const netRevenue = roundCurrency(
      filteredSales.reduce(
        (acc, s) => acc + (s.type === 'CUSTOMER_RETURN' ? -s.totalAmount : s.totalAmount),
        0
      )
    );
    const totalCogs = roundCurrency(
      filteredSales.reduce(
        (acc, s) => acc + (s.type === 'CUSTOMER_RETURN' ? -s.costOfGoodsSold : s.costOfGoodsSold),
        0
      )
    );
    const grossProfit = roundCurrency(
      filteredSales.reduce(
        (acc, s) => acc + (s.type === 'CUSTOMER_RETURN' ? -s.grossProfit : s.grossProfit),
        0
      )
    );
    const grossMarginPct =
      netRevenue > 0 ? roundCurrency((grossProfit / netRevenue) * 100) : 0;

    const periodPurchases = roundCurrency(
      filteredPurchases.reduce(
        (acc, p) => acc + getPurchaseSign(p.type) * p.totalAmount,
        0
      )
    );
    const closingStockValue = roundCurrency(
      products.reduce((acc, p) => acc + p.currentStockValue, 0)
    );
    const unrealizedMargin = roundCurrency(
      products.reduce((acc, p) => acc + p.estimatedProfit, 0)
    );

    return {
      netRevenue,
      totalCogs,
      grossProfit,
      grossMarginPct,
      periodPurchases,
      closingStockValue,
      unrealizedMargin,
    };
  }, [filteredSales, filteredPurchases, products]);

  const monthlySeries = useMemo(
    () => computeMonthlySeries(filteredPurchases, filteredSales).slice(-12),
    [filteredPurchases, filteredSales]
  );

  const maxMonthlyMetric = useMemo(
    () =>
      Math.max(
        1,
        ...monthlySeries.flatMap((m) => [m.salesTotal, Math.abs(m.grossProfit)])
      ),
    [monthlySeries]
  );

  const productRows = useMemo<ProductProfitRow[]>(() => {
    const byProd = new Map<
      string,
      { soldQty: number; revenue: number; cogs: number; profit: number }
    >();
    for (const s of filteredSales) {
      const sign = s.type === 'CUSTOMER_RETURN' ? -1 : 1;
      const cur = byProd.get(s.productId) || { soldQty: 0, revenue: 0, cogs: 0, profit: 0 };
      cur.soldQty = roundCurrency(cur.soldQty + sign * s.quantity);
      cur.revenue = roundCurrency(cur.revenue + sign * s.totalAmount);
      cur.cogs = roundCurrency(cur.cogs + sign * s.costOfGoodsSold);
      cur.profit = roundCurrency(cur.profit + sign * s.grossProfit);
      byProd.set(s.productId, cur);
    }

    const q = search.trim().toLowerCase();
    const rows = products
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
        );
      })
      .map((p) => {
        const agg = byProd.get(p.productId) || {
          soldQty: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
        const marginPct = agg.revenue > 0 ? roundCurrency((agg.profit / agg.revenue) * 100) : 0;
        return {
          productId: p.productId,
          sku: p.sku,
          name: p.name,
          categoryName: p.categoryName,
          unit: p.unit,
          soldQty: agg.soldQty,
          revenue: agg.revenue,
          cogs: agg.cogs,
          profit: agg.profit,
          marginPct,
          stockValue: p.currentStockValue,
        };
      });

    return rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'soldQty') cmp = a.soldQty - b.soldQty;
      else if (sortKey === 'revenue') cmp = a.revenue - b.revenue;
      else if (sortKey === 'cogs') cmp = a.cogs - b.cogs;
      else if (sortKey === 'profit') cmp = a.profit - b.profit;
      else if (sortKey === 'margin') cmp = a.marginPct - b.marginPct;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, filteredSales, search, sortKey, sortDir]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return productRows.slice(start, start + pageSize);
  }, [productRows, page, pageSize]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const exportRows = useMemo(
    () =>
      productRows.map((r) => ({
        SKU: r.sku,
        ProductName: r.name,
        Category: r.categoryName,
        Unit: r.unit,
        PeriodSoldQty: r.soldQty,
        NetSalesRevenueINR: r.revenue,
        PeriodCOGSINR: r.cogs,
        RealizedGrossProfitINR: r.profit,
        GrossMarginPercent: r.marginPct,
        ClosingStockValueINR: r.stockValue,
      })),
    [productRows]
  );

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

      {/* P&L KPI Statement Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Net Sales Revenue</p>
          <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
            {formatINR(pnl.netRevenue)}
          </p>
          <p className="text-xs text-slate-500">{filteredSales.length} sales entries in period</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</p>
          <p className="text-2xl font-semibold text-slate-800 font-mono-tabular">
            {formatINR(pnl.totalCogs)}
          </p>
          <p className="text-xs text-slate-500">Weighted avg cost of sold stock</p>
        </div>

        <div className="bg-[#ECF4EF] border border-[#14452F]/20 rounded-xl p-5 space-y-1">
          <p className="text-xs font-semibold text-[#14452F]">Realized Gross Profit</p>
          <p
            className={`text-2xl font-semibold font-mono-tabular ${
              pnl.grossProfit >= 0 ? 'text-[#14452F]' : 'text-red-700'
            }`}
          >
            {formatINR(pnl.grossProfit)}
          </p>
          <p className="text-xs text-[#14452F]/80 font-mono-tabular">
            Gross Margin: {pnl.grossMarginPct.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Capitalized Closing Stock</p>
          <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
            {formatINR(pnl.closingStockValue)}
          </p>
          <p className="text-xs text-slate-500 font-mono-tabular">
            Est. Remaining Margin: {formatINR(pnl.unrealizedMargin)}
          </p>
        </div>
      </div>

      {/* Period Purchases vs COGS Accounting Note */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600 leading-relaxed flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
            <TrendingUp className="w-4 h-4 text-[#14452F]" />
            <span>Profit &amp; Loss Statement Methodology</span>
          </div>
          <p>
            Period purchases (<span className="font-mono-tabular font-semibold">{formatINR(pnl.periodPurchases)}</span>)
            capitalize into inventory until dispatched. Gross Profit reflects only realized sales
            revenue minus matched weighted-average COGS.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportRowsToCSV(exportRows, `gazi-jute-pnl-${dateSuffix}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() =>
              exportRowsToExcel(exportRows, 'ProfitAndLoss', `gazi-jute-pnl-${dateSuffix}`)
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Monthly Revenue vs Gross Profit Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Monthly Sales Revenue vs Gross Profit
            </h3>
            <p className="text-xs text-slate-500">Realized monthly performance across selected range</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" />
              Sales Revenue
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-[#14452F] inline-block" />
              Gross Profit
            </span>
          </div>
        </div>

        {monthlySeries.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">
            No sales or purchase transactions in this period.
          </p>
        ) : (
          <div className="h-48 flex items-end gap-3 pt-4 border-b border-slate-200 pb-2 overflow-x-auto">
            {monthlySeries.map((pt) => {
              const revH = Math.max(4, Math.round((pt.salesTotal / maxMonthlyMetric) * 148));
              const profH = Math.max(4, Math.round((Math.max(0, pt.grossProfit) / maxMonthlyMetric) * 148));
              return (
                <div
                  key={pt.monthKey}
                  className="flex-1 min-w-[56px] flex flex-col items-center justify-end gap-2"
                >
                  <div className="flex items-end gap-1.5 h-[156px]">
                    <div
                      style={{ height: `${revH}px` }}
                      title={`Revenue: ${formatINR(pt.salesTotal)}`}
                      className="w-4 sm:w-5 bg-slate-300 rounded-t"
                    />
                    <div
                      style={{ height: `${profH}px` }}
                      title={`Gross Profit: ${formatINR(pt.grossProfit)}`}
                      className="w-4 sm:w-5 bg-[#14452F] rounded-t"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product-wise P&L Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Product-wise Profit &amp; Margin Breakdown ({productRows.length})
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search SKU, product, category..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {productRows.length === 0 ? (
          <p className="p-10 text-center text-xs text-slate-500">No matching products found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <SortableHeader
                      label="Product"
                      sortKey="name"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableHeader
                      label="Sold Qty"
                      sortKey="soldQty"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Net Revenue"
                      sortKey="revenue"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="COGS"
                      sortKey="cogs"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Gross Profit"
                      sortKey="profit"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Margin %"
                      sortKey="margin"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="text-right py-3 px-4 font-semibold">Closing Stock Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRows.map((row) => (
                    <tr key={row.productId} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{row.name}</span>
                        <span className="block text-[11px] font-mono-tabular text-slate-500">
                          {row.sku} · {row.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-slate-700">
                        {formatNumber(row.soldQty)} {row.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-slate-900">
                        {formatINR(row.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-slate-600">
                        {formatINR(row.cogs)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono-tabular font-semibold ${
                          row.profit >= 0 ? 'text-[#14452F]' : 'text-red-700'
                        }`}
                      >
                        {formatINR(row.profit)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-slate-700">
                        {row.marginPct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-700">
                        {formatINR(row.stockValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={productRows.length}
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
