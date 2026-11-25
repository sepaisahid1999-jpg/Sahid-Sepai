import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Layers,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { SafeImage } from './SafeImage';
import { ProductCard } from './ProductCard';
import { getDesignCssStyle } from '../lib/cmsDefaults';
import { STUDIO_MEDIA_ASSETS } from '../lib/constants';
import { PLACEHOLDER_CATEGORIES, PLACEHOLDER_PRODUCTS } from '../lib/previewPlaceholders';
import { buildGeneralEnquiryMessage, buildWhatsAppUrl, selectWhatsAppNumber } from '../lib/whatsapp';
import { submitBuyerEnquiry } from '../services/firestoreService';
import type {
  Announcement,
  Category,
  CmsConfigDocument,
  CmsSectionConfig,
  PublicProduct,
  WhatsAppNumber,
} from '../types';

interface CmsHomeRendererProps {
  cms: CmsConfigDocument;
  products: PublicProduct[];
  categories: Category[];
  announcements: Announcement[];
  whatsappNumbers?: WhatsAppNumber[];
  loadingProducts?: boolean;
  previewMode?: boolean;
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  onRequestQuote?: (product: PublicProduct) => void;
  onPreviewNavigate?: (path: string) => void;
}

const WHY_CHOOSE_ITEMS = [
  {
    index: '01.',
    title: 'Graded Bengal Fiber & Mill Stocks',
    description:
      'Consistent grading across Tossa (TD-3/TD-4) and White raw jute bales, plain-woven hessian cloth, B-Twill sacks, and twisted multi-ply twine.',
  },
  {
    index: '02.',
    title: 'GSM, Moisture & Tare Verified',
    description:
      'Every wholesale lot undergoes inspection for fiber tensile strength, weave density, moisture compliance, and certified net bale weight prior to dispatch.',
  },
  {
    index: '03.',
    title: 'Pan-India Full & Part-Load Logistics',
    description:
      'Coordinated dispatch from West Bengal sourcing hubs to agro-mandis, sugar & grain mills, nurseries, and industrial buyers nationwide.',
  },
  {
    index: '04.',
    title: 'Transparent INR Trade & Direct Desk',
    description:
      'Clear GST-compliant wholesale invoicing in INR (₹) paired with instant WhatsApp order specifications and dedicated phone support.',
  },
];

export function CmsHomeRenderer({
  cms,
  products,
  categories,
  announcements,
  whatsappNumbers = [],
  loadingProducts = false,
  previewMode = false,
  selectedSectionId = null,
  onSelectSection,
  onRequestQuote,
  onPreviewNavigate,
}: CmsHomeRendererProps) {
  const { homepage, design, general } = cms;
  const designVars = getDesignCssStyle(design);

  // Inline Wholesale Enquiry Section state
  const [enqName, setEnqName] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqLocation, setEnqLocation] = useState('');
  const [enqDetails, setEnqDetails] = useState('');
  const [enqSubmitting, setEnqSubmitting] = useState(false);
  const [enqError, setEnqError] = useState<string | null>(null);
  const [enqSubmittedUrl, setEnqSubmittedUrl] = useState<string | null>(null);

  const generalWa = selectWhatsAppNumber(whatsappNumbers, 'general');

  const radiusCss =
    design.borderRadius === 'none'
      ? '0px'
      : design.borderRadius === 'sm'
        ? '0.25rem'
        : design.borderRadius === 'md'
          ? '0.5rem'
          : design.borderRadius === 'xl'
            ? '1rem'
            : '0.75rem';

  const btnRadiusCss =
    design.buttonStyle === 'pill'
      ? '9999px'
      : design.buttonStyle === 'sharp'
        ? '0.125rem'
        : radiusCss;

  const sectionPyClass =
    design.sectionSpacing === 'compact'
      ? 'py-10 lg:py-12'
      : design.sectionSpacing === 'spacious'
        ? 'py-20 lg:py-24'
        : 'py-14 lg:py-20';

  const displayFontStyle = {
    fontFamily: `'${design.displayFont || 'Fraunces'}', Georgia, serif`,
  };

  const navOrLink = (
    to: string,
    label: string,
    className: string,
    style?: React.CSSProperties,
    withArrow = false
  ) => {
    if (previewMode) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreviewNavigate?.(to);
          }}
          className={className}
          style={style}
        >
          {label}
          {withArrow && <ArrowRight className="w-4 h-4 shrink-0" />}
        </button>
      );
    }
    return (
      <Link to={to} className={className} style={style}>
        {label}
        {withArrow && <ArrowRight className="w-4 h-4 shrink-0" />}
      </Link>
    );
  };

  const handleInlineEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewMode) return;
    setEnqError(null);

    if (enqName.trim().length < 2) {
      setEnqError('Please enter your name or company.');
      return;
    }
    if (enqLocation.trim().length < 2) {
      setEnqError('Please enter your delivery city/state.');
      return;
    }
    if (enqDetails.trim().length < 4) {
      setEnqError('Please specify the jute product grade or quantity required.');
      return;
    }

    const formattedMessage = buildGeneralEnquiryMessage({
      companyName: general.companyName,
      buyerName: enqName.trim(),
      buyerPhone: enqPhone.trim(),
      buyerLocation: enqLocation.trim(),
      message: enqDetails.trim(),
    });

    setEnqSubmitting(true);
    try {
      await submitBuyerEnquiry({
        productId: '',
        productName: 'Homepage Bulk Wholesale Enquiry',
        sku: 'GENERAL',
        quantity: 0,
        unit: '',
        buyerName: enqName.trim(),
        buyerPhone: enqPhone.trim(),
        buyerLocation: enqLocation.trim(),
        message: formattedMessage,
        whatsappNumberUsed: generalWa?.phoneNumber || '',
        enquiryType: 'GENERAL',
      });

      if (generalWa) {
        const waUrl = buildWhatsAppUrl(generalWa.phoneNumber, formattedMessage);
        setEnqSubmittedUrl(waUrl);
        const anchor = document.createElement('a');
        anchor.href = waUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      } else {
        setEnqSubmittedUrl('SAVED_ONLY');
      }
    } catch (err) {
      setEnqError(err instanceof Error ? err.message : 'Unable to send wholesale enquiry.');
    } finally {
      setEnqSubmitting(false);
    }
  };

  const wrapSection = (sec: CmsSectionConfig, content: React.ReactNode) => {
    const isSelected = previewMode && selectedSectionId === sec.id;
    return (
      <div
        key={sec.id}
        onClick={
          previewMode && onSelectSection
            ? () => onSelectSection(sec.id)
            : undefined
        }
        className={
          previewMode
            ? `relative group transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-inset ring-emerald-600'
                  : 'hover:ring-1 hover:ring-inset hover:ring-emerald-400/60'
              }`
            : undefined
        }
      >
        {previewMode && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-3 z-10 pointer-events-none bg-slate-900/85 text-white text-[10px] font-medium px-2 py-0.5 rounded">
            {sec.title || sec.type}
          </div>
        )}
        {content}
      </div>
    );
  };

  const renderSection = (sec: CmsSectionConfig) => {
    if (!sec.visible) return null;

    switch (sec.type) {
      case 'announcements': {
        if (announcements.length === 0 && !sec.body) return null;
        return wrapSection(
          sec,
          <section
            className="border-b border-black/10 py-6"
            style={{
              backgroundColor: sec.bgColor || design.surfaceColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <Megaphone
                    className="w-4 h-4 shrink-0"
                    style={{ color: sec.textColor || design.primaryColor }}
                  />
                  <span>{sec.title || 'Trade Announcements'}</span>
                </div>
                {sec.subtitle && <span className="text-xs opacity-75">{sec.subtitle}</span>}
              </div>

              {announcements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 border border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{
                        backgroundColor: ann.bgColor || design.primaryColor,
                        color: ann.textColor || '#FFFFFF',
                        borderRadius: radiusCss,
                      }}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">{ann.title}</p>
                        <p className="text-xs opacity-90 leading-relaxed">{ann.message}</p>
                      </div>
                      {ann.linkLabel &&
                        ann.linkUrl &&
                        (previewMode ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewNavigate?.(ann.linkUrl);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 whitespace-nowrap shrink-0"
                            style={{ borderRadius: btnRadiusCss }}
                          >
                            {ann.linkLabel}
                          </button>
                        ) : (
                          <Link
                            to={ann.linkUrl}
                            className="px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 whitespace-nowrap shrink-0"
                            style={{ borderRadius: btnRadiusCss }}
                          >
                            {ann.linkLabel}
                          </Link>
                        ))}
                    </div>
                  ))}
                </div>
              ) : (
                sec.body && <p className="text-sm opacity-85">{sec.body}</p>
              )}
            </div>
          </section>
        );
      }

      case 'hero': {
        const bgImageStyle = homepage.heroBgImage
          ? {
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.93), rgba(255,255,255,0.84)), url(${homepage.heroBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {};
        const isCentered = sec.layout === 'centered' || sec.layout === 'banner';

        return wrapSection(
          sec,
          <section
            className={`border-b border-black/10 ${sectionPyClass}`}
            style={{
              backgroundColor: sec.bgColor || design.surfaceColor,
              color: sec.textColor || design.textColor,
              ...bgImageStyle,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={
                  isCentered
                    ? 'max-w-3xl mx-auto text-center space-y-6'
                    : 'grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch'
                }
              >
                <div
                  className={
                    isCentered
                      ? 'space-y-5'
                      : 'lg:col-span-6 flex flex-col justify-center space-y-6'
                  }
                >
                  <p
                    className="text-xs font-semibold tracking-wider uppercase"
                    style={{ color: design.primaryColor }}
                  >
                    {homepage.heroEyebrow || sec.subtitle}
                  </p>
                  <h1
                    className="text-3xl sm:text-5xl font-semibold leading-[1.12] [text-wrap:balance]"
                    style={{ ...displayFontStyle, color: sec.textColor || design.textColor }}
                  >
                    {homepage.heroHeading || sec.title}
                  </h1>
                  <p className="text-base opacity-80 leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {homepage.heroSubheading || sec.body || general.tagline}
                  </p>

                  {/* Quiet commercial metadata line */}
                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-75 ${
                      isCentered ? 'justify-center' : ''
                    }`}
                  >
                    <span className="font-medium">{general.companyName}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Currency: {general.currencyCode || 'INR'} ({general.currencySymbol || '₹'})
                    </span>
                    {general.contactNumbers.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          Desk: {general.contactNumbers.join(' / ')}
                        </span>
                      </>
                    )}
                  </div>

                  <div
                    className={`flex flex-wrap items-center gap-3.5 pt-1 ${
                      isCentered ? 'justify-center' : ''
                    }`}
                  >
                    {homepage.heroPrimaryButtonText &&
                      navOrLink(
                        homepage.heroPrimaryButtonUrl || '/products',
                        homepage.heroPrimaryButtonText,
                        'inline-flex items-center gap-2 min-h-[44px] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14452F]',
                        { backgroundColor: design.primaryColor, borderRadius: btnRadiusCss },
                        true
                      )}
                    {homepage.heroSecondaryButtonText &&
                      navOrLink(
                        homepage.heroSecondaryButtonUrl || '/contact',
                        homepage.heroSecondaryButtonText,
                        'inline-flex items-center gap-2 min-h-[44px] px-6 py-3 text-sm font-medium bg-white border border-slate-300 hover:border-slate-500 transition-colors whitespace-nowrap text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]',
                        { borderRadius: btnRadiusCss }
                      )}
                  </div>
                </div>

                {!isCentered && (
                  <div className="lg:col-span-6">
                    <div
                      className="h-72 sm:h-96 lg:h-full min-h-[340px] overflow-hidden border border-black/10 bg-white"
                      style={{ borderRadius: radiusCss }}
                    >
                      <SafeImage
                        src={
                          homepage.heroBannerImage ||
                          sec.imageUrl ||
                          STUDIO_MEDIA_ASSETS.heroWarehouse
                        }
                        alt={homepage.heroHeading || general.companyName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {isCentered && (homepage.heroBannerImage || sec.imageUrl) && (
                  <div
                    className="mt-8 h-64 sm:h-80 overflow-hidden border border-black/10 bg-white"
                    style={{ borderRadius: radiusCss }}
                  >
                    <SafeImage
                      src={homepage.heroBannerImage || sec.imageUrl}
                      alt={homepage.heroHeading || general.companyName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      }

      case 'about': {
        return wrapSection(
          sec,
          <section
            className={`border-b border-black/10 ${sectionPyClass}`}
            style={{
              backgroundColor: sec.bgColor || design.backgroundColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                <div className="lg:col-span-5">
                  <div
                    className="h-72 sm:h-80 lg:h-full min-h-[280px] overflow-hidden border border-black/10 bg-white"
                    style={{ borderRadius: radiusCss }}
                  >
                    <SafeImage
                      src={
                        homepage.aboutImageUrl ||
                        sec.imageUrl ||
                        STUDIO_MEDIA_ASSETS.aboutCraftsmanship
                      }
                      alt={homepage.aboutHeading || general.companyName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: design.primaryColor }}
                  >
                    {homepage.aboutEyebrow ||
                      sec.subtitle ||
                      `Company Introduction · ${general.companyName}`}
                  </p>
                  <h2
                    className="text-3xl font-semibold [text-wrap:balance]"
                    style={displayFontStyle}
                  >
                    {homepage.aboutHeading || sec.title}
                  </h2>
                  <p className="text-base opacity-80 leading-relaxed whitespace-pre-line">
                    {homepage.aboutStory || sec.body}
                  </p>
                  <div className="pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-xs opacity-75">
                      Headquarters: {general.address}
                    </span>
                    {navOrLink(
                      sec.ctaUrl || '/about',
                      sec.ctaLabel || 'About Us & Operations',
                      'inline-flex items-center gap-2 text-sm font-semibold hover:opacity-80',
                      { color: design.primaryColor },
                      true
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }

      case 'categories': {
        const usingPlaceholderCats = categories.length === 0;
        const displayCategories = usingPlaceholderCats ? PLACEHOLDER_CATEGORIES : categories;

        return wrapSection(
          sec,
          <section
            className={`border-b border-black/10 ${sectionPyClass}`}
            style={{
              backgroundColor: sec.bgColor || design.surfaceColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: design.primaryColor }}
                  >
                    {homepage.categoriesEyebrow || 'Wholesale Lines'}
                  </p>
                  <h2 className="text-3xl font-semibold" style={displayFontStyle}>
                    {homepage.categoriesTitle || sec.title || 'Product Categories'}
                  </h2>
                  {(homepage.categoriesSubtitle || sec.subtitle) && (
                    <p className="text-sm opacity-75 max-w-2xl">
                      {homepage.categoriesSubtitle || sec.subtitle}
                    </p>
                  )}
                </div>
                {navOrLink(
                  sec.ctaUrl || '/products',
                  sec.ctaLabel || 'Explore All Grades',
                  'inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap',
                  { color: design.primaryColor },
                  true
                )}
              </div>

              {usingPlaceholderCats && (
                <div className="text-xs text-amber-900 bg-amber-50/70 border border-amber-200 px-4 py-2.5 rounded-lg">
                  Layout Preview Placeholders: Sample wholesale categories are displayed until live
                  categories are published in the database.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {displayCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 bg-white border border-black/10 flex flex-col justify-between gap-4 transition-colors hover:border-black/25"
                    style={{
                      borderRadius: radiusCss,
                    }}
                  >
                    <div className="space-y-2">
                      <Layers className="w-5 h-5" style={{ color: design.primaryColor }} />
                      <h3 className="text-base font-semibold text-slate-900">{cat.name}</h3>
                      {usingPlaceholderCats && (
                        <p className="text-[11px] font-medium text-amber-800">
                          Sample Preview · Placeholder
                        </p>
                      )}
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {cat.description || 'Commercial wholesale supply ready for dispatch.'}
                      </p>
                    </div>
                    {navOrLink(
                      usingPlaceholderCats ? '/products' : `/products?category=${cat.id}`,
                      usingPlaceholderCats ? 'Browse Catalogue' : 'View Category',
                      'inline-flex items-center gap-1 text-xs font-semibold',
                      { color: design.primaryColor },
                      true
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'featured_products': {
        const count = Math.max(1, Math.min(12, homepage.featuredProductsCount || 6));
        const usingPlaceholderProducts = !loadingProducts && products.length === 0;
        const featured = (usingPlaceholderProducts ? PLACEHOLDER_PRODUCTS : products).slice(
          0,
          count
        );
        const gridColsClass =
          sec.layout === 'grid-4'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7';

        return wrapSection(
          sec,
          <section
            className={`border-b border-black/10 ${sectionPyClass}`}
            style={{
              backgroundColor: sec.bgColor || design.backgroundColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/10 pb-6">
                <div className="space-y-1.5">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: design.primaryColor }}
                  >
                    {homepage.featuredProductsEyebrow || sec.subtitle || 'Wholesale Catalogue'}
                  </p>
                  <h2 className="text-3xl font-semibold" style={displayFontStyle}>
                    {homepage.featuredProductsTitle || sec.title || 'Featured Jute Products'}
                  </h2>
                  {homepage.featuredProductsSubtitle && (
                    <p className="text-sm opacity-75">{homepage.featuredProductsSubtitle}</p>
                  )}
                </div>
                {navOrLink(
                  sec.ctaUrl || '/products',
                  sec.ctaLabel || 'View All Products',
                  'inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 whitespace-nowrap',
                  { color: design.primaryColor },
                  true
                )}
              </div>

              {usingPlaceholderProducts && (
                <div className="text-xs text-amber-900 bg-amber-50/70 border border-amber-200 px-4 py-2.5 rounded-lg">
                  Layout Preview Placeholders: No live products have been added to Firestore yet.
                  Sample cards below illustrate the wholesale catalogue layout and automatically
                  switch to live database inventory once published.
                </div>
              )}

              {loadingProducts ? (
                <div className={gridColsClass}>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-96 border border-slate-200 bg-slate-50 animate-pulse"
                      style={{ borderRadius: radiusCss }}
                    />
                  ))}
                </div>
              ) : (
                <div className={gridColsClass}>
                  {featured.map((product) => (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      onRequestQuote={(prod) => {
                        if (!previewMode && onRequestQuote) {
                          onRequestQuote(prod);
                        } else if (previewMode) {
                          onPreviewNavigate?.(`/products/${prod.productId}`);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      }

      case 'capabilities': {
        return wrapSection(
          sec,
          <section
            className={`border-b border-black/10 ${sectionPyClass}`}
            style={{
              backgroundColor: sec.bgColor || design.surfaceColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              <div className="max-w-2xl space-y-2">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: design.primaryColor }}
                >
                  {sec.subtitle || 'Why Choose Us'}
                </p>
                <h2 className="text-3xl font-semibold [text-wrap:balance]" style={displayFontStyle}>
                  {sec.title || `Why Choose ${general.companyName}`}
                </h2>
                {sec.body && <p className="text-sm opacity-80 leading-relaxed">{sec.body}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {WHY_CHOOSE_ITEMS.map((item) => (
                  <div
                    key={item.index}
                    className="p-6 bg-white border border-black/10 space-y-3"
                    style={{ borderRadius: radiusCss }}
                  >
                    <p
                      className="font-mono-tabular text-xs font-semibold"
                      style={{ color: design.primaryColor }}
                    >
                      {item.index}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'wholesale_enquiry': {
        return wrapSection(
          sec,
          <section
            id="wholesale-enquiry"
            className={`border-b border-black/10 ${sectionPyClass}`}
            style={{
              backgroundColor: sec.bgColor || design.backgroundColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                <div className="lg:col-span-5 space-y-5">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: design.primaryColor }}
                  >
                    {sec.subtitle || 'Wholesale Enquiry Desk'}
                  </p>
                  <h2
                    className="text-3xl font-semibold [text-wrap:balance]"
                    style={displayFontStyle}
                  >
                    {sec.title || 'Request a Bulk Wholesale Quotation'}
                  </h2>
                  <p className="text-sm sm:text-base opacity-80 leading-relaxed">
                    {sec.body ||
                      'Submit your required jute specification, bale/bag quantity, and destination city. Quotations are issued in INR with current dispatch availability.'}
                  </p>
                  <div
                    className="p-5 border border-black/10 space-y-2 text-xs"
                    style={{ backgroundColor: design.surfaceColor, borderRadius: radiusCss }}
                  >
                    <p className="font-semibold text-slate-900">Trade &amp; Quotation Notes</p>
                    <p className="opacity-80 leading-relaxed">
                      Minimum Order Quantities apply per grade. Enquiries save directly to our
                      order desk and open a pre-filled WhatsApp chat when active trade numbers are
                      enabled.
                    </p>
                  </div>
                </div>

                <div
                  className="lg:col-span-7 border border-black/10 p-6 sm:p-8 bg-white text-slate-900"
                  style={{ borderRadius: radiusCss }}
                >
                  {enqSubmittedUrl ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 space-y-1.5">
                        <p className="text-sm font-semibold text-[#14452F]">
                          Wholesale enquiry submitted
                        </p>
                        <p className="text-xs text-slate-700">
                          {enqSubmittedUrl === 'SAVED_ONLY'
                            ? `Saved for ${general.companyName}. Our desk will reach out via ${general.email}.`
                            : `Routed to ${generalWa?.displayName} (${generalWa?.phoneNumber}).`}
                        </p>
                      </div>
                      {enqSubmittedUrl !== 'SAVED_ONLY' && (
                        <a
                          href={enqSubmittedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white"
                          style={{ backgroundColor: design.primaryColor, borderRadius: btnRadiusCss }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Open WhatsApp Quotation Chat
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setEnqSubmittedUrl(null);
                            setEnqDetails('');
                          }}
                          className="text-xs font-medium hover:underline"
                          style={{ color: design.primaryColor }}
                        >
                          Send another wholesale enquiry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleInlineEnquirySubmit} className="space-y-4">
                      {enqError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                          {enqError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="home-enq-name"
                            className="block text-xs font-medium text-slate-700 mb-1"
                          >
                            Your Name / Business *
                          </label>
                          <input
                            id="home-enq-name"
                            type="text"
                            required
                            disabled={previewMode}
                            value={enqName}
                            onChange={(e) => setEnqName(e.target.value)}
                            placeholder="Company or buyer name"
                            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="home-enq-phone"
                            className="block text-xs font-medium text-slate-700 mb-1"
                          >
                            Phone / WhatsApp Number
                          </label>
                          <input
                            id="home-enq-phone"
                            type="tel"
                            disabled={previewMode}
                            value={enqPhone}
                            onChange={(e) => setEnqPhone(e.target.value)}
                            placeholder="+91 98XXXXXXXX"
                            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="home-enq-location"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Delivery City / State *
                        </label>
                        <input
                          id="home-enq-location"
                          type="text"
                          required
                          disabled={previewMode}
                          value={enqLocation}
                          onChange={(e) => setEnqLocation(e.target.value)}
                          placeholder="e.g. Kolkata, Patna, Kanpur, Indore"
                          className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="home-enq-details"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Product Grades &amp; Quantities *
                        </label>
                        <textarea
                          id="home-enq-details"
                          rows={3}
                          required
                          disabled={previewMode}
                          value={enqDetails}
                          onChange={(e) => setEnqDetails(e.target.value)}
                          placeholder="Example: 500 B-Twill Gunny Sacks (907g) + 20 Rolls 10 oz Hessian Cloth"
                          className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-slate-500">
                          {generalWa
                            ? `WhatsApp desk: ${generalWa.displayName}`
                            : 'Logs enquiry directly to trade desk'}
                        </span>
                        <button
                          type="submit"
                          disabled={enqSubmitting || previewMode}
                          className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                          style={{ backgroundColor: design.primaryColor, borderRadius: btnRadiusCss }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          {enqSubmitting
                            ? 'Submitting...'
                            : sec.ctaLabel || 'Submit & Open WhatsApp'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      }

      case 'contact_section': {
        return wrapSection(
          sec,
          <section
            className={sectionPyClass}
            style={{
              backgroundColor: sec.bgColor || design.surfaceColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: design.primaryColor }}
                  >
                    {sec.subtitle || 'Contact Information'}
                  </p>
                  <h2 className="text-3xl font-semibold" style={displayFontStyle}>
                    {sec.title || 'Direct Wholesale Trade Desk'}
                  </h2>
                  {sec.body && <p className="text-sm opacity-80">{sec.body}</p>}
                </div>

                {navOrLink(
                  sec.ctaUrl || '/contact',
                  sec.ctaLabel || 'Open Contact Page',
                  'inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-xs font-semibold text-white whitespace-nowrap',
                  { backgroundColor: design.primaryColor, borderRadius: btnRadiusCss },
                  true
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
                <div
                  className="p-5 bg-white border border-black/10 space-y-2"
                  style={{ borderRadius: radiusCss }}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Phone className="w-4 h-4" style={{ color: design.primaryColor }} />
                    <span>Telephone</span>
                  </div>
                  <div className="font-mono-tabular space-y-1 text-slate-900 font-medium">
                    {general.contactNumbers.map((num, i) => (
                      <div key={`${num}-${i}`}>
                        <a href={`tel:${num}`} className="hover:underline">
                          {num}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="p-5 bg-white border border-black/10 space-y-2"
                  style={{ borderRadius: radiusCss }}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Mail className="w-4 h-4" style={{ color: design.primaryColor }} />
                    <span>Official Email</span>
                  </div>
                  <a
                    href={`mailto:${general.email}`}
                    className="block text-slate-900 font-medium break-all hover:underline"
                  >
                    {general.email}
                  </a>
                </div>

                <div
                  className="p-5 bg-white border border-black/10 space-y-2"
                  style={{ borderRadius: radiusCss }}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <MapPin className="w-4 h-4" style={{ color: design.primaryColor }} />
                    <span>Dispatch Belt</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{general.address}</p>
                </div>

                <div
                  className="p-5 bg-white border border-black/10 space-y-2"
                  style={{ borderRadius: radiusCss }}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Clock className="w-4 h-4" style={{ color: design.primaryColor }} />
                    <span>Hours &amp; Currency</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {general.businessHours || 'Mon – Sat · 9:00 AM – 7:00 PM IST'}
                  </p>
                  <p className="text-xs font-medium text-slate-900">
                    Billing: {general.currencyCode || 'INR'} ({general.currencySymbol || '₹'})
                  </p>
                </div>
              </div>
            </div>
          </section>
        );
      }

      case 'custom_banner': {
        const isSplit = sec.layout === 'split' && Boolean(sec.imageUrl);
        return wrapSection(
          sec,
          <section
            className={`border-b border-black/10 ${sectionPyClass}`}
            style={{
              backgroundColor: sec.bgColor || design.surfaceColor,
              color: sec.textColor || design.textColor,
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {isSplit ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-4">
                    {sec.subtitle && (
                      <p
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: design.primaryColor }}
                      >
                        {sec.subtitle}
                      </p>
                    )}
                    <h2
                      className="text-3xl font-semibold [text-wrap:balance]"
                      style={displayFontStyle}
                    >
                      {sec.title}
                    </h2>
                    {sec.body && (
                      <p className="text-sm sm:text-base opacity-80 leading-relaxed whitespace-pre-line">
                        {sec.body}
                      </p>
                    )}
                    {sec.ctaLabel && sec.ctaUrl && (
                      <div className="pt-2">
                        {navOrLink(
                          sec.ctaUrl,
                          sec.ctaLabel,
                          'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white',
                          { backgroundColor: design.primaryColor, borderRadius: btnRadiusCss },
                          true
                        )}
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-5">
                    <div
                      className="h-64 overflow-hidden border border-black/10 bg-white"
                      style={{ borderRadius: radiusCss }}
                    >
                      <SafeImage
                        src={sec.imageUrl}
                        alt={sec.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto text-center space-y-4">
                  {sec.subtitle && (
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: design.primaryColor }}
                    >
                      {sec.subtitle}
                    </p>
                  )}
                  <h2
                    className="text-3xl font-semibold [text-wrap:balance]"
                    style={displayFontStyle}
                  >
                    {sec.title}
                  </h2>
                  {sec.body && (
                    <p className="text-sm sm:text-base opacity-80 leading-relaxed whitespace-pre-line">
                      {sec.body}
                    </p>
                  )}
                  {sec.ctaLabel && sec.ctaUrl && (
                    <div className="pt-2">
                      {navOrLink(
                        sec.ctaUrl,
                        sec.ctaLabel,
                        'inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white',
                        { backgroundColor: design.primaryColor, borderRadius: btnRadiusCss },
                        true
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div style={designVars} className="flex-1">
      {homepage.sections.map((sec) => renderSection(sec))}
    </div>
  );
}
