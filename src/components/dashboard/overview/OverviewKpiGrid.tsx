import { AlertTriangle, Boxes, Inbox, IndianRupee, Package, ShoppingBag, TrendingUp, Warehouse } from 'lucide-react';
import { formatINR, formatNumber } from '../../../lib/accounting';
import type { DashboardOverviewMetrics } from '../../../lib/dashboardMetrics';

interface OverviewKpiGridProps {
  metrics: DashboardOverviewMetrics;
  purchaseCount: number;
  salesCount: number;
  showBuyerRequestsCard?: boolean;
  onNavigateSection?: (section: string) => void;
}

export function OverviewKpiGrid({
  metrics,
  purchaseCount,
  salesCount,
  showBuyerRequestsCard = true,
  onNavigateSection,
}: OverviewKpiGridProps) {
  const topUnitsText =
    metrics.unitBreakdown.length > 0
      ? metrics.unitBreakdown
          .slice(0, 3)
          .map((u) => `${formatNumber(u.quantity)} ${u.unit}`)
          .join(' · ')
      : 'No stock units recorded';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Products */}
      <button
        type="button"
        onClick={() => onNavigateSection?.('products')}
        className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 space-y-1.5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Total Products</p>
          <Package className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
          {formatNumber(metrics.totalProducts, 0)}
        </p>
        <p className="text-xs text-slate-500">
          {metrics.activeCatalogueProducts} public active
          {metrics.archivedProducts > 0 ? ` · ${metrics.archivedProducts} archived` : ''}
        </p>
      </button>

      {/* 2. Total Stock Quantity */}
      <button
        type="button"
        onClick={() => onNavigateSection?.('inventory-reports')}
        className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 space-y-1.5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Total Stock Quantity</p>
          <Boxes className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
          {formatNumber(metrics.totalStockQuantity)}
        </p>
        <p className="text-xs text-slate-500 truncate" title={topUnitsText}>
          {topUnitsText}
        </p>
      </button>

      {/* 3. Total Purchase Value */}
      <button
        type="button"
        onClick={() => onNavigateSection?.('purchase-history')}
        className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 space-y-1.5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Total Purchase Value</p>
          <ShoppingBag className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
          {formatINR(metrics.totalPurchaseValue)}
        </p>
        <p className="text-xs text-slate-500">
          {purchaseCount} entries · Avg {formatINR(metrics.avgPurchasePrice)}/unit
        </p>
      </button>

      {/* 4. Total Sales Revenue */}
      <button
        type="button"
        onClick={() => onNavigateSection?.('sales-history')}
        className="text-left bg-white border border-slate-200 hover:border-[#14452F]/40 rounded-xl p-5 space-y-1.5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Total Sales Revenue</p>
          <IndianRupee className="w-4 h-4 text-[#14452F]" />
        </div>
        <p className="text-2xl font-semibold text-[#14452F] font-mono-tabular">
          {formatINR(metrics.totalSalesRevenue)}
        </p>
        <p className="text-xs text-slate-500">
          {salesCount} invoices · Avg {formatINR(metrics.avgSalePrice)}/unit
        </p>
      </button>

      {/* 5. Estimated Inventory Value */}
      <button
        type="button"
        onClick={() => onNavigateSection?.('inventory-reports')}
        className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 space-y-1.5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Estimated Inventory Value</p>
          <Warehouse className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
          {formatINR(metrics.estimatedInventoryValue)}
        </p>
        <p className="text-xs text-slate-500">On-hand qty × weighted avg cost</p>
      </button>

      {/* 6. Gross Profit */}
      <button
        type="button"
        onClick={() => onNavigateSection?.('profit-loss')}
        className="text-left bg-[#ECF4EF] border border-[#14452F]/20 hover:border-[#14452F]/45 rounded-xl p-5 space-y-1.5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#14452F]">Gross Profit</p>
          <TrendingUp className="w-4 h-4 text-[#14452F]" />
        </div>
        <p
          className={`text-2xl font-semibold font-mono-tabular ${
            metrics.grossProfit >= 0 ? 'text-[#14452F]' : 'text-red-700'
          }`}
        >
          {formatINR(metrics.grossProfit)}
        </p>
        <p className="text-xs text-[#14452F]/85 font-mono-tabular">
          {formatNumber(metrics.grossMarginPct, 1)}% margin · COGS {formatINR(metrics.totalCogs)}
        </p>
      </button>

      {/* 7. Low Stock Alerts */}
      <button
        type="button"
        onClick={() => onNavigateSection?.('inventory-reports')}
        className={`text-left bg-white border rounded-xl p-5 space-y-1.5 transition-colors ${
          metrics.lowStockAlerts > 0
            ? 'border-amber-300 hover:bg-amber-50/40'
            : 'border-slate-200 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">Low Stock Alerts</p>
          <AlertTriangle
            className={`w-4 h-4 ${
              metrics.lowStockAlerts > 0 ? 'text-amber-600' : 'text-slate-300'
            }`}
          />
        </div>
        <p
          className={`text-2xl font-semibold font-mono-tabular ${
            metrics.lowStockAlerts > 0 ? 'text-amber-700' : 'text-slate-950'
          }`}
        >
          {formatNumber(metrics.lowStockAlerts, 0)}
        </p>
        <p className="text-xs text-slate-500">
          {metrics.outOfStockCount} out of stock · At/below threshold
        </p>
      </button>

      {/* 8. Pending Buyer Requests (or Weighted Avg Sale Price in Viewer mode) */}
      {showBuyerRequestsCard ? (
        <button
          type="button"
          onClick={() => onNavigateSection?.('enquiries')}
          className={`text-left bg-white border rounded-xl p-5 space-y-1.5 transition-colors ${
            metrics.pendingBuyerRequests > 0
              ? 'border-[#14452F]/35 hover:bg-[#ECF4EF]/40'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Pending Buyer Requests</p>
            <Inbox
              className={`w-4 h-4 ${
                metrics.pendingBuyerRequests > 0 ? 'text-[#14452F]' : 'text-slate-300'
              }`}
            />
          </div>
          <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
            {formatNumber(metrics.pendingBuyerRequests, 0)}
          </p>
          <p className="text-xs text-slate-500">
            {metrics.newEnquiriesCount} new · {metrics.followUpEnquiriesCount} pending follow-up
          </p>
        </button>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Weighted Avg Sale Price</p>
          <p className="text-2xl font-semibold text-slate-950 font-mono-tabular">
            {formatINR(metrics.avgSalePrice)}
          </p>
          <p className="text-xs text-slate-500">Period net revenue / unit sold</p>
        </div>
      )}
    </div>
  );
}
