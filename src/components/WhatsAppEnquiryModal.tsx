import React, { useState } from 'react';
import { ExternalLink, MessageCircle, X } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { submitBuyerEnquiry } from '../services/firestoreService';
import {
  buildProductEnquiryMessage,
  buildWhatsAppUrl,
  selectWhatsAppNumber,
} from '../lib/whatsapp';
import { isPlaceholderProduct } from '../lib/previewPlaceholders';
import type { PublicProduct } from '../types';

interface WhatsAppEnquiryModalProps {
  product: PublicProduct | null;
  onClose: () => void;
}

export function WhatsAppEnquiryModal({ product, onClose }: WhatsAppEnquiryModalProps) {
  const { settings, activeWhatsAppNumbers } = useCompany();
  const [quantity, setQuantity] = useState(() => String(product?.minOrderQty || 10));
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedWaUrl, setSubmittedWaUrl] = useState<string | null>(null);

  if (!product) return null;

  const isPlaceholder = isPlaceholderProduct(product);
  const recipient = selectWhatsAppNumber(activeWhatsAppNumbers, isPlaceholder ? 'general' : 'product');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError('Please enter your city or delivery location.');
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
        // Open WhatsApp without window.open popup failure breaking UX
        const anchor = document.createElement('a');
        anchor.href = waUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      } else {
        setSubmittedWaUrl('SAVED_ONLY');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-medium text-[#14452F]">
              {isPlaceholder
                ? 'Layout Preview Sample · General Wholesale Quote Request'
                : 'WhatsApp Quotation Request'}
            </p>
            <h2 id="wa-modal-title" className="font-display text-xl font-semibold text-slate-900 mt-0.5">
              {product.name}
            </h2>
            <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
              SKU: {product.sku} · Unit: {product.unit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedWaUrl ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 space-y-2">
              <p className="text-sm font-semibold text-[#14452F]">
                Enquiry recorded successfully
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {submittedWaUrl === 'SAVED_ONLY'
                  ? `Your enquiry has been saved for ${settings.companyName}. No active WhatsApp desk number is currently configured, so our team will contact you via ${settings.email}.`
                  : `Your enquiry is logged and routed to ${recipient?.displayName} (${recipient?.phoneNumber}). If WhatsApp did not open automatically, click below.`}
              </p>
            </div>
            {submittedWaUrl !== 'SAVED_ONLY' && (
              <a
                href={submittedWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp Chat
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F] tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your Phone (optional)
                </label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your Name / Company *
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Delivery Location / City *
                </label>
                <input
                  type="text"
                  required
                  value={buyerLocation}
                  onChange={(e) => setBuyerLocation(e.target.value)}
                  placeholder="e.g. Kolkata, WB"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Specification or Packaging Notes (optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferred GSM, bale packing, delivery schedule..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                {recipient
                  ? `Routes to ${recipient.displayName}`
                  : 'Saves enquiry to trade desk'}
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Request on WhatsApp'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
