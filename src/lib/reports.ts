import * as XLSX from 'xlsx';
import type { Enquiry, Product, Purchase, Sale, StockTransaction } from '../types';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportRowsToCSV(rows: Record<string, unknown>[], filename: string) {
  const safeRows = rows.length > 0 ? rows : [{ Status: 'No records matching current filter' }];
  const headers = Object.keys(safeRows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...safeRows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportRowsToExcel(
  rows: Record<string, unknown>[],
  sheetName: string,
  filename: string
) {
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Status: 'No records' }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `${filename}.xlsx`);
}

export function mapPurchasesForExport(purchases: Purchase[]) {
  return purchases.map((p) => ({
    PurchaseID: p.purchaseId || p.id,
    Date: p.purchaseDate,
    Type: p.type,
    InvoiceNumber: p.invoiceNumber,
    SKU: p.sku,
    ProductName: p.productName,
    Supplier: p.supplierName,
    Quantity: p.quantity,
    Unit: p.unit,
    PurchaseRateINR: p.purchaseRate,
    FreightINR: p.freightAmount ?? 0,
    OtherExpensesINR: p.otherExpenses ?? (p.freightAmount === undefined ? p.additionalExpenses : 0),
    DiscountINR: p.discount ?? 0,
    TaxINR: p.taxAmount ?? 0,
    FinalPurchaseCostINR: p.totalAmount,
    PaymentStatus: p.paymentStatus || 'PAID',
    ReferencePurchaseID: p.referencePurchaseId || '',
    Notes: p.notes,
  }));
}

export function mapSalesForExport(sales: Sale[]) {
  return sales.map((s) => ({
    Date: s.saleDate,
    Type: s.type,
    InvoiceNumber: s.invoiceNumber,
    SKU: s.sku,
    ProductName: s.productName,
    Customer: s.customerName,
    Quantity: s.quantity,
    Unit: s.unit,
    SaleRateINR: s.saleRate,
    DiscountINR: s.discount,
    AdditionalChargesINR: s.additionalCharges,
    NetSalesAmountINR: s.totalAmount,
    COGSINR: s.costOfGoodsSold,
    GrossProfitINR: s.grossProfit,
    Notes: s.notes,
  }));
}

export function mapProductStockForExport(products: Product[]) {
  return products.map((p) => ({
    SKU: p.sku,
    ProductName: p.name,
    Category: p.categoryName,
    Unit: p.unit,
    Status: p.status,
    AvailableStock: p.availableStock,
    LowStockThreshold: p.lowStockThreshold,
    WeightedAvgPurchasePriceINR: p.avgPurchasePrice,
    WeightedAvgSalePriceINR: p.avgSalePrice,
    TotalPurchasedQty: p.totalPurchaseQty,
    TotalSoldQty: p.totalSalesQty,
    CurrentStockValueINR: p.currentStockValue,
    RealizedGrossProfitINR: p.grossProfit,
    EstimatedRemainingMarginINR: p.estimatedProfit,
  }));
}

export function mapProfitReportForExport(products: Product[]) {
  return products.map((p) => ({
    SKU: p.sku,
    ProductName: p.name,
    Category: p.categoryName,
    TotalSoldQty: p.totalSalesQty,
    TotalSalesRevenueINR: p.totalSalesAmount,
    TotalCOGSINR: p.totalCogs,
    RealizedGrossProfitINR: p.grossProfit,
    MarginPercent:
      p.totalSalesAmount > 0
        ? Number(((p.grossProfit / p.totalSalesAmount) * 100).toFixed(2))
        : 0,
    RemainingStockValueINR: p.currentStockValue,
  }));
}

export function mapLowStockForExport(products: Product[]) {
  return products
    .filter((p) => p.availableStock <= p.lowStockThreshold)
    .map((p) => ({
      SKU: p.sku,
      ProductName: p.name,
      Category: p.categoryName,
      AvailableStock: p.availableStock,
      LowStockThreshold: p.lowStockThreshold,
      Shortfall: Math.max(0, p.lowStockThreshold - p.availableStock),
      Unit: p.unit,
      LastWeightedCostINR: p.avgPurchasePrice,
    }));
}

export function mapEnquiriesForExport(enquiries: Enquiry[]) {
  return enquiries.map((e) => ({
    Status: e.status,
    EnquiryType: e.enquiryType,
    ProductName: e.productName,
    SKU: e.sku,
    RequiredQuantity: e.quantity,
    Unit: e.unit,
    BuyerName: e.buyerName,
    BuyerPhone: e.buyerPhone,
    BuyerLocation: e.buyerLocation,
    WhatsAppRecipient: e.whatsappNumberUsed,
    Message: e.message,
    AdminNotes: e.adminNotes,
  }));
}

export function mapStockLedgerForExport(transactions: StockTransaction[]) {
  return transactions.map((t) => ({
    Date: t.txDate,
    Type: t.txType,
    SKU: t.sku,
    ProductName: t.productName,
    QuantityDelta: t.quantityDelta,
    UnitRateINR: t.unitRate,
    TotalValueINR: t.totalValue,
    ResultingStock: t.resultingStock,
    ResultingAvgCostINR: t.resultingAvgPurchasePrice,
    ReferenceId: t.referenceId,
    Notes: t.notes,
  }));
}

export function mapCategoriesForExport(
  categories: { id: string; name: string; slug: string; description?: string; active: boolean }[],
  productCountMap: Record<string, number>
) {
  return categories.map((c) => ({
    CategoryName: c.name,
    Slug: c.slug,
    ProductsCount: productCountMap[c.id] || 0,
    Status: c.active ? 'Active' : 'Hidden',
    Description: c.description || '',
  }));
}

export function mapSuppliersForExport(
  suppliers: { id: string; name: string; phone: string; email: string; address: string; gstNumber: string; notes: string }[],
  statsMap: Record<string, { orders: number; totalSpend: number }>
) {
  return suppliers.map((s) => ({
    SupplierName: s.name,
    Phone: s.phone,
    Email: s.email,
    Address: s.address,
    GSTIN: s.gstNumber,
    PurchaseOrders: statsMap[s.id]?.orders || 0,
    TotalPurchaseValueINR: statsMap[s.id]?.totalSpend || 0,
    Notes: s.notes,
  }));
}

export function mapCustomersForExport(
  customers: { id: string; name: string; phone: string; location: string; email: string; gstNumber: string; notes: string }[],
  statsMap: Record<string, { orders: number; totalRevenue: number }>
) {
  return customers.map((c) => ({
    CustomerName: c.name,
    Phone: c.phone,
    Location: c.location,
    Email: c.email,
    GSTIN: c.gstNumber,
    SalesOrders: statsMap[c.id]?.orders || 0,
    TotalSalesRevenueINR: statsMap[c.id]?.totalRevenue || 0,
    Notes: c.notes,
  }));
}

export function formatFirestoreTimestamp(ts: unknown): string {
  if (!ts) return '';
  if (typeof ts === 'string') return ts;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date(Number((ts as { seconds: number }).seconds) * 1000).toISOString();
  }
  return '';
}

export function mapAuditLogsForExport(
  logs: { id: string; action: string; entityType: string; entityId: string; summary: string; actorEmail: string; actorName: string; createdAt?: unknown }[]
) {
  return logs.map((l) => ({
    Timestamp: formatFirestoreTimestamp(l.createdAt),
    Action: l.action,
    EntityType: l.entityType,
    EntityId: l.entityId,
    Summary: l.summary,
    ActorName: l.actorName,
    ActorEmail: l.actorEmail,
  }));
}

export function exportFullJsonBackup(payload: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${filename}.json`);
}
