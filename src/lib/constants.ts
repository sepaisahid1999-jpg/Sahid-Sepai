import type { CompanySettings } from '../types';

export const BOOTSTRAPPED_ADMIN_EMAILS = [
  'sepaisahid1999@gmail.com',
  'gazijute91@gmail.com',
] as const;

export const SCHEMA_LIMITS = {
  ID_MAX: 128,
  NAME_MAX: 160,
  SKU_MAX: 64,
  UNIT_MAX: 32,
  CATEGORY_MAX: 80,
  DESCRIPTION_MAX: 3000,
  NOTES_MAX: 1000,
  EMAIL_MAX: 254,
  PHONE_MAX: 32,
  ADDRESS_MAX: 500,
  LOCATION_MAX: 200,
  INVOICE_MAX: 80,
  IMAGES_MAX: 8,
  URL_MAX: 1200,
  WHATSAPP_PATTERN: /^\+[1-9][0-9]{6,14}$/,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  SLUG_PATTERN: /^[a-z0-9-]+$/,
} as const;

export const STUDIO_MEDIA_ASSETS = {
  heroWarehouse: '/src/assets/images/hero_jute_warehouse_1795457329762.jpg',
  aboutCraftsmanship: '/src/assets/images/about_jute_craftsmanship_1795457331223.jpg',
  rawBales: '/src/assets/images/jute_raw_bales_1795457330960.jpg',
  hessianRolls: '/src/assets/images/jute_hessian_rolls_1795457331044.jpg',
  gunnySacks: '/src/assets/images/jute_gunny_sacks_1795457332138.jpg',
  twineSpools: '/src/assets/images/jute_twine_spools_1795457332157.jpg',
} as const;

export const STUDIO_GALLERY_CHOICES = [
  { label: 'Raw Tossa Jute Bales', url: STUDIO_MEDIA_ASSETS.rawBales },
  { label: 'Hessian Burlap Rolls', url: STUDIO_MEDIA_ASSETS.hessianRolls },
  { label: 'B-Twill Gunny Sacks', url: STUDIO_MEDIA_ASSETS.gunnySacks },
  { label: 'Multi-Ply Jute Twine & Yarn', url: STUDIO_MEDIA_ASSETS.twineSpools },
] as const;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Gazi Jute Enterprises',
  tagline: 'Wholesale Raw Jute, Hessian Cloth, Gunny Sacks & Industrial Twine',
  logoUrl: '',
  contactNumbers: ['7585841977', '7074340808'],
  email: 'gazijute91@gmail.com',
  address: 'Kolkata & South 24 Parganas Jute Belt, West Bengal, India',
  aboutSummary:
    'Gazi Jute Enterprises supplies graded raw jute fibers, woven hessian burlap rolls, B-Twill agricultural grain sacks, and multi-ply jute twine directly to mills, exporters, and wholesale buyers across India.',
  aboutStory:
    'Rooted in Bengal’s historic jute trade, Gazi Jute Enterprises bridges primary fiber grading yards with commercial packaging buyers, agricultural cooperatives, and industrial textile processors. Every dispatch is weight-verified, moisture-checked, and backed by transparent billing and responsive WhatsApp trade support.',
  footerCopyright: '© 2026 Gazi Jute Enterprises. All rights reserved.',
  businessHours: 'Monday – Saturday · 9:00 AM – 7:00 PM IST',
  gstNumber: '',
};

export const UNIT_OPTIONS = [
  'kg',
  'ton',
  'quintal',
  'piece',
  'bundle',
  'bale',
  'bag',
  'roll',
  'meter',
] as const;
