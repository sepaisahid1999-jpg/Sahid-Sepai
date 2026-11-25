import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { formatINR, formatNumber, roundCurrency } from '../../lib/accounting';
import { getPurchaseSign } from '../../lib/purchaseValidation';
import {
  exportRowsToCSV,
  exportRowsToExcel,
  mapCustomersForExport,
  mapSuppliersForExport,
} from '../../lib/reports';
import {
  deleteCustomer,
  deleteSupplier,
  saveCustomer,
  saveSupplier,
} from '../../services/firestoreService';
import type { Customer, Purchase, Sale, Supplier } from '../../types';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface DirectoryTabProps {
  mode?: 'suppliers' | 'customers';
  suppliers: Supplier[];
  customers: Customer[];
  purchases?: Purchase[];
  sales?: Sale[];
}

type SortKey = 'name' | 'location' | 'orders' | 'totalValue';

export function DirectoryTab({
  mode,
  suppliers,
  customers,
  purchases = [],
  sales = [],
}: DirectoryTabProps) {
  const [internalSub, setInternalSub] = useState<'suppliers' | 'customers'>('suppliers');
  const activeSub = mode ?? internalSub;

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressOrLocation, setAddressOrLocation] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const supplierStats = useMemo(() => {
    const map: Record<string, { orders: number; totalSpend: number }> = {};
    for (const p of purchases) {
      if (!p.supplierId) continue;
      const cur = map[p.supplierId] || { orders: 0, totalSpend: 0 };
      const sign = getPurchaseSign(p.type);
      cur.orders += sign > 0 ? 1 : -1;
      cur.totalSpend = roundCurrency(cur.totalSpend + sign * p.totalAmount);
      map[p.supplierId] = cur;
    }
    return map;
  }, [purchases]);

  const customerStats = useMemo(() => {
    const map: Record<string, { orders: number; totalRevenue: number }> = {};
    for (const s of sales) {
      if (!s.customerId) continue;
      const cur = map[s.customerId] || { orders: 0, totalRevenue: 0 };
      const sign = s.type === 'CUSTOMER_RETURN' ? -1 : 1;
      cur.orders += 1;
      cur.totalRevenue = roundCurrency(cur.totalRevenue + sign * s.totalAmount);
      map[s.customerId] = cur;
    }
    return map;
  }, [sales]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'orders' || key === 'totalValue' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = suppliers.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.gstNumber.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'location') cmp = a.address.localeCompare(b.address);
      else if (sortKey === 'orders')
        cmp = (supplierStats[a.id]?.orders || 0) - (supplierStats[b.id]?.orders || 0);
      else if (sortKey === 'totalValue')
        cmp = (supplierStats[a.id]?.totalSpend || 0) - (supplierStats[b.id]?.totalSpend || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [suppliers, search, sortKey, sortDir, supplierStats]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = customers.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.gstNumber.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'location') cmp = a.location.localeCompare(b.location);
      else if (sortKey === 'orders')
        cmp = (customerStats[a.id]?.orders || 0) - (customerStats[b.id]?.orders || 0);
      else if (sortKey === 'totalValue')
        cmp = (customerStats[a.id]?.totalRevenue || 0) - (customerStats[b.id]?.totalRevenue || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [customers, search, sortKey, sortDir, customerStats]);

  const totalCount =
    activeSub === 'suppliers' ? filteredSuppliers.length : filteredCustomers.length;

  const pagedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  const pagedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddressOrLocation('');
    setGstNumber('');
    setNotes('');
    setActionError(null);
    setModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingId(s.id);
    setName(s.name);
    setPhone(s.phone);
    setEmail(s.email);
    setAddressOrLocation(s.address);
    setGstNumber(s.gstNumber);
    setNotes(s.notes);
    setActionError(null);
    setModalOpen(true);
  };

  const openEditCustomer = (c: Customer) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddressOrLocation(c.location);
    setGstNumber(c.gstNumber);
    setNotes(c.notes);
    setActionError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setActionError('Name must be at least 2 characters.');
      return;
    }
    setActionError(null);
    setSaving(true);
    try {
      if (activeSub === 'suppliers') {
        await saveSupplier(
          {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: addressOrLocation.trim(),
            gstNumber: gstNumber.trim(),
            notes: notes.trim(),
          },
          editingId || undefined
        );
      } else {
        await saveCustomer(
          {
            name: name.trim(),
            phone: phone.trim(),
            location: addressOrLocation.trim(),
            email: email.trim(),
            gstNumber: gstNumber.trim(),
            notes: notes.trim(),
          },
          editingId || undefined
        );
      }
      setModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      if (activeSub === 'suppliers') {
        await deleteSupplier(confirmDelete.id);
      } else {
        await deleteCustomer(confirmDelete.id);
      }
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete record.');
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

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          {!mode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInternalSub('suppliers');
                  setPage(1);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeSub === 'suppliers'
                    ? 'bg-[#14452F] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Suppliers ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setInternalSub('customers');
                  setPage(1);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeSub === 'customers'
                    ? 'bg-[#14452F] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Customers ({customers.length})
              </button>
            </div>
          )}

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                activeSub === 'suppliers'
                  ? 'Search supplier name, phone, GSTIN, address...'
                  : 'Search customer name, phone, GSTIN, location...'
              }
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              activeSub === 'suppliers'
                ? exportRowsToCSV(
                    mapSuppliersForExport(filteredSuppliers, supplierStats),
                    `gazi-jute-suppliers-${dateSuffix}`
                  )
                : exportRowsToCSV(
                    mapCustomersForExport(filteredCustomers, customerStats),
                    `gazi-jute-customers-${dateSuffix}`
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
              activeSub === 'suppliers'
                ? exportRowsToExcel(
                    mapSuppliersForExport(filteredSuppliers, supplierStats),
                    'Suppliers',
                    `gazi-jute-suppliers-${dateSuffix}`
                  )
                : exportRowsToExcel(
                    mapCustomersForExport(filteredCustomers, customerStats),
                    'Customers',
                    `gazi-jute-customers-${dateSuffix}`
                  )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            XLSX
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add {activeSub === 'suppliers' ? 'Supplier' : 'Customer'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {totalCount === 0 ? (
          <p className="p-10 text-center text-xs text-slate-500">
            No {activeSub === 'suppliers' ? 'suppliers' : 'customers'} match the current search.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              {activeSub === 'suppliers' ? (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <SortableHeader
                        label="Supplier Name"
                        sortKey="name"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        className="pl-4"
                      />
                      <th className="text-left py-3 px-3 font-semibold">Contact</th>
                      <SortableHeader
                        label="Address"
                        sortKey="location"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <th className="text-left py-3 px-3 font-semibold">GSTIN</th>
                      <SortableHeader
                        label="Orders"
                        sortKey="orders"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="Total Purchases"
                        sortKey="totalValue"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <th className="text-right py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedSuppliers.map((s) => {
                      const stats = supplierStats[s.id] || { orders: 0, totalSpend: 0 };
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono-tabular text-slate-800 block">
                              {s.phone || '—'}
                            </span>
                            <span className="text-[11px] text-slate-500">{s.email || ''}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                            {s.address || '—'}
                          </td>
                          <td className="py-3 px-3 font-mono-tabular text-slate-600">
                            {s.gstNumber || '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-slate-700">
                            {formatNumber(stats.orders, 0)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-slate-900">
                            {formatINR(stats.totalSpend)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditSupplier(s)}
                                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                                aria-label={`Edit ${s.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete({ id: s.id, name: s.name })}
                                className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                aria-label={`Delete ${s.name}`}
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
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <SortableHeader
                        label="Customer Name"
                        sortKey="name"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        className="pl-4"
                      />
                      <th className="text-left py-3 px-3 font-semibold">Contact</th>
                      <SortableHeader
                        label="Location"
                        sortKey="location"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <th className="text-left py-3 px-3 font-semibold">GSTIN</th>
                      <SortableHeader
                        label="Orders"
                        sortKey="orders"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="Total Sales"
                        sortKey="totalValue"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <th className="text-right py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedCustomers.map((c) => {
                      const stats = customerStats[c.id] || { orders: 0, totalRevenue: 0 };
                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono-tabular text-slate-800 block">
                              {c.phone || '—'}
                            </span>
                            <span className="text-[11px] text-slate-500">{c.email || ''}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{c.location || '—'}</td>
                          <td className="py-3 px-3 font-mono-tabular text-slate-600">
                            {c.gstNumber || '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-slate-700">
                            {formatNumber(stats.orders, 0)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-[#14452F]">
                            {formatINR(stats.totalRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditCustomer(c)}
                                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                                aria-label={`Edit ${c.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete({ id: c.id, name: c.name })}
                                className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                aria-label={`Delete ${c.name}`}
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
              )}
            </div>
            <PaginationBar
              currentPage={page}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {editingId ? 'Edit' : 'Add'} {activeSub === 'suppliers' ? 'Supplier' : 'Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Business / Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {activeSub === 'suppliers' ? 'Address' : 'Location / City'}
                  </label>
                  <input
                    type="text"
                    value={addressOrLocation}
                    onChange={(e) => setAddressOrLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Delete ${activeSub === 'suppliers' ? 'supplier' : 'customer'} "${confirmDelete?.name}"?`}
        description="This deletes the directory profile. Existing purchase and sales invoice records remain archived."
        confirmLabel="Confirm Delete"
        busy={deleteBusy}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
