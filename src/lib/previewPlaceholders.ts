import { STUDIO_MEDIA_ASSETS } from './constants';
import type { Category, PublicProduct } from '../types';

export interface PreviewCategory extends Category {
  isPlaceholder: true;
}

export interface PreviewProduct extends PublicProduct {
  isPlaceholder: true;
}

export const PLACEHOLDER_CATEGORIES: PreviewCategory[] = [
  {
    id: 'preview_cat_raw_jute',
    name: 'Raw Jute Bales',
    slug: 'raw-jute-bales',
    description: 'Graded Tossa (TD-3/TD-4) and White (W-4) long-staple raw fiber bales for spinning mills.',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'preview_cat_hessian',
    name: 'Hessian Burlap Cloth',
    slug: 'hessian-burlap-cloth',
    description: 'Plain-weave breathable hessian rolls in 7 oz to 12 oz weights for industrial wrapping and upholstery.',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'preview_cat_gunny_sacks',
    name: 'Agricultural Gunny Sacks',
    slug: 'agricultural-gunny-sacks',
    description: 'Heavy-duty A-Twill and B-Twill sacking bags engineered for grain, sugar, potato, and pulse storage.',
    active: true,
    isPlaceholder: true,
  },
  {
    id: 'preview_cat_twine',
    name: 'Industrial Jute Twine',
    slug: 'industrial-jute-twine',
    description: 'Consistent tensile 1-ply to 5-ply twisted jute yarn and agricultural baling spools.',
    active: true,
    isPlaceholder: true,
  },
];

export const PLACEHOLDER_PRODUCTS: PreviewProduct[] = [
  {
    id: 'preview_prod_td4_bales',
    productId: 'preview_prod_td4_bales',
    sku: 'SAMPLE-TD4-BALE',
    name: 'Tossa Raw Jute Bales (TD-4 Grade)',
    categoryId: 'preview_cat_raw_jute',
    categoryName: 'Raw Jute Bales',
    description:
      'Sample layout preview item: Machine-pressed Tossa raw jute fiber bales sorted for low bark content, consistent staple strength, and standard moisture compliance.',
    unit: 'bale',
    images: [STUDIO_MEDIA_ASSETS.rawBales],
    status: 'ACTIVE',
    showStockPublicly: false,
    publicAvailableStock: 0,
    minOrderQty: 25,
    isPlaceholder: true,
  },
  {
    id: 'preview_prod_hessian_10oz',
    productId: 'preview_prod_hessian_10oz',
    sku: 'SAMPLE-HES-10OZ',
    name: 'Hessian Burlap Cloth Roll (40" / 10 oz)',
    categoryId: 'preview_cat_hessian',
    categoryName: 'Hessian Burlap Cloth',
    description:
      'Sample layout preview item: Mill-finished 40-inch wide plain-woven hessian burlap roll tailored for agricultural baling, nursery root wrap, and export packaging.',
    unit: 'roll',
    images: [STUDIO_MEDIA_ASSETS.hessianRolls],
    status: 'ACTIVE',
    showStockPublicly: false,
    publicAvailableStock: 0,
    minOrderQty: 10,
    isPlaceholder: true,
  },
  {
    id: 'preview_prod_btwill_sack',
    productId: 'preview_prod_btwill_sack',
    sku: 'SAMPLE-BTW-907G',
    name: 'B-Twill Heavy-Duty Gunny Sack (907g)',
    categoryId: 'preview_cat_gunny_sacks',
    categoryName: 'Agricultural Gunny Sacks',
    description:
      'Sample layout preview item: Reinforced double-warp B-Twill sacking bags with hemmed mouth and blue stripe identification for 50 kg and 90 kg food-grain packing.',
    unit: 'bundle',
    images: [STUDIO_MEDIA_ASSETS.gunnySacks],
    status: 'ACTIVE',
    showStockPublicly: false,
    publicAvailableStock: 0,
    minOrderQty: 5,
    isPlaceholder: true,
  },
  {
    id: 'preview_prod_twine_3ply',
    productId: 'preview_prod_twine_3ply',
    sku: 'SAMPLE-TWN-3PLY',
    name: '3-Ply Industrial Jute Twine Spools',
    categoryId: 'preview_cat_twine',
    categoryName: 'Industrial Jute Twine',
    description:
      'Sample layout preview item: Uniformly spun natural 3-ply jute twine cheeses suited for sack mouth stitching, horticulture tying, and heavy parcel bundling.',
    unit: 'kg',
    images: [STUDIO_MEDIA_ASSETS.twineSpools],
    status: 'ACTIVE',
    showStockPublicly: false,
    publicAvailableStock: 0,
    minOrderQty: 200,
    isPlaceholder: true,
  },
];

export function isPlaceholderProduct(product: PublicProduct): boolean {
  return Boolean((product as Partial<PreviewProduct>).isPlaceholder) || product.productId.startsWith('preview_prod_');
}

export function isPlaceholderCategory(category: Category): boolean {
  return Boolean((category as Partial<PreviewCategory>).isPlaceholder) || category.id.startsWith('preview_cat_');
}
