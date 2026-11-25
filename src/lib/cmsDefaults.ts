import { DEFAULT_COMPANY_SETTINGS, STUDIO_MEDIA_ASSETS } from './constants';
import type {
  Announcement,
  CmsButtonStyle,
  CmsConfigDocument,
  CmsDesignSettings,
  CmsPage,
  CmsRadiusScale,
  CmsSectionConfig,
  CmsSpacingScale,
  CmsThemePreset,
  CompanySettings,
} from '../types';

export const CMS_DISPLAY_FONTS = [
  { label: 'Fraunces (Editorial Serif)', value: 'Fraunces' },
  { label: 'Playfair Display (Classic Serif)', value: 'Playfair Display' },
  { label: 'Outfit (Architectural Sans)', value: 'Outfit' },
  { label: 'Lora (Warm Trade Serif)', value: 'Lora' },
] as const;

export const CMS_BODY_FONTS = [
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Manrope', value: 'Manrope' },
  { label: 'Inter', value: 'Inter' },
] as const;

export const CMS_THEME_PRESETS: Record<
  CmsThemePreset,
  {
    label: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    headerBgColor: string;
    headerTextColor: string;
    footerBgColor: string;
    footerTextColor: string;
  }
> = {
  'corporate-emerald': {
    label: 'Corporate Emerald (Default)',
    primaryColor: '#14452F',
    secondaryColor: '#9C6B30',
    backgroundColor: '#FFFFFF',
    surfaceColor: '#F8FAF9',
    textColor: '#13221A',
    headerBgColor: '#FFFFFF',
    headerTextColor: '#13221A',
    footerBgColor: '#0E3121',
    footerTextColor: '#F1F5F9',
  },
  'warm-jute': {
    label: 'Natural Jute & Forest',
    primaryColor: '#1B4D3E',
    secondaryColor: '#B47B38',
    backgroundColor: '#FCFBF7',
    surfaceColor: '#F5EFE6',
    textColor: '#1E241E',
    headerBgColor: '#FCFBF7',
    headerTextColor: '#1E241E',
    footerBgColor: '#1C2E24',
    footerTextColor: '#F7F3EB',
  },
  'slate-mill': {
    label: 'Industrial Mill Slate',
    primaryColor: '#0F4C3A',
    secondaryColor: '#3B6E5C',
    backgroundColor: '#FFFFFF',
    surfaceColor: '#F3F6F5',
    textColor: '#0F172A',
    headerBgColor: '#FFFFFF',
    headerTextColor: '#0F172A',
    footerBgColor: '#0F172A',
    footerTextColor: '#F8FAFC',
  },
  'midnight-trade': {
    label: 'Deep Pine & Brass',
    primaryColor: '#0D3B28',
    secondaryColor: '#A16207',
    backgroundColor: '#FFFFFF',
    surfaceColor: '#F6F8F7',
    textColor: '#111827',
    headerBgColor: '#0E3121',
    headerTextColor: '#FFFFFF',
    footerBgColor: '#071D13',
    footerTextColor: '#ECFDF5',
  },
};

export function createDefaultHomepageSections(): CmsSectionConfig[] {
  return [
    {
      id: 'sec_announcements',
      type: 'announcements',
      title: 'Trade Announcements',
      subtitle: 'Seasonal dispatch notices & rate updates',
      body: '',
      imageUrl: '',
      ctaLabel: '',
      ctaUrl: '',
      visible: true,
      layout: 'banner',
      bgColor: '#14452F',
      textColor: '#FFFFFF',
    },
    {
      id: 'sec_hero',
      type: 'hero',
      title: 'Mill-direct jute fibers, hessian cloth, and heavy-duty gunny sacks.',
      subtitle: 'Wholesale Jute Supply · West Bengal, India · INR Trade',
      body: DEFAULT_COMPANY_SETTINGS.aboutSummary,
      imageUrl: STUDIO_MEDIA_ASSETS.heroWarehouse,
      ctaLabel: 'Browse Catalogue',
      ctaUrl: '/products',
      visible: true,
      layout: 'split',
      bgColor: '#F6F8F7',
      textColor: '#13221A',
    },
    {
      id: 'sec_about',
      type: 'about',
      title: 'Reliable commercial sourcing from Bengal’s jute belt.',
      subtitle: 'Company Introduction · Gazi Jute Enterprises',
      body: DEFAULT_COMPANY_SETTINGS.aboutStory,
      imageUrl: STUDIO_MEDIA_ASSETS.aboutCraftsmanship,
      ctaLabel: 'Read Company Profile',
      ctaUrl: '/about',
      visible: true,
      layout: 'split',
      bgColor: '#FFFFFF',
      textColor: '#13221A',
    },
    {
      id: 'sec_categories',
      type: 'categories',
      title: 'Product Categories',
      subtitle: 'Browse by Jute Grade & Packaging Format',
      body: 'Explore raw fiber bales, woven burlap rolls, agricultural gunny sacks, and industrial twine.',
      imageUrl: '',
      ctaLabel: 'Explore All Grades',
      ctaUrl: '/products',
      visible: true,
      layout: 'grid-4',
      bgColor: '#F6F8F7',
      textColor: '#13221A',
    },
    {
      id: 'sec_featured_products',
      type: 'featured_products',
      title: 'Featured Jute Products',
      subtitle: 'Wholesale Catalogue',
      body: 'Verified wholesale grades prepared for bulk commercial and agricultural dispatch across India.',
      imageUrl: '',
      ctaLabel: 'View All Products',
      ctaUrl: '/products',
      visible: true,
      layout: 'grid-3',
      bgColor: '#FFFFFF',
      textColor: '#13221A',
    },
    {
      id: 'sec_capabilities',
      type: 'capabilities',
      title: 'Why Choose Gazi Jute Enterprises',
      subtitle: 'Wholesale Supply Standards',
      body: 'Built for industrial buyers, agricultural mandis, and textile mills seeking consistent quality and dependable fulfillment.',
      imageUrl: '',
      ctaLabel: '',
      ctaUrl: '',
      visible: true,
      layout: 'grid-4',
      bgColor: '#F6F8F7',
      textColor: '#13221A',
    },
    {
      id: 'sec_wholesale_enquiry',
      type: 'wholesale_enquiry',
      title: 'Request a Bulk Wholesale Quotation',
      subtitle: 'Wholesale Enquiry Desk',
      body: 'Share your required jute grade, approximate quantity, and delivery city. Our trade desk responds in INR with loading schedules and WhatsApp confirmation.',
      imageUrl: '',
      ctaLabel: 'Submit & Open WhatsApp',
      ctaUrl: '/contact',
      visible: true,
      layout: 'split',
      bgColor: '#FFFFFF',
      textColor: '#13221A',
    },
    {
      id: 'sec_contact_section',
      type: 'contact_section',
      title: 'Direct Wholesale Trade Desk',
      subtitle: 'Contact Information',
      body: 'Reach our sales coordinators directly by telephone, email, or WhatsApp during commercial business hours.',
      imageUrl: '',
      ctaLabel: 'Full Contact Page',
      ctaUrl: '/contact',
      visible: true,
      layout: 'split',
      bgColor: '#F6F8F7',
      textColor: '#13221A',
    },
  ];
}

export function buildDefaultCmsConfig(companyOverride?: CompanySettings): CmsConfigDocument {
  const base = companyOverride || DEFAULT_COMPANY_SETTINGS;
  return {
    status: 'PUBLISHED',
    version: 1,
    updatedBy: 'system',
    general: {
      companyName: base.companyName,
      tagline: base.tagline,
      logoUrl: base.logoUrl,
      faviconUrl: '',
      contactNumbers: [...base.contactNumbers],
      email: base.email,
      address: base.address,
      businessHours: base.businessHours,
      gstNumber: base.gstNumber,
      currencyCode: 'INR',
      currencySymbol: '₹',
      socialLinks: {
        facebook: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        twitter: '',
      },
    },
    header: {
      visible: true,
      sticky: true,
      layout: 'standard',
      logoPosition: 'left',
      bgColor: '#FFFFFF',
      textColor: '#13221A',
      navItems: [
        { id: 'nav_home', label: 'Home', path: '/', visible: true },
        { id: 'nav_products', label: 'All Products', path: '/products', visible: true },
        { id: 'nav_about', label: 'About Us', path: '/about', visible: true },
        { id: 'nav_contact', label: 'Contact Us', path: '/contact', visible: true },
      ],
      showContactButton: true,
      contactButtonText: 'Request Quote',
      contactButtonUrl: '/contact',
    },
    homepage: {
      heroEyebrow: 'Wholesale Jute Supply · West Bengal, India',
      heroHeading: 'Mill-direct jute fibers, hessian cloth, and heavy-duty gunny sacks.',
      heroSubheading: base.aboutSummary,
      heroBgImage: '',
      heroBannerImage: STUDIO_MEDIA_ASSETS.heroWarehouse,
      heroPrimaryButtonText: 'Browse Catalogue',
      heroPrimaryButtonUrl: '/products',
      heroSecondaryButtonText: 'Request Bulk Quote',
      heroSecondaryButtonUrl: '/contact',
      featuredProductsEyebrow: 'Wholesale Catalogue',
      featuredProductsTitle: 'Featured Jute Products',
      featuredProductsSubtitle: 'Verified wholesale grades available for commercial dispatch.',
      featuredProductsCount: 6,
      categoriesEyebrow: 'Wholesale Lines',
      categoriesTitle: 'Product Categories',
      categoriesSubtitle: 'Explore raw jute bales, woven burlap, B-Twill sacks, and industrial twine.',
      aboutEyebrow: `Company Introduction · ${base.companyName}`,
      aboutHeading: 'Reliable commercial sourcing from Bengal’s jute belt.',
      aboutSummary: base.aboutSummary,
      aboutStory: base.aboutStory,
      aboutImageUrl: STUDIO_MEDIA_ASSETS.aboutCraftsmanship,
      sections: createDefaultHomepageSections(),
    },
    footer: {
      visible: true,
      companyName: base.companyName,
      logoUrl: base.logoUrl,
      description: base.aboutSummary,
      phoneNumbers: [...base.contactNumbers],
      email: base.email,
      address: base.address,
      copyrightText: base.footerCopyright,
      businessHours: base.businessHours,
      bgColor: '#0E3121',
      textColor: '#F1F5F9',
      navLinks: [
        { id: 'f_home', label: 'Home', url: '/', visible: true },
        { id: 'f_products', label: 'All Products', url: '/products', visible: true },
        { id: 'f_about', label: 'About Us', url: '/about', visible: true },
        { id: 'f_contact', label: 'Contact Us', url: '/contact', visible: true },
        { id: 'f_privacy', label: 'Privacy Policy', url: '/privacy-policy', visible: true },
        { id: 'f_terms', label: 'Terms & Conditions', url: '/terms-and-conditions', visible: true },
        { id: 'f_portal', label: 'Staff Portal Login', url: '/admin/login', visible: true },
      ],
      showSocialLinks: true,
      showWhatsAppButton: true,
    },
    design: {
      themePreset: 'corporate-emerald',
      primaryColor: '#14452F',
      secondaryColor: '#9C6B30',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F6F8F7',
      textColor: '#13221A',
      buttonStyle: 'rounded',
      displayFont: 'Fraunces',
      bodyFont: 'Plus Jakarta Sans',
      fontSizeScale: 'standard',
      borderRadius: 'lg',
      sectionSpacing: 'standard',
    },
    seo: {
      siteTitle: `${base.companyName} – Wholesale Jute Products & Bulk Supply`,
      metaDescription: base.aboutSummary,
      keywords:
        'Gazi Jute Enterprises, wholesale jute, raw jute bales, hessian cloth, B-Twill gunny sacks, jute twine, West Bengal jute supplier',
      ogImage: STUDIO_MEDIA_ASSETS.heroWarehouse,
    },
  };
}

export function mergeWithDefaultCmsConfig(
  partial: Partial<CmsConfigDocument> | null | undefined,
  companyFallback?: CompanySettings
): CmsConfigDocument {
  const defaults = buildDefaultCmsConfig(companyFallback);
  if (!partial) return defaults;

  return {
    status: partial.status || defaults.status,
    version: typeof partial.version === 'number' ? partial.version : defaults.version,
    updatedBy: partial.updatedBy || defaults.updatedBy,
    updatedAt: partial.updatedAt,
    general: {
      ...defaults.general,
      ...(partial.general || {}),
      contactNumbers: Array.isArray(partial.general?.contactNumbers)
        ? partial.general.contactNumbers
        : defaults.general.contactNumbers,
      socialLinks: {
        ...defaults.general.socialLinks,
        ...(partial.general?.socialLinks || {}),
      },
    },
    header: {
      ...defaults.header,
      ...(partial.header || {}),
      navItems:
        Array.isArray(partial.header?.navItems) && partial.header.navItems.length > 0
          ? partial.header.navItems
          : defaults.header.navItems,
    },
    homepage: {
      ...defaults.homepage,
      ...(partial.homepage || {}),
      sections:
        Array.isArray(partial.homepage?.sections) && partial.homepage.sections.length > 0
          ? partial.homepage.sections
          : defaults.homepage.sections,
    },
    footer: {
      ...defaults.footer,
      ...(partial.footer || {}),
      phoneNumbers: Array.isArray(partial.footer?.phoneNumbers)
        ? partial.footer.phoneNumbers
        : defaults.footer.phoneNumbers,
      navLinks:
        Array.isArray(partial.footer?.navLinks) && partial.footer.navLinks.length > 0
          ? partial.footer.navLinks
          : defaults.footer.navLinks,
    },
    design: {
      ...defaults.design,
      ...(partial.design || {}),
    },
    seo: {
      ...defaults.seo,
      ...(partial.seo || {}),
    },
  };
}

export function createDefaultSystemPages(company?: CompanySettings): CmsPage[] {
  const base = company || DEFAULT_COMPANY_SETTINGS;
  return [
    {
      id: 'page_about',
      pageId: 'page_about',
      slug: 'about',
      title: base.companyName,
      subtitle: base.aboutSummary,
      heroImage: STUDIO_MEDIA_ASSETS.aboutCraftsmanship,
      content: base.aboutStory,
      galleryImages: [STUDIO_MEDIA_ASSETS.heroWarehouse, STUDIO_MEDIA_ASSETS.aboutCraftsmanship],
      seoTitle: `About Us – ${base.companyName}`,
      seoDescription: base.aboutSummary,
      seoKeywords: 'Gazi Jute Enterprises, about jute supplier, Bengal jute mills',
      seoOgImage: STUDIO_MEDIA_ASSETS.aboutCraftsmanship,
      status: 'PUBLISHED',
      isSystemPage: true,
      showInNav: false,
    },
    {
      id: 'page_contact',
      pageId: 'page_contact',
      slug: 'contact',
      title: `Contact ${base.companyName}`,
      subtitle:
        'Reach our wholesale trade desk by phone, email, or direct WhatsApp enquiry for bulk quotations and dispatch availability.',
      heroImage: '',
      content:
        'Our trade team responds promptly to bulk enquiries for Tossa & White raw jute bales, Hessian burlap rolls, A-Twill & B-Twill gunny sacks, and twisted jute yarn.',
      galleryImages: [],
      seoTitle: `Contact Us – ${base.companyName}`,
      seoDescription: `Contact ${base.companyName} for wholesale jute pricing, dispatch schedules, and bulk WhatsApp enquiries.`,
      seoKeywords: 'contact Gazi Jute Enterprises, wholesale jute quote, WhatsApp enquiry',
      seoOgImage: STUDIO_MEDIA_ASSETS.heroWarehouse,
      status: 'PUBLISHED',
      isSystemPage: true,
      showInNav: false,
    },
    {
      id: 'page_privacy',
      pageId: 'page_privacy',
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      subtitle: `How ${base.companyName} collects, processes, and safeguards buyer and commercial enquiry records.`,
      heroImage: '',
      content:
        `${base.companyName} collects business contact names, telephone numbers, delivery locations, and product enquiry specifications strictly to prepare wholesale quotations, coordinate logistics, and provide customer support.\n\nWe do not sell, rent, or distribute buyer contact details to third-party marketing brokers. Enquiry records submitted through our catalogue or WhatsApp forms are stored securely in our protected database and accessed exclusively by authorized staff.\n\nBuyers may request correction or deletion of their submitted enquiry contact information at any time by emailing ${base.email} or contacting our trade desk.`,
      galleryImages: [],
      seoTitle: `Privacy Policy – ${base.companyName}`,
      seoDescription: `Privacy Policy and commercial enquiry data practices of ${base.companyName}.`,
      seoKeywords: 'privacy policy, Gazi Jute Enterprises, commercial data protection',
      seoOgImage: STUDIO_MEDIA_ASSETS.heroWarehouse,
      status: 'PUBLISHED',
      isSystemPage: true,
      showInNav: false,
    },
    {
      id: 'page_terms',
      pageId: 'page_terms',
      slug: 'terms-and-conditions',
      title: 'Terms and Conditions',
      subtitle: `Standard commercial trade, quotation validity, and dispatch terms for wholesale orders with ${base.companyName}.`,
      heroImage: '',
      content:
        `1. Quotations & Currency: All commercial wholesale quotations are issued in Indian Rupees (INR / ₹) and remain subject to final stock confirmation at the time of purchase order booking.\n\n2. Minimum Order Quantities: Wholesale dispatches adhere to product-wise minimum order quantities (MOQ) specified per bale, roll, bundle, quintal, or metric ton.\n\n3. Quality & Specifications: Natural jute fibers, hessian cloth, and gunny sacks are supplied within standard commercial GSM, moisture, and tare tolerances.\n\n4. Freight & Dispatch: Dispatch timelines depend on freight booking, mill loading schedules, and destination distance. Transit insurance and applicable GST are billed per final tax invoice.`,
      galleryImages: [],
      seoTitle: `Terms and Conditions – ${base.companyName}`,
      seoDescription: `Wholesale terms of supply, INR quotations, MOQ, and dispatch conditions for ${base.companyName}.`,
      seoKeywords: 'terms and conditions, wholesale jute supply terms, Gazi Jute Enterprises',
      seoOgImage: STUDIO_MEDIA_ASSETS.heroWarehouse,
      status: 'PUBLISHED',
      isSystemPage: true,
      showInNav: false,
    },
  ];
}

/**
 * Checks whether an announcement is currently active for a given YYYY-MM-DD date.
 */
export function isAnnouncementActiveOnDate(
  announcement: Announcement,
  todayIso?: string
): boolean {
  if (!announcement.isActive) return false;
  const today = todayIso || new Date().toISOString().slice(0, 10);
  if (announcement.startDate && today < announcement.startDate) return false;
  if (announcement.endDate && today > announcement.endDate) return false;
  return true;
}

export function getDesignCssStyle(design: CmsDesignSettings): React.CSSProperties {
  const radiusMap: Record<CmsRadiusScale, string> = {
    none: '0px',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  };
  const buttonRadiusMap: Record<CmsButtonStyle, string> = {
    sharp: '0.125rem',
    rounded: radiusMap[design.borderRadius] || '0.5rem',
    pill: '9999px',
  };
  const fontScaleMap: Record<CmsDesignSettings['fontSizeScale'], string> = {
    compact: '15px',
    standard: '16px',
    comfortable: '17px',
  };
  const spacingMap: Record<CmsSpacingScale, string> = {
    compact: '2.75rem',
    standard: '4rem',
    spacious: '5.5rem',
  };

  return {
    ['--cms-primary' as string]: design.primaryColor || '#14452F',
    ['--cms-secondary' as string]: design.secondaryColor || '#9C6B30',
    ['--cms-bg' as string]: design.backgroundColor || '#FFFFFF',
    ['--cms-surface' as string]: design.surfaceColor || '#F8FAF9',
    ['--cms-text' as string]: design.textColor || '#13221A',
    ['--cms-radius' as string]: radiusMap[design.borderRadius] || '0.75rem',
    ['--cms-btn-radius' as string]: buttonRadiusMap[design.buttonStyle] || '0.5rem',
    ['--cms-font-display' as string]: `'${design.displayFont || 'Fraunces'}', Georgia, serif`,
    ['--cms-font-body' as string]: `'${design.bodyFont || 'Plus Jakarta Sans'}', system-ui, sans-serif`,
    ['--cms-font-size' as string]: fontScaleMap[design.fontSizeScale] || '16px',
    ['--cms-section-py' as string]: spacingMap[design.sectionSpacing] || '4rem',
    fontFamily: `'${design.bodyFont || 'Plus Jakarta Sans'}', system-ui, sans-serif`,
    backgroundColor: design.backgroundColor || '#FFFFFF',
    color: design.textColor || '#13221A',
    fontSize: fontScaleMap[design.fontSizeScale] || '16px',
  };
}
