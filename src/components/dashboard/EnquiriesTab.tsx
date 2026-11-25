import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Search, Trash2 } from 'lucide-react';
import { formatNumber, getDateRangeBounds } from '../../lib/accounting';
import {
  exportRowsToCSV,
  exportRowsToExcel,
  formatFirestoreTimestamp,
  mapEnquiriesForExport,
} from '../../lib/reports';
import { deleteEnquiry, updateEnquiryStatus } from '../../services/firestoreService';
import type { DateFilterPreset, Enquiry, EnquiryStatus } from '../../types';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { DateRangeFilterBar } from './shared/DateRangeFilterBar';
import { PaginationBar } from './shared/PaginationBar';

interface EnquiriesTabProps {
  enquiries: Enquiry[];
}

const STATUS_TABS: { id: 'ALL' | EnquiryStatus; label: string }[] = [
  { id: 'ALL', label: 'All Requests' },
  { id: 'NEW', label: 'New' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

type SortOption = 'newest' | 'oldest' | 'buyer' | 'qty-desc' | 'status';

export function EnquiriesTab({ enquiries }: EnquiriesTabProps) {
  const [preset, setPreset] = useState<DateFilterPreset>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EnquiryStatus>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Enquiry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const dateFiltered = useMemo(() => {
    const { start, end } = getDateRangeBounds(preset, customStart, customEnd);
    if (!start && !end) return enquiries;
    return enquiries.filter((e) => {
      const ymd = formatFirestoreTimestamp(e.createdAt).slice(0, 10);
      if (!ymd) return false;
      if (start && ymd < start) return false;
      if (end && ymd > end) return false;
      return true;
    });
  }, [enquiries, preset, customStart, customEnd]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = dateFiltered.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.buyerName.toLowerCase().includes(q) ||
        e.buyerPhone.toLowerCase().includes(q) ||
        e.buyerLocation.toLowerCase().includes(q) ||
        e.productName.toLowerCase().includes(q) ||
        e.sku.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'newest') {
        return formatFirestoreTimestamp(b.createdAt).localeCompare(
          formatFirestoreTimestamp(a.createdAt)
        );
      }
      if (sortBy === 'oldest') {
        return formatFirestoreTimestamp(a.createdAt).localeCompare(
          formatFirestoreTimestamp(b.createdAt)
        );
      }
      if (sortBy === 'buyer') return a.buyerName.localeCompare(b.buyerName);
      if (sortBy === 'qty-desc') return b.quantity - a.quantity;
      return a.status.localeCompare(b.status);
    });
  }, [dateFiltered, statusFilter, search, sortBy]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const countFor = (s: 'ALL' | EnquiryStatus) =>
    s === 'ALL' ? dateFiltered.length : dateFiltered.filter((e) => e.status === s).length;

  const handleStatusChange = async (enq: Enquiry, nextStatus: EnquiryStatus) => {
    setActionError(null);
    setBusyId(enq.id);
    try {
      const notes = notesDraft[enq.id] ?? enq.adminNotes ?? '';
      await updateEnquiryStatus(enq.id, nextStatus, notes);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update buyer request.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteEnquiry(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete buyer request.');
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

      <DateRangeFilterBar
        preset={preset}
        onPresetChange={(p) => {
          setPreset(p);
          setPage(1);
        }}
        customStart={customStart}
        onCustomStartChange={(v) => {
          setCustomStart(v);
          setPage(1);
        }}
        customEnd={customEnd}
        onCustomEndChange={(v) => {
          setCustomEnd(v);
          setPage(1);
        }}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[#14452F] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label} ({countFor(tab.id)})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportRowsToCSV(
                  mapEnquiriesForExport(filteredAndSorted),
                  `gazi-jute-buyer-requests-${dateSuffix}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportRowsToExcel(
                  mapEnquiriesForExport(filteredAndSorted),
                  'BuyerRequests',
                  `gazi-jute-buyer-requests-${dateSuffix}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              XLSX
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search buyer, phone, location, product, SKU..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            aria-label="Sort buyer requests"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="buyer">Sort: Buyer Name (A–Z)</option>
            <option value="qty-desc">Sort: Highest Quantity</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        <p className="text-xs text-slate-500">
          Buyer enquiries never automatically confirm orders or reduce stock. Record a Stock Out sale separately after commercial confirmation.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No buyer requests match the current filters.
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200">
              {paged.map((enq) => {
                const timestamp = formatFirestoreTimestamp(enq.createdAt).slice(0, 10);
                return (
                  <div key={enq.id} className="p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-900 text-sm">
                            {enq.buyerName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{enq.buyerLocation}</span>
                          {enq.buyerPhone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">{enq.buyerPhone}</span>
                            </>
                          )}
                          {timestamp && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">{timestamp}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          <strong>{enq.productName}</strong>{' '}
                          {enq.sku && <span className="font-mono-tabular">({enq.sku})</span>}
                          {enq.quantity > 0 && (
                            <span className="ml-2 font-mono-tabular text-[#14452F] font-medium">
                              Qty: {formatNumber(enq.quantity)} {enq.unit}
                            </span>
                          )}
                        </p>
                        {enq.whatsappNumberUsed && (
                          <p className="text-[11px] text-slate-500 font-mono-tabular">
                            Routed to WhatsApp: {enq.whatsappNumberUsed}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={enq.status}
                          disabled={busyId === enq.id}
                          onChange={(e) =>
                            void handleStatusChange(enq, e.target.value as EnquiryStatus)
                          }
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white disabled:opacity-50"
                          aria-label="Update enquiry status"
                        >
                          <option value="NEW">New</option>
                          <option value="PENDING">Pending</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(enq)}
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg"
                          aria-label="Delete enquiry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {enq.message && (
                      <pre className="text-xs text-slate-700 bg-[#F8FAF9] border border-slate-200 rounded-lg p-3 whitespace-pre-wrap font-sans">
                        {enq.message}
                      </pre>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={notesDraft[enq.id] ?? enq.adminNotes ?? ''}
                        onChange={(e) =>
                          setNotesDraft((prev) => ({ ...prev, [enq.id]: e.target.value }))
                        }
                        placeholder="Internal admin follow-up notes..."
                        className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        disabled={busyId === enq.id}
                        onClick={() => void handleStatusChange(enq, enq.status)}
                        className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                      >
                        {busyId === enq.id ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                );
              })}
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

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Delete request from ${confirmDelete?.buyerName}?`}
        description="This permanently removes the buyer quotation enquiry from Firestore."
        confirmLabel="Confirm Delete"
        busy={deleteBusy}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
