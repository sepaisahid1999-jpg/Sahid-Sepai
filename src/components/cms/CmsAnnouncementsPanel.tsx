import React, { useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { isAnnouncementActiveOnDate } from '../../lib/cmsDefaults';
import { deleteAnnouncement, saveAnnouncement } from '../../services/cmsService';
import type { Announcement } from '../../types';

interface CmsAnnouncementsPanelProps {
  announcements: Announcement[];
}

export function CmsAnnouncementsPanel({ announcements }: CmsAnnouncementsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [bgColor, setBgColor] = useState('#14452F');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setMessage('');
    setLinkLabel('');
    setLinkUrl('/products');
    setBgColor('#14452F');
    setTextColor('#FFFFFF');
    setIsActive(true);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (ann: Announcement) => {
    setEditing(ann);
    setTitle(ann.title);
    setMessage(ann.message);
    setLinkLabel(ann.linkLabel);
    setLinkUrl(ann.linkUrl);
    setBgColor(ann.bgColor || '#14452F');
    setTextColor(ann.textColor || '#FFFFFF');
    setIsActive(ann.isActive);
    setStartDate(ann.startDate);
    setEndDate(ann.endDate);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2 || message.trim().length < 2) {
      setError('Title and message must be at least 2 characters.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    setSaving(true);
    try {
      await saveAnnouncement(
        {
          title: title.trim(),
          message: message.trim(),
          linkLabel: linkLabel.trim(),
          linkUrl: linkUrl.trim(),
          bgColor,
          textColor,
          isActive,
          startDate,
          endDate,
        },
        editing?.id
      );
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ann: Announcement) => {
    await saveAnnouncement(
      {
        title: ann.title,
        message: ann.message,
        linkLabel: ann.linkLabel,
        linkUrl: ann.linkUrl,
        bgColor: ann.bgColor,
        textColor: ann.textColor,
        isActive: !ann.isActive,
        startDate: ann.startDate,
        endDate: ann.endDate,
      },
      ann.id
    );
  };

  const getScheduleBadge = (ann: Announcement) => {
    if (!ann.isActive) return { text: 'Inactive', cls: 'bg-slate-100 text-slate-600' };
    const today = new Date().toISOString().slice(0, 10);
    if (ann.startDate && today < ann.startDate) {
      return { text: `Scheduled (${ann.startDate})`, cls: 'bg-amber-50 text-amber-800' };
    }
    if (ann.endDate && today > ann.endDate) {
      return { text: `Expired (${ann.endDate})`, cls: 'bg-slate-100 text-slate-600' };
    }
    return isAnnouncementActiveOnDate(ann)
      ? { text: 'Live Today', cls: 'bg-emerald-50 text-emerald-800' }
      : { text: 'Inactive', cls: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#14452F]" />
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Announcement Management</h3>
              <p className="text-[11px] text-slate-500">
                Create scheduled wholesale notices shown in top bar &amp; announcements section.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#14452F] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            New Notice
          </button>
        </div>

        <div className="space-y-2">
          {announcements.length === 0 ? (
            <p className="text-xs text-slate-500 py-5 text-center">
              No announcements created yet. Add a notice for seasonal jute harvests or dispatch hours.
            </p>
          ) : (
            announcements.map((ann) => {
              const badge = getScheduleBadge(ann);
              return (
                <div
                  key={ann.id}
                  className="p-3 rounded-lg border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{ann.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{ann.message}</p>
                      {(ann.startDate || ann.endDate) && (
                        <p className="text-[11px] font-mono-tabular text-slate-400 mt-1">
                          Window: {ann.startDate || 'Any'} → {ann.endDate || 'Ongoing'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void toggleActive(ann)}
                        className="px-2 py-1 text-[10px] font-medium border border-slate-200 rounded hover:bg-slate-50"
                      >
                        {ann.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(ann)}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(ann)}
                        className="p-1 text-slate-400 hover:text-red-700 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Announcement Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-display text-base font-semibold text-slate-900">
                {editing ? 'Edit Announcement' : 'Create Announcement'}
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New Crop TD-3 Tossa Dispatch Open"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Notice Message *</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Bulk lots ready for booking across North & South India."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Link Label</label>
                  <input
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="View Catalogue"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Link URL</label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="/products"
                    className="w-full px-2.5 py-1.5 font-mono-tabular border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Background</label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-full rounded border border-slate-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Text Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-8 w-full rounded border border-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active (visible when inside date schedule)
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 font-semibold text-white bg-[#14452F] rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="font-display text-base font-semibold text-slate-900">
              Delete Announcement?
            </h4>
            <p className="text-xs text-slate-600">
              Confirm removing announcement <strong>{confirmDelete.title}</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteAnnouncement(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
