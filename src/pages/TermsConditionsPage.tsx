import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { useCompany } from '../context/CompanyContext';
import { getDesignCssStyle } from '../lib/cmsDefaults';

export function TermsConditionsPage() {
  const { settings, cmsConfig, publishedPages } = useCompany();
  const managedPage = publishedPages.find(
    (p) => p.slug === 'terms-and-conditions' || p.pageId === 'page_terms'
  );
  const designStyle = getDesignCssStyle(cmsConfig.design);
  const displayFontStyle = {
    fontFamily: `'${cmsConfig.design.displayFont || 'Fraunces'}', Georgia, serif`,
  };
  const currencyCode = cmsConfig.general.currencyCode || 'INR';
  const currencySymbol = cmsConfig.general.currencySymbol || '₹';

  return (
    <div className="min-h-screen flex flex-col" style={designStyle}>
      <PageMeta
        title={managedPage?.seoTitle || `Terms and Conditions – ${settings.companyName}`}
        description={
          managedPage?.seoDescription ||
          `Commercial wholesale trade terms, MOQ policy, and INR billing guidelines for ${settings.companyName}.`
        }
        keywords={managedPage?.seoKeywords || cmsConfig.seo.keywords}
        ogImage={managedPage?.seoOgImage || cmsConfig.seo.ogImage}
      />
      <PublicHeader />

      <main className="flex-1">
        <section
          className="border-b border-black/10 py-12 lg:py-16"
          style={{ backgroundColor: cmsConfig.design.surfaceColor }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium opacity-75 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: cmsConfig.design.primaryColor }}
            >
              Commercial Trade Terms
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold [text-wrap:balance]" style={displayFontStyle}>
              {managedPage?.title || 'Terms and Conditions'}
            </h1>
            <p className="text-base opacity-80 leading-relaxed">
              {managedPage?.subtitle ||
                `Standard wholesale quotation, specification, and dispatch terms governing transactions with ${settings.companyName}.`}
            </p>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {managedPage?.content ? (
              <div className="text-sm sm:text-base opacity-90 leading-relaxed whitespace-pre-line border-b border-black/10 pb-8">
                {managedPage.content}
              </div>
            ) : (
              <div className="space-y-8 text-sm sm:text-base opacity-90 leading-relaxed border-b border-black/10 pb-8">
                <article className="space-y-2.5">
                  <h2 className="text-xl font-semibold" style={displayFontStyle}>
                    01. Wholesale Quotations &amp; Currency ({currencyCode})
                  </h2>
                  <p>
                    All wholesale product rates, freight estimates, and tax invoices from{' '}
                    <strong>{settings.companyName}</strong> are denominated in Indian Rupees (
                    {currencyCode} / {currencySymbol}). Catalogue enquiries initiated through the
                    website or WhatsApp serve as formal quote requests and do not constitute a
                    binding dispatch contract until confirmed via an official proforma or GST tax
                    invoice.
                  </p>
                </article>

                <article className="space-y-2.5">
                  <h2 className="text-xl font-semibold" style={displayFontStyle}>
                    02. Minimum Order Quantity (MOQ) &amp; Stock Availability
                  </h2>
                  <p>
                    Every wholesale grade specifies an applicable Minimum Order Quantity (per bale,
                    roll, bundle, piece, quintal, or metric ton). Stock figures displayed publicly,
                    where enabled, reflect warehouse availability at the time of synchronization and
                    remain subject to prior commercial booking.
                  </p>
                </article>

                <article className="space-y-2.5">
                  <h2 className="text-xl font-semibold" style={displayFontStyle}>
                    03. Material Specifications &amp; Natural Tolerances
                  </h2>
                  <p>
                    Jute is a natural plant fiber; standard commercial tolerances apply for GSM,
                    moisture regain, bale tare weight, and weave count in accordance with prevailing
                    Indian jute trade practices. Specific buyer testing criteria must be stated in
                    writing prior to lot allocation.
                  </p>
                </article>

                <article className="space-y-2.5">
                  <h2 className="text-xl font-semibold" style={displayFontStyle}>
                    04. Dispatch, Freight &amp; Dispute Jurisdiction
                  </h2>
                  <p>
                    Dispatch schedules depend on transport availability, mill loading queues, and
                    payment realization terms agreed on the invoice. Any commercial claims regarding
                    shortage or transit damage must be documented upon delivery with the transport
                    consignment receipt within 48 hours of receipt.
                  </p>
                </article>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs opacity-75">
                Questions regarding commercial terms? Email{' '}
                <a href={`mailto:${settings.email}`} className="underline">
                  {settings.email}
                </a>
                .
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg"
                  style={{ backgroundColor: cmsConfig.design.primaryColor }}
                >
                  Browse Products
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg hover:border-slate-500"
                >
                  Contact Trade Desk
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
