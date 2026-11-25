import type { DateFilterPreset, Purchase, Sale } from '../types';
import { getPurchaseSign } from './purchaseValidation';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatNumber(value: number, decimals = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  }).format(safe);
}

export function calculatePurchaseTotal(
  quantity: number,
  purchaseRate: number,
  additionalExpenses: number
): number {
  return roundCurrency(Math.max(0, quantity) * Math.max(0, purchaseRate) + Math.max(0, additionalExpenses));
}

export function calculateNextWeightedAveragePurchase(
  prevTotalQty: number,
  prevTotalAmount: number,
  addedQty: number,
  addedAmount: number
): {
  nextTotalPurchaseQty: number;
  nextTotalPurchaseAmount: number;
  nextAvgPurchasePrice: number;
} {
  const nextTotalPurchaseQty = Math.max(0, prevTotalQty + addedQty);
  const nextTotalPurchaseAmount = Math.max(0, roundCurrency(prevTotalAmount + addedAmount));
  const nextAvgPurchasePrice =
    nextTotalPurchaseQty > 0 ? roundCurrency(nextTotalPurchaseAmount / nextTotalPurchaseQty) : 0;
  return {
    nextTotalPurchaseQty,
    nextTotalPurchaseAmount,
    nextAvgPurchasePrice,
  };
}

export function calculateSaleMetrics(
  quantity: number,
  saleRate: number,
  discount: number,
  additionalCharges: number,
  avgPurchasePrice: number
): {
  netSaleTotal: number;
  costOfGoodsSold: number;
  grossProfit: number;
} {
  const gross = Math.max(0, quantity) * Math.max(0, saleRate);
  const netSaleTotal = Math.max(0, roundCurrency(gross - Math.max(0, discount) + Math.max(0, additionalCharges)));
  const costOfGoodsSold = roundCurrency(Math.max(0, quantity) * Math.max(0, avgPurchasePrice));
  const grossProfit = roundCurrency(netSaleTotal - costOfGoodsSold);
  return {
    netSaleTotal,
    costOfGoodsSold,
    grossProfit,
  };
}

export function getDateRangeBounds(
  preset: DateFilterPreset,
  customStart?: string,
  customEnd?: string
): { start: string | null; end: string | null } {
  const now = new Date();
  const toYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = toYMD(now);

  if (preset === 'ALL') return { start: null, end: null };
  if (preset === 'TODAY') return { start: today, end: today };
  if (preset === 'WEEK') {
    const d = new Date(now);
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    d.setDate(diff);
    return { start: toYMD(d), end: today };
  }
  if (preset === 'MONTH') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toYMD(d), end: today };
  }
  if (preset === 'YEAR') {
    const d = new Date(now.getFullYear(), 0, 1);
    return { start: toYMD(d), end: today };
  }
  return {
    start: customStart || null,
    end: customEnd || null,
  };
}

export function filterRecordsByDate<T extends object>(
  records: T[],
  dateKey: keyof T,
  preset: DateFilterPreset,
  customStart?: string,
  customEnd?: string
): T[] {
  const { start, end } = getDateRangeBounds(preset, customStart, customEnd);
  if (!start && !end) return records;
  return records.filter((item) => {
    const raw = String(item[dateKey] || '').slice(0, 10);
    if (!raw) return false;
    if (start && raw < start) return false;
    if (end && raw > end) return false;
    return true;
  });
}

export interface MonthlyComparisonPoint {
  monthKey: string;
  label: string;
  purchaseTotal: number;
  salesTotal: number;
  grossProfit: number;
}

export function computeMonthlySeries(
  purchases: Purchase[],
  sales: Sale[]
): MonthlyComparisonPoint[] {
  const map = new Map<string, MonthlyComparisonPoint>();

  const ensure = (monthKey: string) => {
    if (!map.has(monthKey)) {
      const [y, m] = monthKey.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      const label = Number.isNaN(d.getTime())
        ? monthKey
        : d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      map.set(monthKey, {
        monthKey,
        label,
        purchaseTotal: 0,
        salesTotal: 0,
        grossProfit: 0,
      });
    }
    return map.get(monthKey)!;
  };

  for (const p of purchases) {
    const mk = (p.purchaseDate || '').slice(0, 7);
    if (mk.length === 7) {
      const sign = getPurchaseSign(p.type);
      ensure(mk).purchaseTotal = roundCurrency(ensure(mk).purchaseTotal + sign * p.totalAmount);
    }
  }

  for (const s of sales) {
    const mk = (s.saleDate || '').slice(0, 7);
    if (mk.length === 7) {
      const sign = s.type === 'CUSTOMER_RETURN' ? -1 : 1;
      const entry = ensure(mk);
      entry.salesTotal = roundCurrency(entry.salesTotal + sign * s.totalAmount);
      entry.grossProfit = roundCurrency(entry.grossProfit + sign * s.grossProfit);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function todayYMD(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
