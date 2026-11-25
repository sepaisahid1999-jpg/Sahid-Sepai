import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { PageMeta } from '../components/PageMeta';
import { ProductCard } from '../components/ProductCard';
import { WhatsAppEnquiryModal } from '../components/WhatsAppEnquiryModal';
import { useCompany } from '../context/CompanyContext';
import { getDesignCssStyle } from '../lib/cmsDefaults';
import { PLACEHOLDER_CATEGORIES, PLACEHOLDER_PRODUCTS } from '../lib/previewPlaceholders';
import { subscribePublicProducts } from '../services/firestoreService';
import type { PublicProduct } from '../types';

type SortOption = 'name_asc' | 'moq_asc' | 'moq_desc';

export function ProductsPage() {
  const { settings, activeCategories, cmsConfig } = useCompany();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    () => searchParams.get('category') || 'ALL'
  );
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [quoteProduct, setQuoteProduct] = useState<PublicProduct | null>(null);

  useEffect(() => {
    const paramCat = searchParams.get('category');
    if (paramCat) {
      setSelectedCategoryId(paramCat);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsub = subscribePublicProducts((items) => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const usingPlaceholderCatalog = !loading && products.length === 0;
  const effectiveProducts = usingPlaceholderCatalog ? PLACEHOLDER_PRODUCTS : products;
  const effectiveCategories =
    activeCategories.length > 0
      ? activeCategories
      : usingPlaceholderCatalog
        ? PLACEHOLDER_CATEGORIES
        : [];

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    effectiveProducts.forEach((p) => {
      if (p.unit) set.add(p.unit);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [effectiveProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = effectiveProducts.filter((p) => {
      const matchesCat = selectedCategoryId === 'ALL' || p.categoryId === selectedCategoryId;
      if (!matchesCat) return false;
      const matchesUnit = selectedUnit === 'ALL' || p.unit === selectedUnit;
      if (!matchesUnit) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'moq_asc') return (a.minOrderQty || 0) - (b.minOrderQty || 0);
      if (sortBy === 'moq_desc') return (b.minOrderQty || 0) - (a.minOrderQty || 0);
      return a.name.localeCompare(b.name);
    });
  }, [effectiveProducts, searchQuery, selectedCategoryId, selectedUnit, sortBy]);

  const designStyle = getDesignCssStyle(cmsConfig.design);
  const displayFontStyle = {
    fontFamily: `'${cmsConfig.design.displayFont || 'Fraunces'}', Georgia, serif`,
  };

  return (
    <div className="min-h-screen flex flex-col" style={designStyle}>
      <PageMeta
        title={`All Products – ${settings.companyName}`}
        description={`Browse wholesale jute fibers, hessian cloth, gunny sacks, and twine from ${settings.companyName}.`}
        keywords={cmsConfig.seo.keywords}
        ogImage={cmsConfig.seo.ogImage}
      />
      <PublicHeader />

      <main className="flex-1 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="border-b border-slate-200 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-1.5">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: cmsConfig.design.primaryColor }}
              >
                Wholesale Product Catalogue · Currency: {cmsConfig.general.currencyCode || 'INR'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-950" style={displayFontStyle}>
                All Wholesale Jute Products
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Search by product name, SKU code, jute grade, or category and request bulk INR quotations directly on WhatsApp.
              </p>
            </div>

            {/* Search, Unit & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, SKU, or grade..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25 focus:border-[#14452F]"
                  aria-label="Search wholesale products"
                />
              </div>

              {availableUnits.length > 1 && (
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  aria-label="Filter by unit"
                  className="min-h-[44px] px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25"
                >
                  <option value="ALL">All Units</option>
                  {availableUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      Unit: {unit}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="min-h-[44px] px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25"
              >
                <option value="name_asc">Sort: Name (A–Z)</option>
                <option value="moq_asc">Sort: MOQ (Low to High)</option>
                <option value="moq_desc">Sort: MOQ (High to Low)</option>
              </select>
            </div>
          </div>

          {usingPlaceholderCatalog && (
            <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200 px-4 py-3 rounded-lg">
              Layout Preview Placeholders: Live products are not yet published in Firestore. The sample jute lines below demonstrate catalogue filtering and detail views and are replaced automatically once active products are published in Admin.
            </div>
          )}

          {/* Interactive Category Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Product categories">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('ALL')}
              className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] ${
                selectedCategoryId === 'ALL'
                  ? 'bg-[#14452F] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories ({effectiveProducts.length})
            </button>
            {effectiveCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#14452F] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-96 rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="border border-slate-200 rounded-xl bg-[#F6F8F7] p-12 text-center space-y-3">
              <h2 className="text-xl font-semibold text-slate-900" style={displayFontStyle}>
                No matching products found
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Try clearing your search term or resetting the category and unit filters.
              </p>
              {(searchQuery || selectedCategoryId !== 'ALL' || selectedUnit !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryId('ALL');
                    setSelectedUnit('ALL');
                  }}
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#14452F] rounded-lg hover:bg-[#0D3322]"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  onRequestQuote={setQuoteProduct}
                />
              ))}
            </div>
          )}
        </div>
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
