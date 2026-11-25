import { useEffect, useState } from 'react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { CmsHomeRenderer } from '../components/CmsHomeRenderer';
import { WhatsAppEnquiryModal } from '../components/WhatsAppEnquiryModal';
import { useCompany } from '../context/CompanyContext';
import { subscribePublicProducts } from '../services/firestoreService';
import type { PublicProduct } from '../types';

export function HomePage() {
  const { cmsConfig, activeCategories, activeAnnouncements, activeWhatsAppNumbers } = useCompany();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteProduct, setQuoteProduct] = useState<PublicProduct | null>(null);

  useEffect(() => {
    const unsub = subscribePublicProducts((items) => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: cmsConfig.design.backgroundColor || '#FFFFFF',
        color: cmsConfig.design.textColor || '#13221A',
      }}
    >
      <PageMeta
        title={cmsConfig.seo.siteTitle}
        description={cmsConfig.seo.metaDescription}
        keywords={cmsConfig.seo.keywords}
        ogImage={cmsConfig.seo.ogImage}
      />
      <PublicHeader />

      <main className="flex-1 flex flex-col">
        <CmsHomeRenderer
          cms={cmsConfig}
          products={products}
          categories={activeCategories}
          announcements={activeAnnouncements}
          whatsappNumbers={activeWhatsAppNumbers}
          loadingProducts={loading}
          onRequestQuote={setQuoteProduct}
        />
      </main>

      <PublicFooter />

      {quoteProduct && (
        <WhatsAppEnquiryModal
          product={quoteProduct}
          onClose={() => setQuoteProduct(null)}
        />
      )}
    </div>
  );
}
