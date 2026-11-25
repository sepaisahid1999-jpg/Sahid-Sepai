import { History, RotateCcw, X } from 'lucide-react';
import type { CmsRevision } from '../../types';

interface CmsRevisionsModalProps {
  revisions: CmsRevision[];
  restoringId: string | null;
  onRestore: (revision: CmsRevision) => Promise<void>;
  onClose: () => void;
}

function formatRevisionTime(ts: unknown): string {
  if (!ts) return 'Just now';
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    const d = (ts as { toDate: () => Date }).toDate();
    return d.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
  return String(ts);
}

export function CmsRevisionsModal({
  revisions,
  restoringId,
  onRestore,
  onClose,
}: CmsRevisionsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#14452F]" />
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                CMS Revision History
              </h3>
              <p className="text-[11px] text-slate-500">
                Restore any previous snapshot into your Draft workspace before publishing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {revisions.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              No revision snapshots saved yet. Save a Draft or Publish Changes to record history.
            </p>
          ) : (
            revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAF9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      v{rev.version}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        rev.action === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : rev.action === 'UNPUBLISHED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {rev.action}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatRevisionTime(rev.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700">{rev.note || 'Configuration snapshot'}</p>
                  {rev.savedByEmail && (
                    <p className="text-[11px] text-slate-500 font-mono-tabular">
                      By {rev.savedByEmail}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={restoringId === rev.id}
                  onClick={() => void onRestore(rev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#14452F] bg-white border border-[#14452F]/30 hover:bg-[#ECF4EF] rounded-lg whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {restoringId === rev.id ? 'Restoring...' : 'Restore to Draft'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
