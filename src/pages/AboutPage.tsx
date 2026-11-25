import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { SafeImage } from '../components/SafeImage';
import { useCompany } from '../context/CompanyContext';
import { STUDIO_MEDIA_ASSETS } from '../lib/constants';
import { getDesignCssStyle } from '../lib/cmsDefaults';

export function AboutPage() {
  const { settings, cmsConfig, publishedPages } = useCompany();
  const managedAbout = publishedPages.find(
    (p) => p.slug === 'about' || p.pageId === 'page_about'
  );

  const pageTitle = managedAbout?.title || settings.companyName;
  const pageSubtitle = managedAbout?.subtitle || settings.aboutSummary;
  const pageContent = managedAbout?.content || settings.aboutStory;
  const heroImg =
    managedAbout?.heroImage ||
    cmsConfig.homepage.aboutImageUrl ||
    STUDIO_MEDIA_ASSETS.aboutCraftsmanship;
  const gallery = managedAbout?.galleryImages || [];

  const designStyle = getDesignCssStyle(cmsConfig.design);

  return (
    <div className="min-h-screen flex flex-col" style={designStyle}>
      <PageMeta
        title={managedAbout?.seoTitle || `About Us – ${settings.companyName}`}
        description={managedAbout?.seoDescription || pageSubtitle}
        keywords={managedAbout?.seoKeywords || cmsConfig.seo.keywords}
        ogImage={managedAbout?.seoOgImage || heroImg}
      />
      <PublicHeader />

      <main className="flex-1">
        <section
          className="border-b border-black/10 py-14 lg:py-20"
          style={{ backgroundColor: cmsConfig.design.surfaceColor }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-4">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: cmsConfig.design.primaryColor }}
              >
                About Company
              </p>
              <h1
                className="text-3xl sm:text-5xl font-semibold [text-wrap:balance]"
                style={{ fontFamily: `'${cmsConfig.design.displayFont}', Georgia, serif` }}
              >
                {pageTitle}
              </h1>
              <p className="text-lg opacity-80 leading-relaxed">{pageSubtitle}</p>
            </div>
          </div>
        </section>

        <section className="py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-6 space-y-6">
              <h2
                className="text-2xl sm:text-3xl font-semibold"
                style={{ fontFamily: `'${cmsConfig.design.displayFont}', Georgia, serif` }}
              >
                Wholesale Operations &amp; Quality Commitment
              </h2>
              <p className="text-base opacity-85 leading-relaxed whitespace-pre-line">
                {pageContent}
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: cmsConfig.design.primaryColor }}
                  />
                  <p className="text-sm opacity-85">
                    Direct sourcing and grading from West Bengal jute-producing belts.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: cmsConfig.design.primaryColor }}
                  />
                  <p className="text-sm opacity-85">
                    Consistent GSM, tensile strength, and weight-verified bale packaging.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: cmsConfig.design.primaryColor }}
                  />
                  <p className="text-sm opacity-85">
                    Transparent wholesale invoicing in {cmsConfig.general.currencyCode || 'INR'} with dedicated dispatch coordination.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: cmsConfig.design.primaryColor }}
                >
                  Explore Products
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 hover:border-slate-500 rounded-lg transition-colors"
                >
                  Contact Sales Desk
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-black/10 bg-[#F4F7F5]">
                <SafeImage
                  src={heroImg}
                  alt={pageTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              {gallery.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {gallery.slice(0, 4).map((imgUrl, idx) => (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className="aspect-[4/3] rounded-lg overflow-hidden border border-black/10"
                    >
                      <SafeImage
                        src={imgUrl}
                        alt={`${pageTitle} facility ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div
                className="border border-black/10 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm"
                style={{ backgroundColor: cmsConfig.design.surfaceColor }}
              >
                <div>
                  <span className="text-xs font-medium opacity-65 block">Registered Office</span>
                  <span className="mt-1 block">{settings.address}</span>
                </div>
                <div>
                  <span className="text-xs font-medium opacity-65 block">Business Hours</span>
                  <span className="mt-1 block">
                    {settings.businessHours || 'Mon – Sat · 9:00 AM – 7:00 PM'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-medium opacity-65 block">Official Email</span>
                  <span className="mt-1 block break-all">{settings.email}</span>
                </div>
                {settings.gstNumber && (
                  <div>
                    <span className="text-xs font-medium opacity-65 block">GSTIN</span>
                    <span className="font-mono-tabular mt-1 block">{settings.gstNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
