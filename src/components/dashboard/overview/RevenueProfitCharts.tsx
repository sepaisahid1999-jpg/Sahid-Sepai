import { useMemo } from 'react';
import { formatINR, type MonthlyComparisonPoint } from '../../../lib/accounting';
import type { CategoryPerformancePoint } from '../../../lib/dashboardMetrics';

interface RevenueProfitChartsProps {
  monthlySeries: MonthlyComparisonPoint[];
  categoryBreakdown: CategoryPerformancePoint[];
}

export function RevenueProfitCharts({
  monthlySeries,
  categoryBreakdown,
}: RevenueProfitChartsProps) {
  const maxMonthlyVal = useMemo(
    () =>
      Math.max(
        1,
        ...monthlySeries.flatMap((d) => [d.purchaseTotal, d.salesTotal, Math.max(0, d.grossProfit)])
      ),
    [monthlySeries]
  );

  const maxCategoryMetric = useMemo(
    () =>
      Math.max(
        1,
        ...categoryBreakdown.flatMap((c) => [c.stockValue, Math.max(0, c.salesRevenue)])
      ),
    [categoryBreakdown]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Monthly Purchases vs Sales Revenue vs Gross Profit */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Monthly Purchases, Revenue &amp; Profit
            </h3>
            <p className="text-xs text-slate-500">Comparative INR totals by calendar month</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" />
              Purchases
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-[#14452F] inline-block" />
              Sales
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
              Profit
            </span>
          </div>
        </div>

        {monthlySeries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No purchase or sales transactions recorded in the selected date range.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-52 flex items-end gap-3 pt-4 border-b border-slate-200 pb-2 overflow-x-auto">
              {monthlySeries.map((pt) => {
                const pHeight = Math.max(4, Math.round((pt.purchaseTotal / maxMonthlyVal) * 160));
                const sHeight = Math.max(4, Math.round((pt.salesTotal / maxMonthlyVal) * 160));
                const gHeight = Math.max(
                  4,
                  Math.round((Math.max(0, pt.grossProfit) / maxMonthlyVal) * 160)
                );
                return (
                  <div
                    key={pt.monthKey}
                    className="flex-1 min-w-[64px] flex flex-col items-center justify-end gap-2"
                  >
                    <div className="flex items-end gap-1 h-[168px]">
                      <div
                        style={{ height: `${pHeight}px` }}
                        title={`Purchases: ${formatINR(pt.purchaseTotal)}`}
                        className="w-3 sm:w-4 bg-slate-300 rounded-t transition-all"
                      />
                      <div
                        style={{ height: `${sHeight}px` }}
                        title={`Sales Revenue: ${formatINR(pt.salesTotal)}`}
                        className="w-3 sm:w-4 bg-[#14452F] rounded-t transition-all"
                      />
                      <div
                        style={{ height: `${gHeight}px` }}
                        title={`Gross Profit: ${formatINR(pt.grossProfit)}`}
                        className="w-3 sm:w-4 bg-emerald-400 rounded-t transition-all"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap">
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="text-left py-2 font-medium">Month</th>
                    <th className="text-right py-2 font-medium">Purchases</th>
                    <th className="text-right py-2 font-medium">Sales</th>
                    <th className="text-right py-2 font-medium">Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-tabular">
                  {monthlySeries.map((pt) => (
                    <tr key={pt.monthKey} className="hover:bg-slate-50">
                      <td className="py-2 font-sans text-slate-800">{pt.label}</td>
                      <td className="py-2 text-right text-slate-700">
                        {formatINR(pt.purchaseTotal)}
                      </td>
                      <td className="py-2 text-right text-slate-900 font-medium">
                        {formatINR(pt.salesTotal)}
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          pt.grossProfit >= 0 ? 'text-[#14452F]' : 'text-red-700'
                        }`}
                      >
                        {formatINR(pt.grossProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Category Valuation & Revenue */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Category Value &amp; Sales
            </h3>
            <p className="text-xs text-slate-500">Inventory valuation vs period revenue</p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
              Stock
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#14452F] inline-block" />
              Sales
            </span>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">
            No category stock or sales data yet.
          </p>
        ) : (
          <div className="space-y-4">
            {categoryBreakdown.map((cat) => {
              const stockW = Math.round((cat.stockValue / maxCategoryMetric) * 100);
              const salesW = Math.round((Math.max(0, cat.salesRevenue) / maxCategoryMetric) * 100);
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-medium text-slate-800 truncate">
                      {cat.name}{' '}
                      <span className="text-slate-400 font-normal">({cat.skuCount} SKUs)</span>
                    </span>
                    <span className="font-mono-tabular text-[11px] text-slate-700 shrink-0">
                      {formatINR(cat.salesRevenue)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-full"
                        style={{ width: `${Math.max(stockW, cat.stockValue > 0 ? 3 : 0)}%` }}
                        title={`Stock Value: ${formatINR(cat.stockValue)}`}
                      />
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14452F] rounded-full"
                        style={{ width: `${Math.max(salesW, cat.salesRevenue > 0 ? 3 : 0)}%` }}
                        title={`Sales Revenue: ${formatINR(cat.salesRevenue)}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
