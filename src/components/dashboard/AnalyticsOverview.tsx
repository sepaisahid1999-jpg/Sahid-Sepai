import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { computeMonthlySeries, filterRecordsByDate } from '../../lib/accounting';
import {
  buildCategoryPerformance,
  calculateOverviewMetrics,
} from '../../lib/dashboardMetrics';
import type {
  Category,
  DateFilterPreset,
  Enquiry,
  Product,
  Purchase,
  Sale,
} from '../../types';
import { OverviewKpiGrid } from './overview/OverviewKpiGrid';
import { RecentTransactionsGrid } from './overview/RecentTransactionsGrid';
import { RevenueProfitCharts } from './overview/RevenueProfitCharts';
import { StockValuationPanel } from './overview/StockValuationPanel';
import { DateRangeFilterBar } from './shared/DateRangeFilterBar';

interface AnalyticsOverviewProps {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  enquiries?: Enquiry[];
  categories?: Category[];
  showBuyerRequestsCard?: boolean;
  onNavigateSection?: (section: string) => void;
}

export function AnalyticsOverview({
  products,
  purchases,
  sales,
  enquiries = [],
  categories = [],
  showBuyerRequestsCard = true,
  onNavigateSection,
}: AnalyticsOverviewProps) {
  const [preset, setPreset] = useState<DateFilterPreset>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredPurchases = useMemo(
    () => filterRecordsByDate(purchases, 'purchaseDate', preset, customStart, customEnd),
    [purchases, preset, customStart, customEnd]
  );

  const filteredSales = useMemo(
    () => filterRecordsByDate(sales, 'saleDate', preset, customStart, customEnd),
    [sales, preset, customStart, customEnd]
  );

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => p.status !== 'ARCHIVED' && p.availableStock <= p.lowStockThreshold)
        .sort((a, b) => a.availableStock - b.availableStock),
    [products]
  );

  const metrics = useMemo(
    () =>
      calculateOverviewMetrics({
        products,
        filteredPurchases,
        filteredSales,
        enquiries,
      }),
    [products, filteredPurchases, filteredSales, enquiries]
  );

  const monthlySeries = useMemo(
    () => computeMonthlySeries(filteredPurchases, filteredSales).slice(-8),
    [filteredPurchases, filteredSales]
  );

  const categoryBreakdown = useMemo(
    () =>
      buildCategoryPerformance({
        products,
        categories,
        filteredSales,
      }),
    [products, categories, filteredSales]
  );

  return (
    <div className="space-y-8">
      <DateRangeFilterBar
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        onCustomStartChange={setCustomStart}
        customEnd={customEnd}
        onCustomEndChange={setCustomEnd}
      />

      <OverviewKpiGrid
        metrics={metrics}
        purchaseCount={filteredPurchases.length}
        salesCount={filteredSales.length}
        showBuyerRequestsCard={showBuyerRequestsCard}
        onNavigateSection={onNavigateSection}
      />

      {/* Accounting Method Distinction Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-600 leading-relaxed space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
          <TrendingUp className="w-4 h-4 text-[#14452F]" />
          <span>Accounting &amp; Valuation Method</span>
        </div>
        <p>
          <strong>Revenue vs. Gross Profit vs. Inventory Value:</strong> Realized Gross Profit is
          computed strictly per sale transaction as{' '}
          <span className="font-mono-tabular">
            Net Sale Amount − (Sold Qty × Weighted Avg Cost at Sale)
          </span>
          , never by subtracting total historical purchases from sales revenue. Unsold inventory
          remains capitalized in <strong>Estimated Inventory Value</strong> (
          <span className="font-mono-tabular">Available Stock × Weighted Avg Purchase Price</span>).
        </p>
      </div>

      <RevenueProfitCharts
        monthlySeries={monthlySeries}
        categoryBreakdown={categoryBreakdown}
      />

      <StockValuationPanel
        unitBreakdown={metrics.unitBreakdown}
        lowStockProducts={lowStockProducts}
        onNavigateSection={onNavigateSection}
      />

      <RecentTransactionsGrid
        purchases={filteredPurchases}
        sales={filteredSales}
        onNavigateSection={onNavigateSection}
      />
    </div>
  );
}
