import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  ExternalLink,
  FileSpreadsheet,
  History,
  LogOut,
  Package,
} from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { AnalyticsOverview } from '../components/dashboard/AnalyticsOverview';
import { StockOperationsTab } from '../components/dashboard/StockOperationsTab';
import { ReportsTab } from '../components/dashboard/ReportsTab';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { formatINR, formatNumber } from '../lib/accounting';
import {
  subscribePrivateProducts,
  subscribePurchases,
  subscribeSales,
  subscribeStockTransactions,
} from '../services/firestoreService';
import type { Product, Purchase, Sale, StockTransaction } from '../types';

type ViewerSection = 'overview' | 'stock' | 'purchases' | 'sales' | 'ledger' | 'reports';

export function ViewerDashboardPage() {
  const { user, isAdmin, isViewer, authReady, logout } = useAuth();
  const { settings } = useCompany();

  const [section, setSection] = useState<ViewerSection>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    if (!authReady || !isViewer) return;
    const unsubs = [
      subscribePrivateProducts(setProducts),
      subscribePurchases(setPurchases),
      subscribeSales(setSales),
      subscribeStockTransactions(setTransactions),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authReady, isViewer]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9] text-sm text-slate-600">
        Verifying viewer access...
      </div>
    );
  }

  if (!user || !isViewer) {
    return <Navigate to="/admin/login" replace />;
  }

  const tabs: { id: ViewerSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Analytics Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'stock', label: 'Product Stock Records', icon: <Package className="w-4 h-4" /> },
    { id: 'purchases', label: 'Purchase History', icon: <ArrowDownLeft className="w-4 h-4" /> },
    { id: 'sales', label: 'Sales History', icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: 'ledger', label: 'Stock Ledger', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Export Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <PageMeta
        title={`Viewer Dashboard (Read-Only) – ${settings.companyName}`}
        description={`Read-only inventory, stock valuation, and financial reports for ${settings.companyName}.`}
      />

      <header className="bg-[#0E3121] text-white border-b border-[#184B34]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-lg font-semibold truncate">
              {settings.companyName}
            </span>
            <span className="text-xs text-emerald-200 hidden sm:inline">
              · Read-Only Viewer Portal
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 text-xs">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-3 py-1.5 bg-white text-[#14452F] font-semibold rounded-lg"
              >
                Switch to Admin
              </Link>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Catalogue
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-red-600/80 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Viewer Navigation Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                section === t.id
                  ? 'bg-[#14452F] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {section === 'overview' && (
          <AnalyticsOverview
            products={products}
            purchases={purchases}
            sales={sales}
            showBuyerRequestsCard={false}
          />
        )}

        {section === 'stock' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Authorized Stock Records ({products.length})
              </h2>
            </div>
            {products.length === 0 ? (
              <p className="p-10 text-center text-xs text-slate-500">No products recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-left py-3 px-3 font-semibold">Category</th>
                      <th className="text-right py-3 px-3 font-semibold">Available Stock</th>
                      <th className="text-right py-3 px-3 font-semibold">Avg Purchase</th>
                      <th className="text-right py-3 px-3 font-semibold">Avg Sale</th>
                      <th className="text-right py-3 px-3 font-semibold">Stock Value</th>
                      <th className="text-right py-3 px-4 font-semibold">Realized Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {p.name}
                          <span className="block text-[11px] font-mono-tabular text-slate-500">
                            {p.sku}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{p.categoryName}</td>
                        <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                          {formatNumber(p.availableStock)} {p.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular">
                          {formatINR(p.avgPurchasePrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular">
                          {formatINR(p.avgSalePrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular">
                          {formatINR(p.currentStockValue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#14452F]">
                          {formatINR(p.grossProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {section === 'purchases' && (
          <StockOperationsTab
            mode="stock-in"
            readOnly={true}
            products={products}
            suppliers={[]}
            customers={[]}
            purchases={purchases}
            sales={sales}
            transactions={transactions}
          />
        )}

        {section === 'sales' && (
          <StockOperationsTab
            mode="stock-out"
            readOnly={true}
            products={products}
            suppliers={[]}
            customers={[]}
            purchases={purchases}
            sales={sales}
            transactions={transactions}
          />
        )}

        {section === 'ledger' && (
          <StockOperationsTab
            mode="ledger"
            readOnly={true}
            products={products}
            suppliers={[]}
            customers={[]}
            purchases={purchases}
            sales={sales}
            transactions={transactions}
          />
        )}

        {section === 'reports' && (
          <ReportsTab
            products={products}
            purchases={purchases}
            sales={sales}
            transactions={transactions}
            isAdmin={false}
          />
        )}
      </main>
    </div>
  );
}
