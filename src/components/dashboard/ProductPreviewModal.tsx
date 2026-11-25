import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { SafeImage } from '../SafeImage';
import { formatINR, formatNumber } from '../../lib/accounting';
import type { Product } from '../../types';

interface ProductPreviewModalProps {
  product: Product | null;
  historyCounts: {
    purchases: number;
    sales: number;
    transactions: number;
  };
  onClose: () => void;
  onEdit: (product: Product) => void;
  onArchiveOrDelete: (product: Product) => void;
  onRestore?: (product: Product) => void;
}

export function ProductPreviewModal({
  product,
  historyCounts,
  onClose,
  onEdit,
  onArchiveOrDelete,
  onRestore,
}: ProductPreviewModalProps) {
  const [viewMode, setViewMode] = useState<'internal' | 'public'>('internal');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!product) return null;

  const images = product.images || [];
  const safeImgIdx = activeImageIdx < images.length ? activeImageIdx : 0;
  const activeImg = images[safeImgIdx] || '';
  const isLowStock = product.availableStock <= product.lowStockThreshold;
  const totalTx =
    historyCounts.purchases + historyCounts.sales + historyCounts.transactions;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="product-preview-title"
                className="font-display text-lg font-semibold text-slate-950 truncate"
              >
                {product.name}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  product.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : product.status === 'ARCHIVED'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {product.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
              ID: {product.productId} · SKU: {product.sku} · Category: {product.categoryName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('internal')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'internal'
                    ? 'bg-[#14452F] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Internal Details
              </button>
              <button
                type="button"
                onClick={() => setViewMode('public')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'public'
                    ? 'bg-[#14452F] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Public Catalogue Preview
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {viewMode === 'internal' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Gallery */}
              <div className="lg:col-span-5 space-y-3">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <SafeImage
                    src={activeImg}
                    alt={product.name}
                    fallbackLabel={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {images.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`aspect-[4/3] rounded-lg overflow-hidden border-2 ${
                          idx === safeImgIdx ? 'border-[#14452F]' : 'border-slate-200'
                        }`}
                      >
                        <SafeImage
                          src={url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-2 border border-dashed border-slate-200 rounded-lg">
                    No product images uploaded yet.
                  </p>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Public Display Status</span>
                    <span className="font-semibold text-slate-900">
                      {product.status === 'ACTIVE'
                        ? 'Visible on Public Storefront'
                        : product.status === 'ARCHIVED'
                          ? 'Archived (Hidden)'
                          : 'Inactive (Hidden)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Public Stock Visibility</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      {product.showStockPublicly ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-[#14452F]" />
                          Shown to Buyers
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          Hidden from Public
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Historical Ledger Records</span>
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {totalTx} ({historyCounts.purchases} pur · {historyCounts.sales} sal)
                    </span>
                  </div>
                </div>
              </div>

              {/* Specifications & Accounting Metrics */}
              <div className="lg:col-span-7 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Current Stock</span>
                    <span
                      className={`text-base font-semibold font-mono-tabular mt-0.5 block ${
                        isLowStock ? 'text-amber-700' : 'text-slate-950'
                      }`}
                    >
                      {formatNumber(product.availableStock)} {product.unit}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Alert at ≤ {formatNumber(product.lowStockThreshold)} {product.unit}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Minimum Order (MOQ)</span>
                    <span className="text-base font-semibold font-mono-tabular text-slate-950 mt-0.5 block">
                      {formatNumber(product.minOrderQty || 1)} {product.unit}
                    </span>
                    <span className="text-[11px] text-slate-500">Unit: {product.unit}</span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Avg Purchase Price</span>
                    <span className="text-base font-semibold font-mono-tabular text-slate-950 mt-0.5 block">
                      {formatINR(product.avgPurchasePrice)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Total Purchased: {formatNumber(product.totalPurchaseQty)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Avg Sale Price</span>
                    <span className="text-base font-semibold font-mono-tabular text-slate-950 mt-0.5 block">
                      {formatINR(product.avgSalePrice)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Total Sold: {formatNumber(product.totalSalesQty)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Current Stock Value</span>
                    <span className="text-base font-semibold font-mono-tabular text-slate-950 mt-0.5 block">
                      {formatINR(product.currentStockValue)}
                    </span>
                    <span className="text-[11px] text-slate-500">Weighted valuation</span>
                  </div>

                  <div className="p-3 rounded-xl border border-[#14452F]/20 bg-[#ECF4EF]">
                    <span className="text-[11px] text-[#14452F] font-medium block">
                      Realized Gross Profit
                    </span>
                    <span
                      className={`text-base font-semibold font-mono-tabular mt-0.5 block ${
                        product.grossProfit >= 0 ? 'text-[#14452F]' : 'text-red-700'
                      }`}
                    >
                      {formatINR(product.grossProfit)}
                    </span>
                    <span className="text-[11px] text-[#14452F]/80">
                      Est. Margin: {formatINR(product.estimatedProfit)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Description &amp; Specifications
                  </h4>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {product.description || 'No description provided for this product.'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#14452F] shrink-0 mt-0.5" />
                  <p>
                    {totalTx > 0 || product.totalPurchaseQty > 0 || product.totalSalesQty > 0
                      ? 'Historical record protection is active: because this product has recorded purchases, sales, or stock ledger entries, it cannot be permanently deleted and can only be archived.'
                      : 'No historical transactions recorded yet. This product may be edited, archived, or permanently deleted.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Public Buyer View Preview */
            <div className="space-y-4">
              {product.status !== 'ACTIVE' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>Hidden from Public Storefront:</strong> Because this product&apos;s status is{' '}
                  <span className="font-mono-tabular font-semibold">{product.status}</span>, buyers cannot currently see it in the public catalogue. Below is how it would appear if set to ACTIVE.
                </div>
              )}

              <div className="border border-slate-200 rounded-xl p-6 bg-[#F8FAF9]">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-5 aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <SafeImage
                      src={activeImg}
                      alt={product.name}
                      fallbackLabel={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="md:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{product.categoryName}</span>
                      <span>·</span>
                      <span className="font-mono-tabular">SKU: {product.sku}</span>
                      <span>·</span>
                      <span>Currency: INR (₹)</span>
                    </div>
                    <h4 className="font-display text-2xl font-semibold text-slate-950">
                      {product.name}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {product.description || 'Commercial-grade wholesale jute product.'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-500 block">Supply Unit</span>
                        <span className="font-semibold text-slate-900 mt-0.5 block">
                          {product.unit}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-500 block">Minimum Order</span>
                        <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                          {formatNumber(product.minOrderQty || 1)} {product.unit}
                        </span>
                      </div>
                      {product.showStockPublicly ? (
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <span className="text-slate-500 block">Available Stock</span>
                          <span
                            className={`font-semibold tabular-nums mt-0.5 block ${
                              product.availableStock > 0 ? 'text-[#14452F]' : 'text-amber-700'
                            }`}
                          >
                            {product.availableStock > 0
                              ? `${formatNumber(product.availableStock)} ${product.unit}`
                              : 'Out of Stock'}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <span className="text-slate-500 block">Availability</span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            Quote on Request
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 pt-1">
                      Note: Purchase prices, supplier names, and gross margins are strictly isolated from public catalogue records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {product.status === 'ACTIVE' && (
              <Link
                to={`/products/${product.productId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#14452F] bg-[#ECF4EF] hover:bg-[#DCECE3] rounded-lg"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Live Product Page
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {product.status === 'ARCHIVED' && onRestore ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRestore(product);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#14452F] bg-[#ECF4EF] hover:bg-[#DCECE3] rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Product
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onArchiveOrDelete(product);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive / Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
