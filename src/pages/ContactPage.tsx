import React, { useState } from 'react';
import { ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { useCompany } from '../context/CompanyContext';
import { getDesignCssStyle } from '../lib/cmsDefaults';
import {
  buildGeneralEnquiryMessage,
  buildWhatsAppUrl,
  selectWhatsAppNumber,
} from '../lib/whatsapp';
import { submitBuyerEnquiry } from '../services/firestoreService';

export function ContactPage() {
  const { settings, activeWhatsAppNumbers, cmsConfig, publishedPages } = useCompany();
  const managedContact = publishedPages.find(
    (p) => p.slug === 'contact' || p.pageId === 'page_contact'
  );

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);

  const generalWa = selectWhatsAppNumber(activeWhatsAppNumbers, 'general');
  const designStyle = getDesignCssStyle(cmsConfig.design);

  const heading = managedContact?.title || `Contact ${settings.companyName}`;
  const subtitle =
    managedContact?.subtitle ||
    'Reach our wholesale trade desk by phone, email, or direct WhatsApp enquiry for bulk quotations and dispatch availability.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (buyerName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (buyerLocation.trim().length < 2) {
      setError('Please enter your city or location.');
      return;
    }
    if (messageText.trim().length < 4) {
      setError('Please describe your enquiry.');
      return;
    }

    const formattedMessage = buildGeneralEnquiryMessage({
      companyName: settings.companyName,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerLocation: buyerLocation.trim(),
      message: messageText.trim(),
    });

    setSubmitting(true);
    try {
      await submitBuyerEnquiry({
        productId: '',
        productName: 'General Wholesale Enquiry',
        sku: 'GENERAL',
        quantity: 0,
        unit: '',
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerLocation: buyerLocation.trim(),
        message: formattedMessage,
        whatsappNumberUsed: generalWa?.phoneNumber || '',
        enquiryType: 'GENERAL',
      });

      if (generalWa) {
        const waUrl = buildWhatsAppUrl(generalWa.phoneNumber, formattedMessage);
        setSubmittedUrl(waUrl);
        const anchor = document.createElement('a');
        anchor.href = waUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      } else {
        setSubmittedUrl('SAVED_ONLY');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={designStyle}>
      <PageMeta
        title={managedContact?.seoTitle || `Contact Us – ${settings.companyName}`}
        description={
          managedContact?.seoDescription ||
          `Contact ${settings.companyName} for wholesale jute pricing, dispatch schedules, and bulk WhatsApp enquiries.`
        }
        keywords={managedContact?.seoKeywords || cmsConfig.seo.keywords}
        ogImage={managedContact?.seoOgImage || cmsConfig.seo.ogImage}
      />
      <PublicHeader />

      <main className="flex-1 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="border-b border-black/10 pb-6 max-w-2xl space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: cmsConfig.design.primaryColor }}
            >
              Trade &amp; Sales Desk
            </p>
            <h1
              className="text-3xl sm:text-4xl font-semibold"
              style={{ fontFamily: `'${cmsConfig.design.displayFont}', Georgia, serif` }}
            >
              {heading}
            </h1>
            <p className="text-sm opacity-80 leading-relaxed">{subtitle}</p>
            {managedContact?.content && (
              <p className="text-sm opacity-75 leading-relaxed pt-1 whitespace-pre-line">
                {managedContact.content}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Contact Info */}
            <div className="lg:col-span-5 space-y-6">
              <div
                className="border border-black/10 rounded-xl p-6 space-y-5"
                style={{ backgroundColor: cmsConfig.design.surfaceColor }}
              >
                <div className="flex items-start gap-3.5">
                  <Phone
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: cmsConfig.design.primaryColor }}
                  />
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider opacity-65">
                      Phone Numbers
                    </h2>
                    <div className="mt-1 space-y-1 font-mono-tabular text-sm">
                      {settings.contactNumbers.map((num, idx) => (
                        <div key={`${num}-${idx}`}>
                          <a href={`tel:${num}`} className="hover:underline">
                            {num}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Mail
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: cmsConfig.design.primaryColor }}
                  />
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider opacity-65">
                      Email Address
                    </h2>
                    <a
                      href={`mailto:${settings.email}`}
                      className="mt-1 block text-sm hover:underline break-all"
                    >
                      {settings.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <MapPin
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: cmsConfig.design.primaryColor }}
                  />
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider opacity-65">
                      Office &amp; Dispatch Location
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed">{settings.address}</p>
                    {settings.businessHours && (
                      <p className="mt-1 text-xs opacity-70">{settings.businessHours}</p>
                    )}
                  </div>
                </div>

                {generalWa && (
                  <div className="pt-2 border-t border-black/10">
                    <p className="text-xs opacity-75 mb-2">
                      Active WhatsApp Trade Desk: <strong>{generalWa.displayName}</strong>
                    </p>
                    <a
                      href={buildWhatsAppUrl(
                        generalWa.phoneNumber,
                        `Hello ${settings.companyName}, I would like to request wholesale pricing.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: cmsConfig.design.primaryColor }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat Directly on WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* General Enquiry Form */}
            <div className="lg:col-span-7 border border-black/10 rounded-xl p-6 sm:p-8 bg-white text-slate-900">
              <h2
                className="text-2xl font-semibold text-slate-950 mb-1"
                style={{ fontFamily: `'${cmsConfig.design.displayFont}', Georgia, serif` }}
              >
                Send a General Enquiry
              </h2>
              <p className="text-xs text-slate-600 mb-6">
                Your enquiry is saved for our team and formatted for immediate WhatsApp follow-up.
              </p>

              {submittedUrl ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 space-y-1.5">
                    <p className="text-sm font-semibold text-[#14452F]">Enquiry submitted</p>
                    <p className="text-xs text-slate-700">
                      {submittedUrl === 'SAVED_ONLY'
                        ? `We have saved your enquiry for ${settings.companyName}.`
                        : `Routed to ${generalWa?.displayName} (${generalWa?.phoneNumber}).`}
                    </p>
                  </div>
                  {submittedUrl !== 'SAVED_ONLY' && (
                    <a
                      href={submittedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg"
                      style={{ backgroundColor: cmsConfig.design.primaryColor }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Open WhatsApp Chat
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedUrl(null);
                        setMessageText('');
                      }}
                      className="text-xs font-medium text-[#14452F] hover:underline"
                    >
                      Submit another message
                    </button>
                  </div>
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
                        Your Name / Business *
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
                        Phone Number (optional)
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

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      City / Delivery Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerLocation}
                      onChange={(e) => setBuyerLocation(e.target.value)}
                      placeholder="City, State"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Requirement Details *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Describe the jute grades, sack dimensions, or quantities you require..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 rounded-lg transition-opacity hover:opacity-90"
                    style={{ backgroundColor: cmsConfig.design.primaryColor }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit & Open WhatsApp'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
