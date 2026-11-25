import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { useCompany } from '../context/CompanyContext';
import { getDesignCssStyle } from '../lib/cmsDefaults';

export function PrivacyPolicyPage() {
  const { settings, cmsConfig, publishedPages } = useCompany();
  const managedPage = publishedPages.find(
    (p) => p.slug === 'privacy-policy' || p.pageId === 'page_privacy'
  );
  const designStyle = getDesignCssStyle(cmsConfig.design);
  const displayFontStyle = {
    fontFamily: `'${cmsConfig.design.displayFont || 'Fraunces'}', Georgia, serif`,
  };

  return (
    <div className="min-h-screen flex flex-col" style={designStyle}>
      <PageMeta
        title={managedPage?.seoTitle || `Privacy Policy – ${settings.companyName}`}
        description={
          managedPage?.seoDescription ||
          `Privacy Policy and buyer enquiry data practices of ${settings.companyName}.`
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
              Legal &amp; Compliance
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold [text-wrap:balance]" style={displayFontStyle}>
              {managedPage?.title || 'Privacy Policy'}
            </h1>
            <p className="text-base opacity-80 leading-relaxed">
              {managedPage?.subtitle ||
                `How ${settings.companyName} collects, processes, and safeguards buyer and commercial enquiry information.`}
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
                    01. Business Information We Collect
                  </h2>
                  <p>
                    When you submit a bulk wholesale quotation request or general trade enquiry on{' '}
                    <strong>{settings.companyName}</strong>, we collect only the details necessary
                    to respond to your commercial requirement: your name or business entity, optional
                    contact telephone number, delivery city/state, product SKU interest, and order
                    quantity notes.
                  </p>
                </article>

                <article className="space-y-2.5">
                  <h2 className="text-xl font-semibold" style={displayFontStyle}>
                    02. Purpose of Collection &amp; WhatsApp Routing
                  </h2>
                  <p>
                    Enquiry details are saved securely in our business database and formatted for
                    direct WhatsApp Click-to-Chat communication with our designated sales desk so
                    we can issue wholesale quotations in {cmsConfig.general.currencyCode || 'INR'},
                    verify dispatch schedules, and coordinate logistics.
                  </p>
                </article>

                <article className="space-y-2.5">
                  <h2 className="text-xl font-semibold" style={displayFontStyle}>
                    03. Confidentiality &amp; Access Controls
                  </h2>
                  <p>
                    Buyer enquiry records are strictly private and accessible only to verified,
                    authorized administrators of {settings.companyName}. We do not sell, rent, or
                    share buyer contact information with unaffiliated third-party marketers.
                  </p>
                </article>

                <article className="space-y-2.5">
                  <h2 className="text-xl font-semibold" style={displayFontStyle}>
                    04. Record Updates &amp; Contact
                  </h2>
                  <p>
                    To request corrections, updates, or removal of your submitted trade enquiry
                    contact details, please contact our office using the verified trade desk details
                    below.
                  </p>
                </article>
              </div>
            )}

            <div
              className="border border-black/10 rounded-xl p-6 space-y-3 text-sm"
              style={{ backgroundColor: cmsConfig.design.surfaceColor }}
            >
              <h2 className="text-base font-semibold" style={displayFontStyle}>
                Data &amp; Trade Desk Contact ({settings.companyName})
              </h2>
              <p className="text-xs opacity-75">{settings.address}</p>
              <div className="flex flex-wrap gap-6 pt-1 text-xs font-medium">
                <a
                  href={`mailto:${settings.email}`}
                  className="inline-flex items-center gap-1.5 hover:underline"
                  style={{ color: cmsConfig.design.primaryColor }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  {settings.email}
                </a>
                {settings.contactNumbers.map((num, i) => (
                  <a
                    key={`${num}-${i}`}
                    href={`tel:${num}`}
                    className="inline-flex items-center gap-1.5 font-mono-tabular hover:underline"
                    style={{ color: cmsConfig.design.primaryColor }}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {num}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
