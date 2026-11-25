export type UserRole = 'ADMIN' | 'VIEWER' | 'BUYER';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserInvite {
  email: string;
  displayName: string;
  role: 'ADMIN' | 'VIEWER';
  active: boolean;
  invitedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface PublicProduct {
  id: string;
  productId: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  unit: string;
  images: string[];
  status: ProductStatus;
  showStockPublicly: boolean;
  publicAvailableStock: number;
  minOrderQty: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Product {
  id: string;
  productId: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  unit: string;
  images: string[];
  availableStock: number;
  avgPurchasePrice: number;
  avgSalePrice: number;
  totalPurchaseQty: number;
  totalSalesQty: number;
  totalPurchaseAmount: number;
  totalSalesAmount: number;
  totalCogs: number;
  currentStockValue: number;
  grossProfit: number;
  estimatedProfit: number;
  lowStockThreshold: number;
  minOrderQty: number;
  showStockPublicly: boolean;
  status: ProductStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PurchaseType =
  | 'PURCHASE'
  | 'CORRECTION'
  | 'RETURN_TO_SUPPLIER'
  | 'CANCELLATION_REVERSAL';

export type PurchasePaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'CREDIT';

export interface Purchase {
  id: string;
  purchaseId?: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  quantity: number;
  purchaseRate: number;
  freightAmount?: number;
  otherExpenses?: number;
  discount?: number;
  taxAmount?: number;
  additionalExpenses: number;
  totalAmount: number;
  paymentStatus?: PurchasePaymentStatus;
  referencePurchaseId?: string;
  notes: string;
  type: PurchaseType;
  createdBy: string;
  createdAt?: unknown;
}

export type SaleType = 'SALE' | 'CORRECTION' | 'CUSTOMER_RETURN';

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  customerId: string;
  customerName: string;
  saleDate: string;
  invoiceNumber: string;
  quantity: number;
  saleRate: number;
  discount: number;
  additionalCharges: number;
  totalAmount: number;
  costOfGoodsSold: number;
  grossProfit: number;
  notes: string;
  type: SaleType;
  createdBy: string;
  createdAt?: unknown;
}

export type StockTxType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'PURCHASE_CORRECTION'
  | 'PURCHASE_REVERSAL'
  | 'SALE_RETURN'
  | 'SALE_CANCELLATION';

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  txType: StockTxType;
  referenceId: string;
  txDate: string;
  quantityDelta: number;
  unitRate: number;
  totalValue: number;
  resultingStock: number;
  resultingAvgPurchasePrice: number;
  notes: string;
  createdBy: string;
  createdAt?: unknown;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
  email: string;
  gstNumber: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type EnquiryStatus = 'NEW' | 'PENDING' | 'CONTACTED' | 'COMPLETED' | 'CANCELLED';

export interface Enquiry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  buyerName: string;
  buyerPhone: string;
  buyerLocation: string;
  message: string;
  whatsappNumberUsed: string;
  enquiryType: 'PRODUCT' | 'GENERAL';
  status: EnquiryStatus;
  adminNotes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  contactNumbers: string[];
  email: string;
  address: string;
  aboutSummary: string;
  aboutStory: string;
  footerCopyright: string;
  businessHours: string;
  gstNumber: string;
  updatedAt?: unknown;
}

export interface WhatsAppNumber {
  id: string;
  displayName: string;
  phoneNumber: string;
  isActive: boolean;
  isDefault: boolean;
  receivesProductEnquiries: boolean;
  receivesGeneralEnquiries: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DateFilterPreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

// ---------------------------------------------------------------------------
// Website CMS & Visual Editor Types
// ---------------------------------------------------------------------------

export interface SocialLinks {
  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  twitter: string;
}

export interface CmsGeneralSettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  contactNumbers: string[];
  email: string;
  address: string;
  businessHours: string;
  gstNumber: string;
  currencyCode: string;
  currencySymbol: string;
  socialLinks: SocialLinks;
}

export interface CmsNavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
}

export type CmsLogoPosition = 'left' | 'center' | 'right';
export type CmsHeaderLayout = 'standard' | 'centered' | 'compact';

export interface CmsHeaderSettings {
  visible: boolean;
  sticky: boolean;
  layout: CmsHeaderLayout;
  logoPosition: CmsLogoPosition;
  bgColor: string;
  textColor: string;
  navItems: CmsNavItem[];
  showContactButton: boolean;
  contactButtonText: string;
  contactButtonUrl: string;
}

export type CmsHomepageSectionType =
  | 'announcements'
  | 'hero'
  | 'capabilities'
  | 'featured_products'
  | 'categories'
  | 'about'
  | 'wholesale_enquiry'
  | 'contact_section'
  | 'custom_banner';

export type CmsSectionLayout = 'split' | 'centered' | 'banner' | 'grid-3' | 'grid-4';

export interface CmsSectionConfig {
  id: string;
  type: CmsHomepageSectionType;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  visible: boolean;
  layout: CmsSectionLayout;
  bgColor: string;
  textColor: string;
}

export interface CmsHomepageSettings {
  heroEyebrow: string;
  heroHeading: string;
  heroSubheading: string;
  heroBgImage: string;
  heroBannerImage: string;
  heroPrimaryButtonText: string;
  heroPrimaryButtonUrl: string;
  heroSecondaryButtonText: string;
  heroSecondaryButtonUrl: string;
  featuredProductsEyebrow: string;
  featuredProductsTitle: string;
  featuredProductsSubtitle: string;
  featuredProductsCount: number;
  categoriesEyebrow: string;
  categoriesTitle: string;
  categoriesSubtitle: string;
  aboutEyebrow: string;
  aboutHeading: string;
  aboutSummary: string;
  aboutStory: string;
  aboutImageUrl: string;
  sections: CmsSectionConfig[];
}

export interface CmsFooterLink {
  id: string;
  label: string;
  url: string;
  visible: boolean;
}

export interface CmsFooterSettings {
  visible: boolean;
  companyName: string;
  logoUrl: string;
  description: string;
  phoneNumbers: string[];
  email: string;
  address: string;
  copyrightText: string;
  businessHours: string;
  bgColor: string;
  textColor: string;
  navLinks: CmsFooterLink[];
  showSocialLinks: boolean;
  showWhatsAppButton: boolean;
}

export type CmsThemePreset =
  | 'corporate-emerald'
  | 'warm-jute'
  | 'slate-mill'
  | 'midnight-trade';

export type CmsButtonStyle = 'rounded' | 'pill' | 'sharp';
export type CmsFontScale = 'compact' | 'standard' | 'comfortable';
export type CmsRadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CmsSpacingScale = 'compact' | 'standard' | 'spacious';

export interface CmsDesignSettings {
  themePreset: CmsThemePreset;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  buttonStyle: CmsButtonStyle;
  displayFont: string;
  bodyFont: string;
  fontSizeScale: CmsFontScale;
  borderRadius: CmsRadiusScale;
  sectionSpacing: CmsSpacingScale;
}

export interface CmsSeoSettings {
  siteTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
}

export type CmsConfigStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

export interface CmsConfigDocument {
  status: CmsConfigStatus;
  version: number;
  general: CmsGeneralSettings;
  header: CmsHeaderSettings;
  homepage: CmsHomepageSettings;
  footer: CmsFooterSettings;
  design: CmsDesignSettings;
  seo: CmsSeoSettings;
  updatedBy: string;
  updatedAt?: unknown;
}

export type CmsRevisionAction = 'PUBLISHED' | 'DRAFT_SAVED' | 'UNPUBLISHED' | 'RESTORED';

export interface CmsRevision {
  id: string;
  version: number;
  action: CmsRevisionAction;
  note: string;
  savedBy: string;
  savedByEmail: string;
  snapshot: Omit<CmsConfigDocument, 'updatedAt'>;
  createdAt?: unknown;
}

export type CmsPageStatus = 'DRAFT' | 'PUBLISHED';

export interface CmsPage {
  id: string;
  pageId: string;
  slug: string;
  title: string;
  subtitle: string;
  heroImage: string;
  content: string;
  galleryImages: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoOgImage: string;
  status: CmsPageStatus;
  isSystemPage: boolean;
  showInNav: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  linkLabel: string;
  linkUrl: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorUid: string;
  actorEmail: string;
  actorName: string;
  createdAt?: unknown;
}


