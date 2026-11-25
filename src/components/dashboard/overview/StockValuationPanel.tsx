import { AlertTriangle, Warehouse } from 'lucide-react';
import { formatINR, formatNumber } from '../../../lib/accounting';
import type { UnitStockSummary } from '../../../lib/dashboardMetrics';
import type { Product } from '../../../types';

interface StockValuationPanelProps {
  unitBreakdown: UnitStockSummary[];
  lowStockProducts: Product[];
  onNavigateSection?: (section: string) => void;
}

export function StockValuationPanel({
  unitBreakdown,
  lowStockProducts,
  onNavigateSection,
}: StockValuationPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Unit-wise Warehouse Stock Summary */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Stock by Packaging Unit
            </h3>
            <p className="text-xs text-slate-500">Live warehouse balances &amp; weighted valuation</p>
          </div>
          <Warehouse className="w-5 h-5 text-slate-400" />
        </div>

        {unitBreakdown.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            No active stock records in Firestore yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left py-2 font-medium">Unit</th>
                  <th className="text-right py-2 font-medium">SKUs</th>
                  <th className="text-right py-2 font-medium">On-Hand Qty</th>
                  <th className="text-right py-2 font-medium">Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-tabular">
                {unitBreakdown.map((u) => (
                  <tr key={u.unit} className="hover:bg-slate-50">
                    <td className="py-2.5 font-sans font-medium text-slate-900 capitalize">
                      {u.unit}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{u.skuCount}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {formatNumber(u.quantity)} {u.unit}
                    </td>
                    <td className="py-2.5 text-right text-slate-800">{formatINR(u.stockValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Stock Products */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Low Stock Products
            </h3>
            <p className="text-xs text-slate-500">Items at or below reorder threshold</p>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateSection && (
              <button
                type="button"
                onClick={() => onNavigateSection('stock-in')}
                className="text-xs font-semibold text-[#14452F] hover:underline"
              >
                Restock →
              </button>
            )}
            <AlertTriangle
              className={`w-5 h-5 ${
                lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-300'
              }`}
            />
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            All non-archived products are above their low-stock thresholds.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {lowStockProducts.map((p) => (
              <div key={p.productId} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono-tabular">
                    {p.sku} · Min {formatNumber(p.lowStockThreshold)} {p.unit}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-semibold font-mono-tabular ${
                      p.availableStock === 0 ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    {formatNumber(p.availableStock)} {p.unit}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {p.availableStock === 0 ? 'Out of stock' : 'Low stock'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
