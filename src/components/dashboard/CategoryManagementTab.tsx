import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FolderTree, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { formatNumber } from '../../lib/accounting';
import { validateCategoryInput } from '../../lib/productValidation';
import { exportRowsToCSV, exportRowsToExcel, mapCategoriesForExport } from '../../lib/reports';
import { createCategory, deleteCategory, updateCategory } from '../../services/firestoreService';
import type { Category, Product } from '../../types';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface CategoryManagementTabProps {
  categories: Category[];
  products: Product[];
}

type SortKey = 'name' | 'slug' | 'products' | 'status';

export function CategoryManagementTab({ categories, products }: CategoryManagementTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'HIDDEN'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catActive, setCatActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.categoryId] = (map[p.categoryId] || 0) + 1;
    }
    return map;
  }, [products]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'products' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = categories.filter((c) => {
      if (statusFilter === 'ACTIVE' && !c.active) return false;
      if (statusFilter === 'HIDDEN' && c.active) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'slug') cmp = a.slug.localeCompare(b.slug);
      else if (sortKey === 'products')
        cmp = (productCountMap[a.id] || 0) - (productCountMap[b.id] || 0);
      else if (sortKey === 'status') cmp = Number(a.active) - Number(b.active);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [categories, search, statusFilter, sortKey, sortDir, productCountMap]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const openCreate = () => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setCatActive(true);
    setActionError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatActive(cat.active);
    setActionError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const check = validateCategoryInput(
      { name: catName, description: catDesc },
      categories,
      editingCat?.id
    );
    if (!check.valid) {
      setActionError(check.errors[0] || 'Invalid category details.');
      return;
    }
    setSaving(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, {
          name: catName.trim(),
          description: catDesc.trim(),
          active: catActive,
        });
      } else {
        await createCategory({
          name: catName.trim(),
          description: catDesc.trim(),
          active: catActive,
        });
      }
      setModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    setActionError(null);
    setTogglingId(cat.id);
    try {
      await updateCategory(cat.id, {
        name: cat.name,
        description: cat.description || '',
        active: !cat.active,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update category status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteCategory(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete category.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const dateSuffix = new Date().toISOString().slice(0, 10);

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

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Categories</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(categories.length, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Active on Storefront</p>
          <p className="text-xl font-semibold text-[#14452F] font-mono-tabular mt-1">
            {formatNumber(categories.filter((c) => c.active).length, 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Assigned Products</p>
          <p className="text-xl font-semibold text-slate-950 font-mono-tabular mt-1">
            {formatNumber(products.length, 0)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search categories by name, slug, description..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14452F]/25"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'HIDDEN');
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            aria-label="Filter category visibility"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="HIDDEN">Hidden Only</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportRowsToCSV(
                mapCategoriesForExport(filteredAndSorted, productCountMap),
                `gazi-jute-categories-${dateSuffix}`
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
                mapCategoriesForExport(filteredAndSorted, productCountMap),
                'Categories',
                `gazi-jute-categories-${dateSuffix}`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            XLSX
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FolderTree className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-900">
              {categories.length === 0 ? 'No categories created yet' : 'No matching categories'}
            </p>
            <p className="text-xs text-slate-500">
              Create wholesale jute product categories to organize inventory and storefront filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <SortableHeader
                      label="Category Name"
                      sortKey="name"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableHeader
                      label="Slug"
                      sortKey="slug"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <th className="text-left py-3 px-3 font-semibold">Description</th>
                    <SortableHeader
                      label="Products"
                      sortKey="products"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Visibility"
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
                  {paginated.map((cat) => {
                    const count = productCountMap[cat.id] || 0;
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">{cat.name}</td>
                        <td className="py-3 px-3 font-mono-tabular text-slate-500">{cat.slug}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-md truncate">
                          {cat.description || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                          {formatNumber(count, 0)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            disabled={togglingId === cat.id}
                            onClick={() => void handleToggleActive(cat)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-50 ${
                              cat.active
                                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {togglingId === cat.id ? '...' : cat.active ? 'Active' : 'Hidden'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(cat)}
                              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                              aria-label={`Edit ${cat.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(cat)}
                              className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                              aria-label={`Delete ${cat.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
              totalItems={filteredAndSorted.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {editingCat ? `Edit Category — ${editingCat.name}` : 'Create Category'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Hessian Cloth"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Wholesale specifications, weave grades, applications..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={catActive}
                  onChange={(e) => setCatActive(e.target.checked)}
                  className="rounded border-slate-300 text-[#14452F]"
                />
                <span className="font-medium text-slate-800">
                  Active (visible in public catalogue filters)
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
                >
                  {saving ? 'Saving...' : editingCat ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Delete category "${confirmDelete?.name}"?`}
        description="This permanently removes the category record from Firestore."
        warningText={
          confirmDelete && (productCountMap[confirmDelete.id] || 0) > 0
            ? `${productCountMap[confirmDelete.id]} product(s) currently reference this category. Reassign those products before deleting to keep storefront filters consistent.`
            : undefined
        }
        confirmLabel="Confirm Delete"
        busy={deleteBusy}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
