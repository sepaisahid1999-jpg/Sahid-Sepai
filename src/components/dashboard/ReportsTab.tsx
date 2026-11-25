import { Download, FileSpreadsheet, HardDriveDownload } from 'lucide-react';
import {
  exportFullJsonBackup,
  exportRowsToCSV,
  exportRowsToExcel,
  mapEnquiriesForExport,
  mapLowStockForExport,
  mapProductStockForExport,
  mapProfitReportForExport,
  mapPurchasesForExport,
  mapSalesForExport,
  mapStockLedgerForExport,
} from '../../lib/reports';
import type {
  CompanySettings,
  Enquiry,
  Product,
  Purchase,
  Sale,
  StockTransaction,
} from '../../types';

interface ReportsTabProps {
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  transactions: StockTransaction[];
  enquiries?: Enquiry[];
  settings?: CompanySettings;
  isAdmin: boolean;
}

export function ReportsTab({
  products,
  purchases,
  sales,
  transactions,
  enquiries = [],
  settings,
  isAdmin,
}: ReportsTabProps) {
  const dateSuffix = new Date().toISOString().slice(0, 10);

  const reportCards = [
    {
      title: 'Purchase History Report',
      description: 'Complete Stock In entries with supplier names, invoice numbers, rates, and expenses.',
      count: `${purchases.length} records`,
      onCsv: () =>
        exportRowsToCSV(mapPurchasesForExport(purchases), `gazi-jute-purchases-${dateSuffix}`),
      onExcel: () =>
        exportRowsToExcel(
          mapPurchasesForExport(purchases),
          'Purchases',
          `gazi-jute-purchases-${dateSuffix}`
        ),
    },
    {
      title: 'Sales History Report',
      description: 'Complete Stock Out invoices with customer names, discounts, COGS, and gross profit.',
      count: `${sales.length} records`,
      onCsv: () => exportRowsToCSV(mapSalesForExport(sales), `gazi-jute-sales-${dateSuffix}`),
      onExcel: () =>
        exportRowsToExcel(mapSalesForExport(sales), 'Sales', `gazi-jute-sales-${dateSuffix}`),
    },
    {
      title: 'Product Stock Valuation Report',
      description: 'On-hand quantities, weighted average purchase/sale prices, and current inventory value.',
      count: `${products.length} products`,
      onCsv: () =>
        exportRowsToCSV(mapProductStockForExport(products), `gazi-jute-stock-${dateSuffix}`),
      onExcel: () =>
        exportRowsToExcel(
          mapProductStockForExport(products),
          'ProductStock',
          `gazi-jute-stock-${dateSuffix}`
        ),
    },
    {
      title: 'Profit & Margin Report',
      description: 'Product-level sales revenue, cost of goods sold, realized gross profit, and margin %.',
      count: `${products.length} products`,
      onCsv: () =>
        exportRowsToCSV(mapProfitReportForExport(products), `gazi-jute-profit-${dateSuffix}`),
      onExcel: () =>
        exportRowsToExcel(
          mapProfitReportForExport(products),
          'ProfitReport',
          `gazi-jute-profit-${dateSuffix}`
        ),
    },
    {
      title: 'Low Stock Alert Report',
      description: 'Products currently at or below configured reorder thresholds with shortfall counts.',
      count: `${products.filter((p) => p.availableStock <= p.lowStockThreshold).length} items`,
      onCsv: () =>
        exportRowsToCSV(mapLowStockForExport(products), `gazi-jute-low-stock-${dateSuffix}`),
      onExcel: () =>
        exportRowsToExcel(
          mapLowStockForExport(products),
          'LowStock',
          `gazi-jute-low-stock-${dateSuffix}`
        ),
    },
    {
      title: 'Immutable Stock Ledger',
      description: 'Chronological audit trail of every stock movement, return, and correction.',
      count: `${transactions.length} entries`,
      onCsv: () =>
        exportRowsToCSV(
          mapStockLedgerForExport(transactions),
          `gazi-jute-ledger-${dateSuffix}`
        ),
      onExcel: () =>
        exportRowsToExcel(
          mapStockLedgerForExport(transactions),
          'StockLedger',
          `gazi-jute-ledger-${dateSuffix}`
        ),
    },
  ];

  if (isAdmin) {
    reportCards.push({
      title: 'Buyer Enquiries Export',
      description: 'All public quotation and WhatsApp enquiries with buyer details and status.',
      count: `${enquiries.length} enquiries`,
      onCsv: () =>
        exportRowsToCSV(mapEnquiriesForExport(enquiries), `gazi-jute-enquiries-${dateSuffix}`),
      onExcel: () =>
        exportRowsToExcel(
          mapEnquiriesForExport(enquiries),
          'Enquiries',
          `gazi-jute-enquiries-${dateSuffix}`
        ),
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                <span className="text-xs font-mono-tabular text-slate-500">{card.count}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{card.description}</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={card.onCsv}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={card.onExcel}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel (.xlsx)
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Database Snapshot &amp; Regular Backup Guidance
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Export a complete JSON snapshot of products, purchases, sales, ledger transactions,
                enquiries, and settings for offline archival. For automated daily cloud backups,
                schedule managed Firestore exports in Google Cloud Console using{' '}
                <span className="font-mono-tabular">gcloud firestore export</span> to a Cloud Storage bucket.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                exportFullJsonBackup(
                  {
                    exportedAt: new Date().toISOString(),
                    settings,
                    products,
                    purchases,
                    sales,
                    stockTransactions: transactions,
                    enquiries,
                  },
                  `gazi-jute-full-backup-${dateSuffix}`
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg whitespace-nowrap shrink-0"
            >
              <HardDriveDownload className="w-4 h-4" />
              Download Full JSON Backup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
