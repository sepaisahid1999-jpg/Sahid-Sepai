import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  ClipboardList,
  ExternalLink,
  FileBarChart2,
  FolderTree,
  Layout,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Package,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { AnalyticsOverview } from '../components/dashboard/AnalyticsOverview';
import { AuditLogsTab } from '../components/dashboard/AuditLogsTab';
import { CategoryManagementTab } from '../components/dashboard/CategoryManagementTab';
import { CompanySettingsTab } from '../components/dashboard/CompanySettingsTab';
import { DirectoryTab } from '../components/dashboard/DirectoryTab';
import { EnquiriesTab } from '../components/dashboard/EnquiriesTab';
import { InventoryReportsTab } from '../components/dashboard/InventoryReportsTab';
import { ProductsManager } from '../components/dashboard/ProductsManager';
import { ProfitLossTab } from '../components/dashboard/ProfitLossTab';
import { PurchaseManagementTab } from '../components/dashboard/PurchaseManagementTab';
import { StockOperationsTab } from '../components/dashboard/StockOperationsTab';
import { TransactionHistoryTab } from '../components/dashboard/TransactionHistoryTab';
import { UserManagementTab } from '../components/dashboard/UserManagementTab';
import { WhatsAppManagementTab } from '../components/dashboard/WhatsAppManagementTab';
import { DashboardSkeleton } from '../components/dashboard/shared/DashboardSkeleton';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useDashboardOverviewData } from '../hooks/useDashboardOverviewData';
import { initializeDefaultCompanyAndWhatsApp } from '../services/firestoreService';

export type AdminSection =
  | 'overview'
  | 'products'
  | 'categories'
  | 'stock-in'
  | 'stock-out'
  | 'purchase-history'
  | 'sales-history'
  | 'suppliers'
  | 'customers'
  | 'inventory-reports'
  | 'profit-loss'
  | 'enquiries'
  | 'users'
  | 'whatsapp'
  | 'company-settings'
  | 'audit-logs';

type NavEntry =
  | {
      kind: 'section';
      id: AdminSection;
      label: string;
      icon: React.ReactNode;
      badge?: number;
    }
  | {
      kind: 'link';
      to: string;
      label: string;
      icon: React.ReactNode;
    };

export function AdminDashboardPage() {
  const { user, isAdmin, isViewer, authReady, logout } = useAuth();
  const { settings, settingsExistInDb } = useCompany();

  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    products,
    categories,
    purchases,
    sales,
    transactions,
    suppliers,
    customers,
    enquiries,
    whatsappNumbers,
    users,
    userInvites,
    auditLogs,
    loadingOverview: loadingData,
    syncError,
    retrySync,
  } = useDashboardOverviewData(Boolean(authReady && user && isAdmin));

  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9] text-sm text-slate-600">
        Verifying administrator session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    if (isViewer) return <Navigate to="/viewer" replace />;
    return <Navigate to="/admin/login" replace />;
  }

  const pendingRequestCount = enquiries.filter(
    (e) => e.status === 'NEW' || e.status === 'PENDING'
  ).length;
  const lowStockCount = products.filter(
    (p) => p.status !== 'ARCHIVED' && p.availableStock <= p.lowStockThreshold
  ).length;

  const navGroups: { heading: string; items: NavEntry[] }[] = [
    {
      heading: 'Overview',
      items: [
        {
          kind: 'section',
          id: 'overview',
          label: 'Dashboard',
          icon: <BarChart3 className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      heading: 'Inventory & Trade',
      items: [
        {
          kind: 'section',
          id: 'products',
          label: 'Product Management',
          icon: <Package className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'categories',
          label: 'Category Management',
          icon: <FolderTree className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'stock-in',
          label: 'Stock In',
          icon: <ArrowDownLeft className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'stock-out',
          label: 'Stock Out',
          icon: <ArrowUpRight className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'purchase-history',
          label: 'Purchase History',
          icon: <ClipboardList className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'sales-history',
          label: 'Sales History',
          icon: <Receipt className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'suppliers',
          label: 'Suppliers',
          icon: <Truck className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'customers',
          label: 'Customers',
          icon: <Users className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      heading: 'Reports & Finance',
      items: [
        {
          kind: 'section',
          id: 'inventory-reports',
          label: 'Inventory Reports',
          icon: <FileBarChart2 className="w-4 h-4 shrink-0" />,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
        {
          kind: 'section',
          id: 'profit-loss',
          label: 'Profit and Loss',
          icon: <TrendingUp className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'enquiries',
          label: 'Buyer Requests',
          icon: <MessageSquare className="w-4 h-4 shrink-0" />,
          badge: pendingRequestCount > 0 ? pendingRequestCount : undefined,
        },
      ],
    },
    {
      heading: 'System & Governance',
      items: [
        {
          kind: 'section',
          id: 'users',
          label: 'User Management',
          icon: <UserCheck className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'link',
          to: '/admin/website-editor',
          label: 'Website Control Panel',
          icon: <Layout className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'whatsapp',
          label: 'WhatsApp Management',
          icon: <MessageCircle className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'company-settings',
          label: 'Company Settings',
          icon: <Building2 className="w-4 h-4 shrink-0" />,
        },
        {
          kind: 'section',
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: <ShieldAlert className="w-4 h-4 shrink-0" />,
        },
      ],
    },
  ];

  const activeLabel =
    navGroups
      .flatMap((g) => g.items)
      .find((item) => item.kind === 'section' && item.id === section)?.label || 'Dashboard';

  const handleInitializeDefaults = async () => {
    setInitError(null);
    setInitializing(true);
    try {
      await initializeDefaultCompanyAndWhatsApp();
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Unable to initialize defaults.');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <PageMeta
        title={`${activeLabel} – ${settings.companyName}`}
        description={`Inventory, purchases, sales, financial reports, and operations dashboard for ${settings.companyName}.`}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-72 sm:w-64 bg-[#0E3121] text-emerald-50 flex flex-col shrink-0 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
          <Link to="/" className="font-display text-base font-semibold text-white truncate">
            {settings.companyName}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5" aria-label="Admin sidebar">
          {navGroups.map((group) => (
            <div key={group.heading} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/55">
                {group.heading}
              </p>
              {group.items.map((item) =>
                item.kind === 'link' ? (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg text-emerald-100/90 bg-emerald-400/10 hover:bg-emerald-400/20 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      section === item.id
                        ? 'bg-white text-[#14452F] font-semibold'
                        : 'text-emerald-100/85 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`font-mono-tabular text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                          section === item.id
                            ? 'bg-[#14452F] text-white'
                            : 'bg-emerald-200 text-[#0E3121]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3 text-xs shrink-0">
          <div className="truncate text-emerald-100/80">
            <span className="block text-white font-medium truncate">
              {user.displayName || 'Administrator'}
            </span>
            <span className="font-mono-tabular text-[11px] truncate block">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Site
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white/10 hover:bg-red-600/80 text-white rounded-lg"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="hidden sm:inline">Admin</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 text-sm truncate">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/admin/website-editor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg whitespace-nowrap"
            >
              <Layout className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Website Control Panel</span>
              <span className="sm:hidden">CMS</span>
            </Link>
            <Link
              to="/viewer"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
            >
              Viewer Mode
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {syncError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
              <span>{syncError}</span>
              <button
                type="button"
                onClick={retrySync}
                className="px-2.5 py-1 font-semibold bg-white border border-red-200 rounded-lg hover:bg-red-100 shrink-0"
              >
                Retry Sync
              </button>
            </div>
          )}

          {initError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
              <span>{initError}</span>
              <button
                type="button"
                onClick={() => setInitError(null)}
                className="underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* One-click initial configuration banner when DB defaults aren't seeded yet */}
          {(!settingsExistInDb || whatsappNumbers.length === 0) && (
            <div className="bg-white border border-[#14452F]/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  Initialize Gazi Jute Enterprises Configuration
                </h2>
                <p className="text-xs text-slate-600">
                  Seed default company details (7585841977, 7074340808, gazijute91@gmail.com),
                  active WhatsApp numbers, and core jute categories into Firestore.
                </p>
              </div>
              <button
                type="button"
                disabled={initializing}
                onClick={() => void handleInitializeDefaults()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0"
              >
                {initializing ? 'Initializing...' : 'Initialize Defaults in Firestore'}
              </button>
            </div>
          )}

          {loadingData && section === 'overview' ? (
            <DashboardSkeleton />
          ) : (
            <>
              {section === 'overview' && (
                <AnalyticsOverview
                  products={products}
                  purchases={purchases}
                  sales={sales}
                  enquiries={enquiries}
                  categories={categories}
                  showBuyerRequestsCard={true}
                  onNavigateSection={(next) => setSection(next as AdminSection)}
                />
              )}
              {section === 'products' && (
                <ProductsManager
                  products={products}
                  categories={categories}
                  purchases={purchases}
                  sales={sales}
                  transactions={transactions}
                />
              )}
              {section === 'categories' && (
                <CategoryManagementTab categories={categories} products={products} />
              )}
              {section === 'stock-in' && (
                <PurchaseManagementTab
                  initialView="entry"
                  products={products}
                  suppliers={suppliers}
                  purchases={purchases}
                  settings={settings}
                />
              )}
              {section === 'stock-out' && (
                <StockOperationsTab
                  mode="stock-out"
                  products={products}
                  suppliers={suppliers}
                  customers={customers}
                  purchases={purchases}
                  sales={sales}
                  transactions={transactions}
                />
              )}
              {section === 'purchase-history' && (
                <PurchaseManagementTab
                  initialView="history"
                  products={products}
                  suppliers={suppliers}
                  purchases={purchases}
                  settings={settings}
                />
              )}
              {section === 'sales-history' && (
                <TransactionHistoryTab mode="sales" sales={sales} />
              )}
              {section === 'suppliers' && (
                <DirectoryTab
                  mode="suppliers"
                  suppliers={suppliers}
                  customers={customers}
                  purchases={purchases}
                  sales={sales}
                />
              )}
              {section === 'customers' && (
                <DirectoryTab
                  mode="customers"
                  suppliers={suppliers}
                  customers={customers}
                  purchases={purchases}
                  sales={sales}
                />
              )}
              {section === 'inventory-reports' && (
                <InventoryReportsTab
                  products={products}
                  categories={categories}
                  purchases={purchases}
                  sales={sales}
                  transactions={transactions}
                  enquiries={enquiries}
                  settings={settings}
                />
              )}
              {section === 'profit-loss' && (
                <ProfitLossTab products={products} purchases={purchases} sales={sales} />
              )}
              {section === 'enquiries' && <EnquiriesTab enquiries={enquiries} />}
              {section === 'users' && (
                <UserManagementTab
                  users={users}
                  userInvites={userInvites}
                  currentUid={user.uid}
                />
              )}
              {section === 'whatsapp' && (
                <WhatsAppManagementTab whatsappNumbers={whatsappNumbers} />
              )}
              {section === 'company-settings' && <CompanySettingsTab settings={settings} />}
              {section === 'audit-logs' && <AuditLogsTab auditLogs={auditLogs} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
