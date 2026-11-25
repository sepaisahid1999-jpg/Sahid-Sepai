import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MessageCircle } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { SafeImage } from '../components/SafeImage';
import { ProductCard } from '../components/ProductCard';
import { WhatsAppEnquiryModal } from '../components/WhatsAppEnquiryModal';
import { useCompany } from '../context/CompanyContext';
import { formatNumber } from '../lib/accounting';
import { getDesignCssStyle } from '../lib/cmsDefaults';
import { PLACEHOLDER_PRODUCTS, isPlaceholderProduct } from '../lib/previewPlaceholders';
import {
  buildProductEnquiryMessage,
  buildWhatsAppUrl,
  selectWhatsAppNumber,
} from '../lib/whatsapp';
import {
  fetchPublicProductById,
  submitBuyerEnquiry,
  subscribePublicProducts,
} from '../services/firestoreService';
import type { PublicProduct } from '../types';

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { settings, activeWhatsAppNumbers, cmsConfig } = useCompany();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quoteModalProduct, setQuoteModalProduct] = useState<PublicProduct | null>(null);

  const [quantity, setQuantity] = useState('10');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedWaUrl, setSubmittedWaUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setActiveImageIdx(0);
    setSubmittedWaUrl(null);
    setError(null);

    async function load() {
      if (!productId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const placeholderMatch = PLACEHOLDER_PRODUCTS.find((p) => p.productId === productId);
        if (placeholderMatch) {
          if (mounted) {
            setProduct(placeholderMatch);
            setQuantity(String(placeholderMatch.minOrderQty || 10));
          }
          return;
        }
        const data = await fetchPublicProductById(productId);
        if (mounted) {
          setProduct(data);
          if (data?.minOrderQty) setQuantity(String(data.minOrderQty));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  useEffect(() => {
    const unsub = subscribePublicProducts((items) => {
      const pool = items.length > 0 ? items : PLACEHOLDER_PRODUCTS;
      setRelatedProducts(pool.filter((p) => p.productId !== productId).slice(0, 3));
    });
    return () => unsub();
  }, [productId]);

  const isPlaceholder = product ? isPlaceholderProduct(product) : false;
  const recipient = selectWhatsAppNumber(
    activeWhatsAppNumbers,
    isPlaceholder ? 'general' : 'product'
  );
  const designStyle = getDesignCssStyle(cmsConfig.design);
  const displayFontStyle = {
    fontFamily: `'${cmsConfig.design.displayFont || 'Fraunces'}', Georgia, serif`,
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setError(null);

    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError('Please enter a valid required quantity.');
      return;
    }
    if (buyerName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (buyerLocation.trim().length < 2) {
      setError('Please enter your location.');
      return;
    }

    const message = buildProductEnquiryMessage({
      companyName: settings.companyName,
      productName: product.name,
      sku: product.sku,
      quantity: qtyNum,
      unit: product.unit,
      buyerName: buyerName.trim(),
      buyerLocation: buyerLocation.trim(),
      notes: notes.trim(),
    });

    setSubmitting(true);
    try {
      await submitBuyerEnquiry({
        productId: isPlaceholder ? '' : product.productId,
        productName: isPlaceholder ? `Catalogue Sample Interest: ${product.name}` : product.name,
        sku: isPlaceholder ? 'GENERAL' : product.sku,
        quantity: qtyNum,
        unit: product.unit,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerLocation: buyerLocation.trim(),
        message,
        whatsappNumberUsed: recipient?.phoneNumber || '',
        enquiryType: isPlaceholder ? 'GENERAL' : 'PRODUCT',
      });

      if (recipient) {
        const waUrl = buildWhatsAppUrl(recipient.phoneNumber, message);
        setSubmittedWaUrl(waUrl);
        const anchor = document.createElement('a');
        anchor.href = waUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      } else {
        setSubmittedWaUrl('SAVED_ONLY');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={designStyle}>
      <PageMeta
        title={
          product
            ? `${product.name} (${product.sku}) – ${settings.companyName}`
            : `Product Details – ${settings.companyName}`
        }
        description={
          product?.description ||
          `Wholesale specifications and WhatsApp quotation for ${settings.companyName} jute products.`
        }
        keywords={cmsConfig.seo.keywords}
        ogImage={product?.images[0] || cmsConfig.seo.ogImage}
      />
      <PublicHeader />

      <main className="flex-1 py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#14452F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Products
          </Link>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-6 h-96 rounded-xl bg-slate-100 animate-pulse" />
              <div className="lg:col-span-6 h-96 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          ) : !product ? (
            <div className="border border-slate-200 rounded-xl p-12 text-center bg-[#F6F8F7] space-y-3">
              <h1 className="text-2xl font-semibold text-slate-900" style={displayFontStyle}>
                Product not found
              </h1>
              <p className="text-sm text-slate-600">
                This product may be inactive or removed from the public catalogue.
              </p>
              <Link
                to="/products"
                className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-[#14452F] rounded-lg"
              >
                Browse Active Catalogue
              </Link>
            </div>
          ) : (
            <>
              {isPlaceholder && (
                <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200 px-4 py-3 rounded-lg">
                  Layout Preview Placeholder: This sample specification demonstrates product layout while awaiting live warehouse SKUs. Submitting a quote routes as a general wholesale request to our trade desk.
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                {/* Left: Sticky Multi-Image Gallery */}
                <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-[#F4F7F5]">
                    <SafeImage
                      src={product.images[activeImageIdx] || ''}
                      alt={product.name}
                      fallbackLabel={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {product.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-3">
                      {product.images.map((imgUrl, idx) => (
                        <button
                          key={`${imgUrl}-${idx}`}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors ${
                            idx === activeImageIdx
                              ? 'border-[#14452F]'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <SafeImage
                            src={imgUrl}
                            alt={`${product.name} view ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Contiguous Wholesale Specifications & Quotation Module */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="space-y-3 border-b border-slate-200 pb-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{product.categoryName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">SKU: {product.sku}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Trade Currency: {cmsConfig.general.currencyCode || 'INR'} (
                        {cmsConfig.general.currencySymbol || '₹'})
                      </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold text-slate-950" style={displayFontStyle}>
                      {product.name}
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed whitespace-pre-line">
                      {product.description || 'Commercial-grade wholesale jute product.'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 text-xs">
                      <div className="p-3.5 rounded-lg bg-[#F6F8F7] border border-slate-200">
                        <span className="text-slate-500 block">Supply Unit</span>
                        <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                          {product.unit}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-[#F6F8F7] border border-slate-200">
                        <span className="text-slate-500 block">Minimum Order</span>
                        <span className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5 block">
                          {formatNumber(product.minOrderQty || 1)} {product.unit}
                        </span>
                      </div>
                      {product.showStockPublicly && (
                        <div className="p-3.5 rounded-lg bg-[#F6F8F7] border border-slate-200">
                          <span className="text-slate-500 block">Available Stock</span>
                          <span
                            className={`text-sm font-semibold tabular-nums mt-0.5 block ${
                              product.publicAvailableStock > 0
                                ? 'text-[#14452F]'
                                : 'text-amber-700'
                            }`}
                          >
                            {product.publicAvailableStock > 0
                              ? `${formatNumber(product.publicAvailableStock)} ${product.unit}`
                              : 'Out of Stock'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buyer Enquiry & WhatsApp Form */}
                  <div
                    id="product-quotation-form"
                    className="border border-slate-200 rounded-xl p-6 bg-[#F6F8F7] space-y-4"
                  >
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900" style={displayFontStyle}>
                        Request Wholesale Quotation
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        Rates are quoted in {cmsConfig.general.currencyCode || 'INR'} based on quantity and delivery location. Submit below to generate a pre-filled WhatsApp enquiry.
                      </p>
                    </div>

                    {submittedWaUrl ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 space-y-1.5">
                          <p className="text-sm font-semibold text-[#14452F]">Enquiry Saved</p>
                          <p className="text-xs text-slate-700">
                            {submittedWaUrl === 'SAVED_ONLY'
                              ? `Your quotation request has been logged for ${settings.companyName}.`
                              : `Routed to ${recipient?.displayName} (${recipient?.phoneNumber}).`}
                          </p>
                        </div>
                        {submittedWaUrl !== 'SAVED_ONLY' && (
                          <a
                            href={submittedWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] py-3 px-4 text-sm font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Open WhatsApp Message
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSubmittedWaUrl(null)}
                          className="text-xs font-medium text-[#14452F] hover:underline"
                        >
                          Send another enquiry
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleEnquirySubmit} className="space-y-4">
                        {error && (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                            {error}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Required Quantity ({product.unit}) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              required
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F] tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Phone Number (optional)
                            </label>
                            <input
                              type="tel"
                              value={buyerPhone}
                              onChange={(e) => setBuyerPhone(e.target.value)}
                              placeholder="+91 98XXXXXXXX"
                              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Your Name / Business *
                            </label>
                            <input
                              type="text"
                              required
                              value={buyerName}
                              onChange={(e) => setBuyerName(e.target.value)}
                              placeholder="Your full name"
                              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Delivery Location *
                            </label>
                            <input
                              type="text"
                              required
                              value={buyerLocation}
                              onChange={(e) => setBuyerLocation(e.target.value)}
                              placeholder="City, State"
                              className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Additional Notes (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Custom branding, GSM spec, target dispatch date..."
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] py-3 px-5 text-sm font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {submitting ? 'Preparing WhatsApp Enquiry...' : 'Request on WhatsApp'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* Related Wholesale Lines */}
              {relatedProducts.length > 0 && (
                <section className="pt-8 border-t border-slate-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-slate-950" style={displayFontStyle}>
                      Other Wholesale Grades
                    </h2>
                    <Link
                      to="/products"
                      className="text-xs font-semibold hover:underline"
                      style={{ color: cmsConfig.design.primaryColor }}
                    >
                      View All Products
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {relatedProducts.map((rel) => (
                      <ProductCard
                        key={rel.productId}
                        product={rel}
                        onRequestQuote={setQuoteModalProduct}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <PublicFooter />

      {quoteModalProduct && (
        <WhatsAppEnquiryModal
          product={quoteModalProduct}
          onClose={() => setQuoteModalProduct(null)}
        />
      )}
    </div>
  );
}
