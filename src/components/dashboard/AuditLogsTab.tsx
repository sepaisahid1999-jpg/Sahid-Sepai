import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Search, Shield } from 'lucide-react';
import { getDateRangeBounds } from '../../lib/accounting';
import {
  exportRowsToCSV,
  exportRowsToExcel,
  formatFirestoreTimestamp,
  mapAuditLogsForExport,
} from '../../lib/reports';
import type { AuditLog, DateFilterPreset } from '../../types';
import { DateRangeFilterBar } from './shared/DateRangeFilterBar';
import { PaginationBar } from './shared/PaginationBar';
import { SortableHeader, type SortDirection } from './shared/SortableHeader';

interface AuditLogsTabProps {
  auditLogs: AuditLog[];
}

type SortKey = 'timestamp' | 'action' | 'entityType' | 'actor';

export function AuditLogsTab({ auditLogs }: AuditLogsTabProps) {
  const [preset, setPreset] = useState<DateFilterPreset>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const log of auditLogs) {
      if (log.entityType) set.add(log.entityType);
    }
    return Array.from(set).sort();
  }, [auditLogs]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'timestamp' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    const { start, end } = getDateRangeBounds(preset, customStart, customEnd);
    const q = search.trim().toLowerCase();

    const filtered = auditLogs.filter((log) => {
      if (entityFilter !== 'ALL' && log.entityType !== entityFilter) return false;
      if (start || end) {
        const ymd = formatFirestoreTimestamp(log.createdAt).slice(0, 10);
        if (!ymd) return false;
        if (start && ymd < start) return false;
        if (end && ymd > end) return false;
      }
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.summary.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'timestamp') {
        cmp = formatFirestoreTimestamp(a.createdAt).localeCompare(
          formatFirestoreTimestamp(b.createdAt)
        );
      } else if (sortKey === 'action') {
        cmp = a.action.localeCompare(b.action);
      } else if (sortKey === 'entityType') {
        cmp = a.entityType.localeCompare(b.entityType);
      } else if (sortKey === 'actor') {
        cmp = a.actorEmail.localeCompare(b.actorEmail);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [auditLogs, preset, customStart, customEnd, search, entityFilter, sortKey, sortDir]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const formatDisplayTime = (ts: unknown) => {
    const iso = formatFirestoreTimestamp(ts);
    if (!iso) return 'Pending...';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const dateSuffix = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
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
              placeholder="Search action, summary, admin email, entity ID..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            aria-label="Filter by entity type"
          >
            <option value="ALL">All Entities</option>
            {entityTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportRowsToCSV(
                mapAuditLogsForExport(filteredAndSorted),
                `gazi-jute-audit-logs-${dateSuffix}`
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
                mapAuditLogsForExport(filteredAndSorted),
                'AuditLogs',
                `gazi-jute-audit-logs-${dateSuffix}`
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#14452F]" />
            <h3 className="text-sm font-semibold text-slate-900">
              Immutable Administrative Audit Trail ({filteredAndSorted.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Append-only · Deletion disabled by rules</span>
        </div>

        {filteredAndSorted.length === 0 ? (
          <p className="p-12 text-center text-xs text-slate-500">
            No administrative audit events recorded in this filter yet. Events are automatically logged whenever products, stock, categories, settings, or users are modified.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <SortableHeader
                      label="Timestamp"
                      sortKey="timestamp"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      className="pl-4"
                    />
                    <SortableHeader
                      label="Action"
                      sortKey="action"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Entity"
                      sortKey="entityType"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <th className="text-left py-3 px-3 font-semibold">Summary</th>
                    <SortableHeader
                      label="Administrator"
                      sortKey="actor"
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      className="pr-4"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                        {formatDisplayTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-mono-tabular font-semibold text-[#14452F] whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{log.entityType}</span>
                        <span className="block text-[11px] font-mono-tabular text-slate-400 truncate max-w-[140px]">
                          {log.entityId}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-md">{log.summary}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 block">{log.actorName}</span>
                        <span className="text-[11px] font-mono-tabular text-slate-500">
                          {log.actorEmail}
                        </span>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
