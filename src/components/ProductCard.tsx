import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { SafeImage } from './SafeImage';
import { formatNumber } from '../lib/accounting';
import { isPlaceholderProduct } from '../lib/previewPlaceholders';
import type { PublicProduct } from '../types';

interface ProductCardProps {
  product: PublicProduct;
  onRequestQuote: (product: PublicProduct) => void;
}

export function ProductCard({ product, onRequestQuote }: ProductCardProps) {
  const primaryImage = product.images[0] || '';
  const placeholder = isPlaceholderProduct(product);

  return (
    <article className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to={`/products/${product.productId}`}
        className="block aspect-[4/3] bg-[#F4F7F5] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14452F]"
      >
        <SafeImage
          src={primaryImage}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex-1 p-5 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="truncate">{product.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular truncate">{product.sku}</span>
          </div>

          {placeholder && (
            <p className="text-[11px] font-medium text-amber-800">
              Layout Preview Placeholder · Sample Grade
            </p>
          )}

          <Link
            to={`/products/${product.productId}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] rounded"
          >
            <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#14452F] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>

          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {product.description || 'Graded commercial jute supply ready for wholesale dispatch.'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Unit: <strong className="text-slate-800 font-medium">{product.unit}</strong>
            </span>
            {product.showStockPublicly ? (
              <span
                className={`font-medium tabular-nums ${
                  product.publicAvailableStock > 0 ? 'text-emerald-800' : 'text-amber-700'
                }`}
              >
                {product.publicAvailableStock > 0
                  ? `${formatNumber(product.publicAvailableStock)} ${product.unit} available`
                  : 'Currently Out of Stock'}
              </span>
            ) : (
              <span className="text-slate-600 tabular-nums">
                MOQ {formatNumber(product.minOrderQty || 1)} {product.unit}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to={`/products/${product.productId}`}
              className="flex-1 inline-flex items-center justify-center min-h-[40px] py-2 px-3 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]"
            >
              Details
            </Link>
            <button
              type="button"
              onClick={() => onRequestQuote(product)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] py-2 px-3 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14452F]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Request Quote
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
