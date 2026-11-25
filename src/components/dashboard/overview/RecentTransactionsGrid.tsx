import { formatINR, formatNumber } from '../../../lib/accounting';
import type { Purchase, Sale } from '../../../types';

interface RecentTransactionsGridProps {
  purchases: Purchase[];
  sales: Sale[];
  onNavigateSection?: (section: string) => void;
}

export function RecentTransactionsGrid({
  purchases,
  sales,
  onNavigateSection,
}: RecentTransactionsGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Purchases */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-slate-900">Recent Purchases</h3>
          {onNavigateSection && (
            <button
              type="button"
              onClick={() => onNavigateSection('purchase-history')}
              className="text-xs font-semibold text-[#14452F] hover:underline"
            >
              View All →
            </button>
          )}
        </div>

        {purchases.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No purchases in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Product</th>
                  <th className="text-right py-2 font-medium">Qty</th>
                  <th className="text-right py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.slice(0, 6).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono-tabular text-slate-600">{p.purchaseDate}</td>
                    <td className="py-2.5 text-slate-900 font-medium">
                      {p.productName}
                      <span className="block text-[11px] text-slate-500 font-normal">
                        {p.supplierName} · {p.invoiceNumber}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular text-slate-700">
                      {formatNumber(p.quantity)} {p.unit}
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular font-medium text-slate-900">
                      {formatINR(p.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sales */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-slate-900">Recent Sales</h3>
          {onNavigateSection && (
            <button
              type="button"
              onClick={() => onNavigateSection('sales-history')}
              className="text-xs font-semibold text-[#14452F] hover:underline"
            >
              View All →
            </button>
          )}
        </div>

        {sales.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No sales in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Product</th>
                  <th className="text-right py-2 font-medium">Revenue</th>
                  <th className="text-right py-2 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.slice(0, 6).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono-tabular text-slate-600">{s.saleDate}</td>
                    <td className="py-2.5 text-slate-900 font-medium">
                      {s.productName}
                      <span className="block text-[11px] text-slate-500 font-normal">
                        {s.customerName} · {s.invoiceNumber}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular text-slate-900">
                      {formatINR(s.totalAmount)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-mono-tabular font-medium ${
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
        )}
      </div>
    </div>
  );
}
