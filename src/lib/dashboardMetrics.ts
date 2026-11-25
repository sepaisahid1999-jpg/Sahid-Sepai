import { roundCurrency } from './accounting';
import { getPurchaseSign } from './purchaseValidation';
import type { Category, Enquiry, Product, Purchase, Sale } from '../types';

export interface UnitStockSummary {
  unit: string;
  quantity: number;
  stockValue: number;
  skuCount: number;
}

export interface CategoryPerformancePoint {
  name: string;
  stockValue: number;
  salesRevenue: number;
  grossProfit: number;
  skuCount: number;
}

export interface DashboardOverviewMetrics {
  totalProducts: number;
  activeCatalogueProducts: number;
  archivedProducts: number;
  totalStockQuantity: number;
  estimatedInventoryValue: number;
  totalPurchaseValue: number;
  periodPurchaseQty: number;
  totalSalesRevenue: number;
  totalCogs: number;
  periodSalesQty: number;
  grossProfit: number;
  grossMarginPct: number;
  avgPurchasePrice: number;
  avgSalePrice: number;
  lowStockAlerts: number;
  outOfStockCount: number;
  pendingBuyerRequests: number;
  newEnquiriesCount: number;
  followUpEnquiriesCount: number;
  unitBreakdown: UnitStockSummary[];
}

export function calculateOverviewMetrics(params: {
  products: Product[];
  filteredPurchases: Purchase[];
  filteredSales: Sale[];
  enquiries?: Enquiry[];
}): DashboardOverviewMetrics {
  const { products, filteredPurchases, filteredSales, enquiries = [] } = params;

  const nonArchivedProducts = products.filter((p) => p.status !== 'ARCHIVED');
  const archivedProducts = products.length - nonArchivedProducts.length;
  const activeCatalogueProducts = nonArchivedProducts.filter((p) => p.status === 'ACTIVE').length;

  let totalStockQuantity = 0;
  let estimatedInventoryValue = 0;
  let lowStockAlerts = 0;
  let outOfStockCount = 0;

  const unitMap = new Map<string, UnitStockSummary>();

  for (const product of nonArchivedProducts) {
    const stockQty = Math.max(0, Number(product.availableStock) || 0);
    const avgCost = Math.max(0, Number(product.avgPurchasePrice) || 0);
    const computedValue = roundCurrency(stockQty * avgCost);
    const storedValue = Number(product.currentStockValue);
    const stockValue =
      Number.isFinite(storedValue) && storedValue >= 0
        ? roundCurrency(storedValue)
        : computedValue;

    totalStockQuantity = roundCurrency(totalStockQuantity + stockQty);
    estimatedInventoryValue = roundCurrency(estimatedInventoryValue + stockValue);

    if (stockQty <= (Number(product.lowStockThreshold) || 0)) {
      lowStockAlerts += 1;
    }
    if (stockQty <= 0) {
      outOfStockCount += 1;
    }

    const unitKey = (product.unit || 'unit').trim();
    const prevUnit = unitMap.get(unitKey) || {
      unit: unitKey,
      quantity: 0,
      stockValue: 0,
      skuCount: 0,
    };
    prevUnit.quantity = roundCurrency(prevUnit.quantity + stockQty);
    prevUnit.stockValue = roundCurrency(prevUnit.stockValue + stockValue);
    prevUnit.skuCount += 1;
    unitMap.set(unitKey, prevUnit);
  }

  let totalPurchaseValue = 0;
  let periodPurchaseQty = 0;
  for (const purchase of filteredPurchases) {
    const sign = getPurchaseSign(purchase.type);
    totalPurchaseValue = roundCurrency(
      totalPurchaseValue + sign * (Number(purchase.totalAmount) || 0)
    );
    periodPurchaseQty = roundCurrency(
      periodPurchaseQty + sign * (Number(purchase.quantity) || 0)
    );
  }

  let totalSalesRevenue = 0;
  let totalCogs = 0;
  let periodSalesQty = 0;
  let grossProfit = 0;

  for (const sale of filteredSales) {
    const sign = sale.type === 'CUSTOMER_RETURN' ? -1 : 1;
    const netAmount = Number(sale.totalAmount) || 0;
    const cogs = Number(sale.costOfGoodsSold) || 0;
    const saleProfit =
      Number.isFinite(Number(sale.grossProfit))
        ? Number(sale.grossProfit)
        : roundCurrency(netAmount - cogs);

    totalSalesRevenue = roundCurrency(totalSalesRevenue + sign * netAmount);
    totalCogs = roundCurrency(totalCogs + sign * cogs);
    periodSalesQty = roundCurrency(periodSalesQty + sign * (Number(sale.quantity) || 0));
    grossProfit = roundCurrency(grossProfit + sign * saleProfit);
  }

  const avgPurchasePrice =
    periodPurchaseQty > 0 ? roundCurrency(totalPurchaseValue / periodPurchaseQty) : 0;
  const avgSalePrice =
    periodSalesQty > 0 ? roundCurrency(totalSalesRevenue / periodSalesQty) : 0;
  const grossMarginPct =
    totalSalesRevenue > 0 ? roundCurrency((grossProfit / totalSalesRevenue) * 100) : 0;

  const newEnquiriesCount = enquiries.filter((e) => e.status === 'NEW').length;
  const followUpEnquiriesCount = enquiries.filter((e) => e.status === 'PENDING').length;
  const pendingBuyerRequests = newEnquiriesCount + followUpEnquiriesCount;

  const unitBreakdown = Array.from(unitMap.values()).sort(
    (a, b) => b.stockValue - a.stockValue || b.quantity - a.quantity
  );

  return {
    totalProducts: nonArchivedProducts.length,
    activeCatalogueProducts,
    archivedProducts,
    totalStockQuantity,
    estimatedInventoryValue,
    totalPurchaseValue,
    periodPurchaseQty,
    totalSalesRevenue,
    totalCogs,
    periodSalesQty,
    grossProfit,
    grossMarginPct,
    avgPurchasePrice,
    avgSalePrice,
    lowStockAlerts,
    outOfStockCount,
    pendingBuyerRequests,
    newEnquiriesCount,
    followUpEnquiriesCount,
    unitBreakdown,
  };
}

export function buildCategoryPerformance(params: {
  products: Product[];
  categories: Category[];
  filteredSales: Sale[];
}): CategoryPerformancePoint[] {
  const { products, categories, filteredSales } = params;
  const productCatMap = new Map<string, string>();
  for (const p of products) {
    productCatMap.set(p.productId, p.categoryName || 'Uncategorized');
  }

  const map = new Map<string, CategoryPerformancePoint>();
  for (const c of categories) {
    map.set(c.name, {
      name: c.name,
      stockValue: 0,
      salesRevenue: 0,
      grossProfit: 0,
      skuCount: 0,
    });
  }

  for (const p of products) {
    if (p.status === 'ARCHIVED') continue;
    const catName = p.categoryName || 'Uncategorized';
    const entry = map.get(catName) || {
      name: catName,
      stockValue: 0,
      salesRevenue: 0,
      grossProfit: 0,
      skuCount: 0,
    };
    entry.stockValue = roundCurrency(entry.stockValue + (Number(p.currentStockValue) || 0));
    entry.skuCount += 1;
    map.set(catName, entry);
  }

  for (const s of filteredSales) {
    const catName = productCatMap.get(s.productId) || 'Uncategorized';
    const entry = map.get(catName) || {
      name: catName,
      stockValue: 0,
      salesRevenue: 0,
      grossProfit: 0,
      skuCount: 0,
    };
    const sign = s.type === 'CUSTOMER_RETURN' ? -1 : 1;
    entry.salesRevenue = roundCurrency(entry.salesRevenue + sign * (Number(s.totalAmount) || 0));
    entry.grossProfit = roundCurrency(entry.grossProfit + sign * (Number(s.grossProfit) || 0));
    map.set(catName, entry);
  }

  return Array.from(map.values())
    .filter((c) => c.skuCount > 0 || c.salesRevenue !== 0)
    .sort((a, b) => b.stockValue + b.salesRevenue - (a.stockValue + a.salesRevenue))
    .slice(0, 6);
}
