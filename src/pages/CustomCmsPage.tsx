import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { SafeImage } from '../components/SafeImage';
import { useCompany } from '../context/CompanyContext';
import { getDesignCssStyle } from '../lib/cmsDefaults';

export function CustomCmsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { publishedPages, cmsConfig, settings } = useCompany();

  const page = publishedPages.find((p) => p.slug === slug);
  const designStyle = getDesignCssStyle(cmsConfig.design);

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col" style={designStyle}>
        <PageMeta
          title={`Page Not Found – ${settings.companyName}`}
          description={settings.aboutSummary}
        />
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full border border-black/10 rounded-xl p-8 text-center space-y-4 bg-white">
            <h1
              className="text-2xl font-semibold text-slate-900"
              style={{ fontFamily: `'${cmsConfig.design.displayFont}', Georgia, serif` }}
            >
              Page Not Available
            </h1>
            <p className="text-sm text-slate-600">
              This page either does not exist or is currently unpublished.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white rounded-lg"
              style={{ backgroundColor: cmsConfig.design.primaryColor }}
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={designStyle}>
      <PageMeta
        title={page.seoTitle || `${page.title} – ${settings.companyName}`}
        description={page.seoDescription || page.subtitle || settings.aboutSummary}
        keywords={page.seoKeywords || cmsConfig.seo.keywords}
        ogImage={page.seoOgImage || page.heroImage || cmsConfig.seo.ogImage}
      />
      <PublicHeader />

      <main className="flex-1">
        <section
          className="border-b border-black/10 py-14 lg:py-20"
          style={{ backgroundColor: cmsConfig.design.surfaceColor }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <h1
              className="text-3xl sm:text-5xl font-semibold [text-wrap:balance]"
              style={{ fontFamily: `'${cmsConfig.design.displayFont}', Georgia, serif` }}
            >
              {page.title}
            </h1>
            {page.subtitle && (
              <p className="text-lg opacity-80 leading-relaxed max-w-3xl">{page.subtitle}</p>
            )}
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {page.heroImage && (
              <div className="aspect-[16/7] rounded-xl overflow-hidden border border-black/10 bg-[#F4F7F5]">
                <SafeImage
                  src={page.heroImage}
                  alt={page.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="prose max-w-none text-base opacity-90 leading-relaxed whitespace-pre-line">
              {page.content}
            </div>

            {page.galleryImages.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
                {page.galleryImages.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="aspect-[4/3] rounded-xl overflow-hidden border border-black/10 bg-[#F4F7F5]"
                  >
                    <SafeImage
                      src={imgUrl}
                      alt={`${page.title} gallery ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-black/10 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg"
                style={{ backgroundColor: cmsConfig.design.primaryColor }}
              >
                Browse Wholesale Catalogue
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-slate-300 rounded-lg"
              >
                Contact Trade Desk
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
