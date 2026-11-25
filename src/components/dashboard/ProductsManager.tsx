import React, { useMemo, useRef, useState } from 'react';
import {
  Archive,
  Check,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { SafeImage } from '../SafeImage';
import { formatINR, formatNumber } from '../../lib/accounting';
import { SCHEMA_LIMITS, STUDIO_GALLERY_CHOICES, UNIT_OPTIONS } from '../../lib/constants';
import {
  canHardDeleteProduct,
  isSafeImageUrl,
  validateCategoryInput,
  validateImageFile,
  validateProductInput,
  type ProductHistoryCounts,
  type ProductValidationInput,
} from '../../lib/productValidation';
import { exportRowsToCSV, exportRowsToExcel, mapProductStockForExport } from '../../lib/reports';
import {
  archiveProduct,
  checkProductHasTransactionHistory,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  restoreProduct,
  updateCategory,
  updateProductDetails,
  uploadImageToStorage,
} from '../../services/firestoreService';
import type {
  Category,
  Product,
  ProductStatus,
  Purchase,
  Sale,
  StockTransaction,
} from '../../types';
import { ProductPreviewModal } from './ProductPreviewModal';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface ProductsManagerProps {
  products: Product[];
  categories: Category[];
  purchases?: Purchase[];
  sales?: Sale[];
  transactions?: StockTransaction[];
}

type SortKey =
  | 'name'
  | 'sku'
  | 'category'
  | 'moq'
  | 'stock'
  | 'avgPurchase'
  | 'avgSale'
  | 'value'
  | 'status';

type StatusFilter = 'ALL' | 'NON_ARCHIVED' | ProductStatus;
type StockHealthFilter = 'ALL' | 'HEALTHY' | 'LOW' | 'OUT';

export function ProductsManager({
  products,
  categories,
  purchases = [],
  sales = [],
  transactions = [],
}: ProductsManagerProps) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [stockFilter, setStockFilter] = useState<StockHealthFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Archive / Delete confirmation modal state
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);
  const [deleteHistoryCounts, setDeleteHistoryCounts] = useState<ProductHistoryCounts | null>(
    null
  );
  const [archiveReason, setArchiveReason] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Restore confirmation
  const [restoreCandidate, setRestoreCandidate] = useState<Product | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Quick Category Drawer state
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catBusy, setCatBusy] = useState(false);
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [editingQuickCatId, setEditingQuickCatId] = useState<string | null>(null);
  const [editQuickCatName, setEditQuickCatName] = useState('');
  const [editQuickCatDesc, setEditQuickCatDesc] = useState('');
  const [editQuickCatActive, setEditQuickCatActive] = useState(true);

  // Product Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState<string>('kg');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('50');
  const [minOrderQty, setMinOrderQty] = useState('10');
  const [showStockPublicly, setShowStockPublicly] = useState(true);
  const [status, setStatus] = useState<ProductStatus>('ACTIVE');
  const [uploading, setUploading] = useState(false);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProductValidationInput, string>>
  >({});

  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const pendingReplaceIndexRef = useRef<number | null>(null);

  const historyCountMap = useMemo(() => {
    const map: Record<string, { purchases: number; sales: number; transactions: number }> = {};
    const ensure = (pid: string) => {
      if (!map[pid]) map[pid] = { purchases: 0, sales: 0, transactions: 0 };
      return map[pid];
    };
    for (const pur of purchases) ensure(pur.productId).purchases += 1;
    for (const s of sales) ensure(s.productId).sales += 1;
    for (const t of transactions) ensure(t.productId).transactions += 1;
    return map;
  }, [purchases, sales, transactions]);

  const productCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.categoryId] = (map[p.categoryId] || 0) + 1;
    }
    return map;
  }, [products]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(
        key === 'name' || key === 'sku' || key === 'category' || key === 'status' ? 'asc' : 'desc'
      );
    }
    setPage(1);
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (catFilter !== 'ALL' && p.categoryId !== catFilter) return false;
      if (statusFilter === 'NON_ARCHIVED' && p.status === 'ARCHIVED') return false;
      if (
        statusFilter !== 'ALL' &&
        statusFilter !== 'NON_ARCHIVED' &&
        p.status !== statusFilter
      ) {
        return false;
      }
      if (stockFilter === 'OUT' && p.availableStock > 0) return false;
      if (
        stockFilter === 'LOW' &&
        !(p.availableStock > 0 && p.availableStock <= p.lowStockThreshold)
      ) {
        return false;
      }
      if (stockFilter === 'HEALTHY' && p.availableStock <= p.lowStockThreshold) return false;

      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.productId.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'sku') cmp = a.sku.localeCompare(b.sku);
      else if (sortKey === 'category') cmp = a.categoryName.localeCompare(b.categoryName);
      else if (sortKey === 'moq') cmp = (a.minOrderQty || 1) - (b.minOrderQty || 1);
      else if (sortKey === 'stock') cmp = a.availableStock - b.availableStock;
      else if (sortKey === 'avgPurchase') cmp = a.avgPurchasePrice - b.avgPurchasePrice;
      else if (sortKey === 'avgSale') cmp = a.avgSalePrice - b.avgSalePrice;
      else if (sortKey === 'value') cmp = a.currentStockValue - b.currentStockValue;
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, search, catFilter, statusFilter, stockFilter, sortKey, sortDir]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const countsSummary = useMemo(() => {
    const active = products.filter((p) => p.status === 'ACTIVE').length;
    const inactive = products.filter((p) => p.status === 'INACTIVE').length;
    const archived = products.filter((p) => p.status === 'ARCHIVED').length;
    const lowStock = products.filter(
      (p) => p.status !== 'ARCHIVED' && p.availableStock <= p.lowStockThreshold
    ).length;
    return { active, inactive, archived, lowStock };
  }, [products]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setCategoryId(categories.find((c) => c.active)?.id || categories[0]?.id || '');
    setUnit('kg');
    setDescription('');
    setImages([]);
    setImageUrlInput('');
    setLowStockThreshold('50');
    setMinOrderQty('10');
    setShowStockPublicly(true);
    setStatus('ACTIVE');
    setFormError(null);
    setFieldErrors({});
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategoryId(p.categoryId);
    setUnit(p.unit);
    setDescription(p.description);
    setImages(p.images || []);
    setImageUrlInput('');
    setLowStockThreshold(String(p.lowStockThreshold));
    setMinOrderQty(String(p.minOrderQty || 1));
    setShowStockPublicly(p.showStockPublicly);
    setStatus(p.status);
    setFormError(null);
    setFieldErrors({});
    setShowProductModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFormError(null);

    const remainingSlots = SCHEMA_LIMITS.IMAGES_MAX - images.length;
    if (remainingSlots <= 0) {
      setFormError(`Maximum ${SCHEMA_LIMITS.IMAGES_MAX} images allowed per product.`);
      e.target.value = '';
      return;
    }

    const candidates = files.slice(0, remainingSlots);
    for (const file of candidates) {
      const check = validateImageFile(file);
      if (!check.valid) {
        setFormError(check.error || 'Invalid image file.');
        e.target.value = '';
        return;
      }
    }

    setUploading(true);
    try {
      const folder = `products/${editingProduct?.productId || 'catalog'}`;
      const uploadedUrls: string[] = [];
      for (const file of candidates) {
        const url = await uploadImageToStorage(file, folder);
        uploadedUrls.push(url);
      }
      setImages((prev) => [...prev, ...uploadedUrls].slice(0, SCHEMA_LIMITS.IMAGES_MAX));
    } catch (err) {
      setFormError(
        err instanceof Error
          ? `Storage upload error (${err.message}). Verify Firebase Storage permissions or paste a valid image URL below.`
          : 'Image upload failed.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const triggerReplaceImage = (idx: number) => {
    pendingReplaceIndexRef.current = idx;
    replaceInputRef.current?.click();
  };

  const handleReplaceImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetIdx = pendingReplaceIndexRef.current;
    e.target.value = '';
    pendingReplaceIndexRef.current = null;
    if (!file || targetIdx === null) return;

    setFormError(null);
    const check = validateImageFile(file);
    if (!check.valid) {
      setFormError(check.error || 'Invalid replacement image file.');
      return;
    }

    setReplacingIdx(targetIdx);
    try {
      const folder = `products/${editingProduct?.productId || 'catalog'}`;
      const newUrl = await uploadImageToStorage(file, folder);
      setImages((prev) => prev.map((existing, i) => (i === targetIdx ? newUrl : existing)));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Image replacement failed.');
    } finally {
      setReplacingIdx(null);
    }
  };

  const handleAddImageUrl = () => {
    const candidate = imageUrlInput.trim();
    if (!candidate) return;
    if (images.length >= SCHEMA_LIMITS.IMAGES_MAX) {
      setFormError(`Maximum ${SCHEMA_LIMITS.IMAGES_MAX} images allowed per product.`);
      return;
    }
    if (!isSafeImageUrl(candidate)) {
      setFormError('Image URL must start with https://, http://, or /.');
      return;
    }
    setFormError(null);
    setImages((prev) => [...prev, candidate]);
    setImageUrlInput('');
  };

  const handleMakePrimaryImage = (idx: number) => {
    if (idx <= 0 || idx >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(idx, 1);
      return [chosen, ...next];
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setActionSuccess(null);

    const cat = categories.find((c) => c.id === categoryId);
    const validation = validateProductInput(
      {
        sku,
        name,
        categoryId: cat?.id || '',
        description,
        unit,
        images,
        lowStockThreshold,
        minOrderQty,
        status,
      },
      products,
      editingProduct?.productId
    );

    if (!validation.valid || !cat) {
      setFieldErrors(validation.fieldErrors);
      setFormError(validation.errors[0] || 'Please fix the highlighted product fields.');
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await updateProductDetails(editingProduct.productId, {
          sku: sku.trim(),
          name: name.trim(),
          categoryId: cat.id,
          categoryName: cat.name,
          description: description.trim(),
          unit,
          images,
          lowStockThreshold: Number(lowStockThreshold) || 0,
          minOrderQty: Math.max(1, Number(minOrderQty) || 1),
          showStockPublicly,
          status,
          availableStock: editingProduct.availableStock,
        });
        setActionSuccess(`Updated product "${name.trim()}" (${sku.trim().toUpperCase()}).`);
      } else {
        await createProduct({
          sku: sku.trim(),
          name: name.trim(),
          categoryId: cat.id,
          categoryName: cat.name,
          description: description.trim(),
          unit,
          images,
          lowStockThreshold: Number(lowStockThreshold) || 0,
          minOrderQty: Math.max(1, Number(minOrderQty) || 1),
          showStockPublicly,
          status,
        });
        setActionSuccess(`Created product "${name.trim()}" (${sku.trim().toUpperCase()}).`);
      }
      setShowProductModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  const openArchiveOrDeleteModal = async (p: Product) => {
    setActionError(null);
    setActionSuccess(null);
    setArchiveReason('');
    setDeleteCandidate(p);

    const localCounts = historyCountMap[p.productId] || {
      purchases: 0,
      sales: 0,
      transactions: 0,
    };
    setDeleteHistoryCounts({
      purchasesCount: localCounts.purchases,
      salesCount: localCounts.sales,
      stockTransactionsCount: localCounts.transactions,
      totalPurchaseQty: p.totalPurchaseQty,
      totalSalesQty: p.totalSalesQty,
    });

    setDeleteCheckLoading(true);
    try {
      const liveCounts = await checkProductHasTransactionHistory(p.productId);
      setDeleteHistoryCounts(liveCounts);
    } catch {
      // Keep local counts if live check encounters transient error
    } finally {
      setDeleteCheckLoading(false);
    }
  };

  const handleArchiveProductConfirmed = async () => {
    if (!deleteCandidate) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await archiveProduct(deleteCandidate.productId, archiveReason);
      setActionSuccess(
        `Archived "${deleteCandidate.name}" (${deleteCandidate.sku}). Historical records are preserved and public visibility is disabled.`
      );
      setDeleteCandidate(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to archive product.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handlePermanentDeleteConfirmed = async () => {
    if (!deleteCandidate) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteProduct(deleteCandidate.productId);
      setActionSuccess(
        `Permanently deleted "${deleteCandidate.name}" (${deleteCandidate.sku}).`
      );
      setDeleteCandidate(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete product.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleRestoreConfirmed = async () => {
    if (!restoreCandidate) return;
    setActionError(null);
    setRestoreBusy(true);
    try {
      await restoreProduct(restoreCandidate.productId, 'INACTIVE');
      setActionSuccess(
        `Restored "${restoreCandidate.name}" (${restoreCandidate.sku}) to INACTIVE status. Edit it to publish publicly when ready.`
      );
      setRestoreCandidate(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to restore product.');
    } finally {
      setRestoreBusy(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError(null);
    const check = validateCategoryInput(
      { name: newCatName, description: newCatDesc },
      categories
    );
    if (!check.valid) {
      setCatFormError(check.errors[0] || 'Invalid category name.');
      return;
    }
    setCatBusy(true);
    try {
      const createdId = await createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        active: true,
      });
      if (!categoryId) setCategoryId(createdId);
      setNewCatName('');
      setNewCatDesc('');
      setActionSuccess(`Category "${newCatName.trim()}" added.`);
    } catch (err) {
      setCatFormError(err instanceof Error ? err.message : 'Unable to create category.');
    } finally {
      setCatBusy(false);
    }
  };

  const startQuickEditCategory = (cat: Category) => {
    setEditingQuickCatId(cat.id);
    setEditQuickCatName(cat.name);
    setEditQuickCatDesc(cat.description || '');
    setEditQuickCatActive(cat.active);
    setCatFormError(null);
  };

  const handleSaveQuickEditCategory = async (catId: string) => {
    setCatFormError(null);
    const check = validateCategoryInput(
      { name: editQuickCatName, description: editQuickCatDesc },
      categories,
      catId
    );
    if (!check.valid) {
      setCatFormError(check.errors[0] || 'Invalid category name.');
      return;
    }
    setCatBusy(true);
    try {
      await updateCategory(catId, {
        name: editQuickCatName.trim(),
        description: editQuickCatDesc.trim(),
        active: editQuickCatActive,
      });
      setEditingQuickCatId(null);
      setActionSuccess(`Updated category "${editQuickCatName.trim()}".`);
    } catch (err) {
      setCatFormError(err instanceof Error ? err.message : 'Unable to update category.');
    } finally {
      setCatBusy(false);
    }
  };

  const handleDeleteCategoryConfirmed = async () => {
    if (!confirmDeleteCat) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteCategory(confirmDeleteCat.id);
      setActionSuccess(`Deleted category "${confirmDeleteCat.name}".`);
      setConfirmDeleteCat(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete category.');
      setConfirmDeleteCat(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const deleteEligibility = deleteHistoryCounts
    ? canHardDeleteProduct(deleteHistoryCounts)
    : { allowed: false, totalReferences: 0 };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-[#ECF4EF] border border-[#14452F]/20 text-xs text-[#14452F] font-medium flex items-center justify-between gap-3">
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Active Public SKUs</p>
          <p className="text-xl font-semibold text-[#14452F] font-mono-tabular mt-1">
            {formatNumber(countsSummary.active, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Inactive (Hidden)</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {formatNumber(countsSummary.inactive, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Archived (Protected)</p>
          <p className="text-xl font-semibold text-amber-700 font-mono-tabular mt-1">
            {formatNumber(countsSummary.archived, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Low / Out of Stock</p>
          <p className="text-xl font-semibold text-red-700 font-mono-tabular mt-1">
            {formatNumber(countsSummary.lowStock, 0)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[210px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product name, SKU, or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            aria-label="Filter by category"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="NON_ARCHIVED">Active &amp; Inactive</option>
            <option value="ACTIVE">ACTIVE (Public)</option>
            <option value="INACTIVE">INACTIVE (Hidden)</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value as StockHealthFilter);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            aria-label="Filter by stock health"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="HEALTHY">Healthy Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportRowsToCSV(
                mapProductStockForExport(filteredProducts),
                `gazi-jute-products-${dateSuffix}`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() =>
              exportRowsToExcel(
                mapProductStockForExport(filteredProducts),
                'Products',
                `gazi-jute-products-${dateSuffix}`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            XLSX
          </button>
          <button
            type="button"
            onClick={() => setShowCategoryPanel((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
          >
            Quick Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Quick Category Add & Edit Drawer */}
      {showCategoryPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Quick Category Manager</h3>
              <p className="text-[11px] text-slate-500">
                Add, rename, or toggle category visibility. Renaming updates linked products automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCategoryPanel(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>

          {catFormError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {catFormError}
            </div>
          )}

          <form onSubmit={handleAddCategory} className="flex flex-wrap gap-3">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category name (e.g. Hessian Cloth)"
              className="flex-1 min-w-[180px] px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Short description (optional)"
              className="flex-1 min-w-[200px] px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={catBusy}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14452F] rounded-lg hover:bg-[#0D3322] disabled:opacity-50"
            >
              {catBusy ? 'Saving...' : 'Add Category'}
            </button>
          </form>

          {categories.length > 0 && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {categories.map((cat) => {
                const isEditing = editingQuickCatId === cat.id;
                const assignedCount = productCountByCategory[cat.id] || 0;
                return (
                  <div key={cat.id} className="py-2.5 text-xs">
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editQuickCatName}
                          onChange={(e) => setEditQuickCatName(e.target.value)}
                          className="flex-1 min-w-[150px] px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          placeholder="Category name"
                        />
                        <input
                          type="text"
                          value={editQuickCatDesc}
                          onChange={(e) => setEditQuickCatDesc(e.target.value)}
                          className="flex-1 min-w-[180px] px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          placeholder="Description"
                        />
                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 px-2">
                          <input
                            type="checkbox"
                            checked={editQuickCatActive}
                            onChange={(e) => setEditQuickCatActive(e.target.checked)}
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          disabled={catBusy}
                          onClick={() => void handleSaveQuickEditCategory(cat.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#14452F] text-white rounded-lg font-medium"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingQuickCatId(null)}
                          className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-900">{cat.name}</span>
                          <span className="text-[11px] font-mono-tabular text-slate-400 ml-2">
                            ({assignedCount} SKUs)
                          </span>
                          {cat.description && (
                            <span className="text-slate-500 ml-2">· {cat.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              void updateCategory(cat.id, {
                                name: cat.name,
                                description: cat.description,
                                active: !cat.active,
                              }).catch((err) =>
                                setActionError(err instanceof Error ? err.message : 'Update failed.')
                              )
                            }
                            className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                              cat.active
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cat.active ? 'Active' : 'Hidden'}
                          </button>
                          <button
                            type="button"
                            onClick={() => startQuickEditCategory(cat)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                            aria-label={`Edit ${cat.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCat(cat)}
                            className="p-1.5 text-slate-400 hover:text-red-700 rounded hover:bg-red-50"
                            aria-label={`Delete ${cat.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">
              {products.length === 0 ? 'No products created yet' : 'No matching products'}
            </p>
            <p className="text-xs text-slate-500">
              {products.length === 0
                ? 'Add your first wholesale jute product, then record a Stock In purchase to update stock and weighted average cost.'
                : 'Try adjusting your search, category, status, or stock filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <SortableHeader
                      label="Product"
                      sortKey="name"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableHeader
                      label="SKU"
                      sortKey="sku"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Category"
                      sortKey="category"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="MOQ"
                      sortKey="moq"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Current Stock"
                      sortKey="stock"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Avg Purchase"
                      sortKey="avgPurchase"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Avg Sale"
                      sortKey="avgSale"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Stock Value"
                      sortKey="value"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Status / Public"
                      sortKey="status"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="center"
                    />
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedProducts.map((p) => {
                    const isLowStock =
                      p.status !== 'ARCHIVED' && p.availableStock <= p.lowStockThreshold;
                    const localCounts = historyCountMap[p.productId] || {
                      purchases: 0,
                      sales: 0,
                      transactions: 0,
                    };
                    const hasHistory =
                      localCounts.purchases > 0 ||
                      localCounts.sales > 0 ||
                      localCounts.transactions > 0 ||
                      p.totalPurchaseQty > 0 ||
                      p.totalSalesQty > 0;

                    return (
                      <tr
                        key={p.productId}
                        className={`hover:bg-slate-50/70 ${
                          p.status === 'ARCHIVED' ? 'bg-slate-50/50 opacity-80' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                              <SafeImage
                                src={p.images[0]}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setPreviewProduct(p)}
                                className="font-semibold text-slate-900 hover:text-[#14452F] text-left truncate block max-w-[200px]"
                              >
                                {p.name}
                              </button>
                              <p className="text-[11px] font-mono-tabular text-slate-400 truncate max-w-[200px]">
                                ID: {p.productId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono-tabular font-medium text-slate-800 whitespace-nowrap">
                          {p.sku}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{p.categoryName}</td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                          {formatNumber(p.minOrderQty || 1)} {p.unit}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                            isLowStock ? 'text-amber-700' : 'text-slate-900'
                          }`}
                        >
                          <span>
                            {formatNumber(p.availableStock)} {p.unit}
                          </span>
                          <span className="block text-[10px] font-normal text-slate-400">
                            Alert ≤ {formatNumber(p.lowStockThreshold)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                          {formatINR(p.avgPurchasePrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                          {formatINR(p.avgSalePrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular text-slate-900 whitespace-nowrap">
                          {formatINR(p.currentStockValue)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                p.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : p.status === 'ARCHIVED'
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {p.status}
                            </span>
                            <span
                              title={
                                p.showStockPublicly
                                  ? 'Stock count visible publicly when ACTIVE'
                                  : 'Stock count hidden from public'
                              }
                              className="inline-flex items-center gap-1 text-[10px] text-slate-500"
                            >
                              {p.showStockPublicly ? (
                                <>
                                  <Eye className="w-3 h-3 text-[#14452F]" />
                                  Stock Public
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-slate-400" />
                                  Stock Hidden
                                </>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewProduct(p)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-[#14452F]"
                              title="Preview Product Details"
                              aria-label={`Preview ${p.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                              title="Edit Product"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {p.status === 'ARCHIVED' ? (
                              <button
                                type="button"
                                onClick={() => setRestoreCandidate(p)}
                                className="p-1.5 rounded-lg text-[#14452F] hover:bg-[#ECF4EF]"
                                title="Restore Archived Product"
                                aria-label={`Restore ${p.name}`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void openArchiveOrDeleteModal(p)}
                                className={`p-1.5 rounded-lg ${
                                  hasHistory
                                    ? 'text-amber-700 hover:bg-amber-50'
                                    : 'text-slate-500 hover:bg-red-50 hover:text-red-700'
                                }`}
                                title={
                                  hasHistory
                                    ? 'Archive Product (Historical Records Protected)'
                                    : 'Archive or Delete Product'
                                }
                                aria-label={`Archive or delete ${p.name}`}
                              >
                                {hasHistory ? (
                                  <Archive className="w-3.5 h-3.5" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={filteredProducts.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-xl font-semibold text-slate-900">
                  {editingProduct ? `Edit Product — ${editingProduct.sku}` : 'Add New Product'}
                </h3>
                <p className="text-[11px] font-mono-tabular text-slate-500 mt-0.5">
                  {editingProduct
                    ? `Unique Product ID: ${editingProduct.productId}`
                    : 'A unique Product ID will be assigned automatically upon creation.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800"
                aria-label="Close product modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingProduct && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Current Stock</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {formatNumber(editingProduct.availableStock)} {editingProduct.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Avg Purchase Price</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {formatINR(editingProduct.avgPurchasePrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Avg Sale Price</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    {formatINR(editingProduct.avgSalePrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Ledger Stock Value</span>
                  <span className="font-mono-tabular font-semibold text-[#14452F]">
                    {formatINR(editingProduct.currentStockValue)}
                  </span>
                </div>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    SKU / Product Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. GJE-HC-300"
                    className={`w-full px-3 py-2 text-sm border rounded-lg font-mono-tabular uppercase ${
                      fieldErrors.sku ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.sku && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.sku}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Premium Hessian Burlap Roll (300 GSM)"
                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                      fieldErrors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white ${
                      fieldErrors.categoryId ? 'border-red-400' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {!c.active ? '(Hidden)' : ''}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.categoryId && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.categoryId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Supply Unit *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white ${
                      fieldErrors.unit ? 'border-red-400' : 'border-slate-300'
                    }`}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.unit && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.unit}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Public Display &amp; Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProductStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ACTIVE">ACTIVE (Publicly Displayed)</option>
                    <option value="INACTIVE">INACTIVE (Hidden from Public)</option>
                    {editingProduct?.status === 'ARCHIVED' && (
                      <option value="ARCHIVED">ARCHIVED (Historical Read-Only)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description &amp; Specifications
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Grade, GSM, dimensions, moisture standard, bale packaging..."
                  className={`w-full px-3 py-2 text-sm border rounded-lg ${
                    fieldErrors.description ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.description && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Low Stock Threshold *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg tabular-nums ${
                      fieldErrors.lowStockThreshold ? 'border-red-400' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.lowStockThreshold && (
                    <p className="text-[11px] text-red-600 mt-1">
                      {fieldErrors.lowStockThreshold}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Minimum Order Qty (MOQ) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg tabular-nums ${
                      fieldErrors.minOrderQty ? 'border-red-400' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.minOrderQty && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.minOrderQty}</p>
                  )}
                </div>
                <label className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStockPublicly}
                    onChange={(e) => setShowStockPublicly(e.target.checked)}
                    className="rounded border-slate-300 text-[#14452F] focus:ring-[#14452F]"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Public Stock Visibility
                  </span>
                </label>
              </div>

              {/* Hidden single-slot replacement file input */}
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={handleReplaceImageFile}
                className="hidden"
              />

              {/* Multi-Image Upload & Replacement Manager */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 block">
                      Multiple Product Images ({images.length}/{SCHEMA_LIMITS.IMAGES_MAX})
                    </label>
                    <span className="text-[11px] text-slate-500">
                      JPG, PNG, WebP, GIF or AVIF up to 5 MB each. First image is the catalogue cover.
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#14452F] bg-[#ECF4EF] hover:bg-[#DCECE3] rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Uploading...' : 'Upload Images'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      multiple
                      disabled={uploading || images.length >= SCHEMA_LIMITS.IMAGES_MAX}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Or paste https:// image URL..."
                    className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Add URL
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-500 self-center mr-1">
                    Studio Jute Photos:
                  </span>
                  {STUDIO_GALLERY_CHOICES.map((choice) => (
                    <button
                      key={choice.url}
                      type="button"
                      onClick={() => {
                        if (
                          images.length < SCHEMA_LIMITS.IMAGES_MAX &&
                          !images.includes(choice.url)
                        ) {
                          setImages((prev) => [...prev, choice.url]);
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-[#ECF4EF] text-slate-700 rounded border border-slate-200"
                    >
                      + {choice.label}
                    </button>
                  ))}
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {images.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                      >
                        <SafeImage
                          src={url}
                          alt={`Product image ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#14452F] text-white text-[10px] font-semibold">
                            Cover
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-slate-950/75 flex items-center justify-between gap-1 text-[10px] text-white">
                          <button
                            type="button"
                            disabled={replacingIdx === idx}
                            onClick={() => triggerReplaceImage(idx)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25"
                            title="Replace this image via Firebase Storage"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${replacingIdx === idx ? 'animate-spin' : ''}`}
                            />
                            {replacingIdx === idx ? '...' : 'Replace'}
                          </button>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMakePrimaryImage(idx)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25"
                              title="Set as primary cover image"
                            >
                              <Star className="w-3 h-3" />
                              Primary
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-slate-950/80 text-white flex items-center justify-center text-xs hover:bg-red-700"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Stock quantity &amp; weighted prices update via Stock In / Stock Out.
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading || replacingIdx !== null}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
                  >
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Details Preview Modal */}
      <ProductPreviewModal
        product={previewProduct}
        historyCounts={
          previewProduct
            ? historyCountMap[previewProduct.productId] || {
                purchases: 0,
                sales: 0,
                transactions: 0,
              }
            : { purchases: 0, sales: 0, transactions: 0 }
        }
        onClose={() => setPreviewProduct(null)}
        onEdit={(p) => openEditModal(p)}
        onArchiveOrDelete={(p) => void openArchiveOrDeleteModal(p)}
        onRestore={(p) => setRestoreCandidate(p)}
      />

      {/* Archive / Historical-Protected Delete Modal */}
      {deleteCandidate && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-delete-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteBusy) setDeleteCandidate(null);
          }}
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    deleteEligibility.allowed
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {deleteEligibility.allowed ? (
                    <Trash2 className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3
                    id="archive-delete-title"
                    className="font-display text-lg font-semibold text-slate-900"
                  >
                    {deleteEligibility.allowed
                      ? `Archive or Delete "${deleteCandidate.name}"?`
                      : `Archive "${deleteCandidate.name}" (Protected History)`}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                    SKU: {deleteCandidate.sku} · ID: {deleteCandidate.productId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteCandidate(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteCheckLoading ? (
              <p className="text-xs text-slate-600 py-3">
                Checking historical purchase, sales, and stock ledger references...
              </p>
            ) : !deleteEligibility.allowed ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed">
                <p className="font-semibold">Historical Record Protection Active</p>
                <p>
                  This SKU has{' '}
                  <strong>
                    {deleteHistoryCounts?.purchasesCount || 0} purchase(s),{' '}
                    {deleteHistoryCounts?.salesCount || 0} sale(s), and{' '}
                    {deleteHistoryCounts?.stockTransactionsCount || 0} stock ledger entry(ies)
                  </strong>
                  . Permanent deletion is disabled so P&amp;L reports and ledger audit trails remain intact.
                </p>
                <p>
                  Archiving sets status to <span className="font-mono-tabular">ARCHIVED</span>, removes it from the public catalogue, blocks new stock postings, and preserves all historical data.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                Zero purchase, sales, or stock ledger records reference this SKU. You can safely{' '}
                <strong>Archive</strong> it for future reference or{' '}
                <strong>Permanently Delete</strong> it from Firestore.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Archival Note (logged in Audit Trail, optional)
              </label>
              <input
                type="text"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Discontinued seasonal grade, replaced by new SKU"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              {deleteEligibility.allowed && !deleteCheckLoading && (
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => void handlePermanentDeleteConfirmed()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg disabled:opacity-50"
                >
                  {deleteBusy ? 'Processing...' : 'Confirm Permanent Delete'}
                </button>
              )}
              <button
                type="button"
                disabled={deleteBusy || deleteCheckLoading}
                onClick={() => void handleArchiveProductConfirmed()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" />
                {deleteBusy ? 'Archiving...' : 'Archive Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(restoreCandidate)}
        title={`Restore "${restoreCandidate?.name}" from Archive?`}
        description="Restoring moves the product from ARCHIVED to INACTIVE status so you can review stock and publish it to the storefront when ready."
        variant="primary"
        confirmLabel="Restore to Inactive"
        busy={restoreBusy}
        onConfirm={handleRestoreConfirmed}
        onCancel={() => setRestoreCandidate(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteCat)}
        title={`Delete category "${confirmDeleteCat?.name}"?`}
        description="This permanently deletes the category from Firestore."
        warningText={
          confirmDeleteCat && (productCountByCategory[confirmDeleteCat.id] || 0) > 0
            ? `${productCountByCategory[confirmDeleteCat.id]} product(s) currently belong to this category. Reassign those products before deleting.`
            : undefined
        }
        confirmLabel="Confirm Delete"
        busy={deleteBusy}
        onConfirm={handleDeleteCategoryConfirmed}
        onCancel={() => setConfirmDeleteCat(null)}
      />
    </div>
  );
}
