import React, { useMemo, useState } from 'react';
import { MessageCircle, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { selectWhatsAppNumber, validateInternationalPhone } from '../../lib/whatsapp';
import {
  deleteWhatsAppNumber,
  saveWhatsAppNumber,
  setDefaultWhatsAppNumber,
  toggleWhatsAppActive,
} from '../../services/firestoreService';
import type { WhatsAppNumber } from '../../types';
import { ConfirmDialog } from './shared/ConfirmDialog';

interface WhatsAppManagementTabProps {
  whatsappNumbers: WhatsAppNumber[];
}

export function WhatsAppManagementTab({ whatsappNumbers }: WhatsAppManagementTabProps) {
  const [search, setSearch] = useState('');
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [editingWa, setEditingWa] = useState<WhatsAppNumber | null>(null);
  const [waDisplayName, setWaDisplayName] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waActive, setWaActive] = useState(true);
  const [waDefault, setWaDefault] = useState(false);
  const [waProduct, setWaProduct] = useState(true);
  const [waGeneral, setWaGeneral] = useState(true);
  const [waError, setWaError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingWa, setSavingWa] = useState(false);
  const [confirmDeleteWa, setConfirmDeleteWa] = useState<WhatsAppNumber | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const effectiveProductWa = selectWhatsAppNumber(whatsappNumbers, 'product');
  const effectiveGeneralWa = selectWhatsAppNumber(whatsappNumbers, 'general');

  const filteredNumbers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return whatsappNumbers;
    return whatsappNumbers.filter(
      (w) =>
        w.displayName.toLowerCase().includes(q) || w.phoneNumber.toLowerCase().includes(q)
    );
  }, [whatsappNumbers, search]);

  const openWaAdd = () => {
    setEditingWa(null);
    setWaDisplayName('');
    setWaPhone('+91');
    setWaActive(true);
    setWaDefault(whatsappNumbers.length === 0);
    setWaProduct(true);
    setWaGeneral(true);
    setWaError(null);
    setWaModalOpen(true);
  };

  const openWaEdit = (w: WhatsAppNumber) => {
    setEditingWa(w);
    setWaDisplayName(w.displayName);
    setWaPhone(w.phoneNumber);
    setWaActive(w.isActive);
    setWaDefault(w.isDefault);
    setWaProduct(w.receivesProductEnquiries);
    setWaGeneral(w.receivesGeneralEnquiries);
    setWaError(null);
    setWaModalOpen(true);
  };

  const handleSaveWa = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaError(null);
    const check = validateInternationalPhone(waPhone);
    if (!check.valid) {
      setWaError(check.error || 'Invalid international WhatsApp number.');
      return;
    }
    setSavingWa(true);
    try {
      await saveWhatsAppNumber(
        {
          displayName: waDisplayName.trim(),
          phoneNumber: check.normalized,
          isActive: waActive,
          isDefault: waDefault,
          receivesProductEnquiries: waProduct,
          receivesGeneralEnquiries: waGeneral,
        },
        editingWa?.id
      );
      setWaModalOpen(false);
    } catch (err) {
      setWaError(err instanceof Error ? err.message : 'Unable to save WhatsApp number.');
    } finally {
      setSavingWa(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteWa) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteWhatsAppNumber(confirmDeleteWa.id);
      setConfirmDeleteWa(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete WhatsApp number.');
    } finally {
      setDeleteBusy(false);
    }
  };

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

      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#14452F]" />
            <h3 className="font-display text-lg font-semibold text-slate-900">
              WhatsApp Enquiry Routing Management
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Manage international WhatsApp trade desks. If the default number is deactivated, public Click-to-Chat automatically falls back to the next active eligible desk.
          </p>
        </div>
        <button
          type="button"
          onClick={openWaAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add WhatsApp Number
        </button>
      </div>

      {/* Live Fallback Routing Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#ECF4EF] border border-[#14452F]/20 rounded-xl p-4 text-xs space-y-1">
          <span className="text-[#14452F]/80 font-medium block">
            Active Product Enquiry Routing:
          </span>
          <span className="text-sm font-semibold text-[#14452F] font-mono-tabular">
            {effectiveProductWa
              ? `${effectiveProductWa.displayName} (${effectiveProductWa.phoneNumber})`
              : 'No active WhatsApp number'}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-1">
          <span className="text-slate-500 block">Active General Enquiry Routing:</span>
          <span className="text-sm font-semibold text-slate-900 font-mono-tabular">
            {effectiveGeneralWa
              ? `${effectiveGeneralWa.displayName} (${effectiveGeneralWa.phoneNumber})`
              : 'No active WhatsApp number'}
          </span>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-800">
            Configured Trade Desk Numbers ({filteredNumbers.length})
          </span>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search desk or phone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {filteredNumbers.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No WhatsApp numbers configured yet. Click &ldquo;Add WhatsApp Number&rdquo; to add +917585841977 or +917074340808.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Display Name</th>
                  <th className="text-left py-3 px-3 font-semibold">International Number</th>
                  <th className="text-left py-3 px-3 font-semibold">Routing</th>
                  <th className="text-center py-3 px-3 font-semibold">Status</th>
                  <th className="text-center py-3 px-3 font-semibold">Default</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNumbers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{w.displayName}</td>
                    <td className="py-3 px-3 font-mono-tabular text-slate-800">{w.phoneNumber}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {[
                        w.receivesProductEnquiries ? 'Product Enquiries' : null,
                        w.receivesGeneralEnquiries ? 'General Enquiries' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'None'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          void toggleWhatsAppActive(w.id, !w.isActive).catch((err) =>
                            setActionError(err instanceof Error ? err.message : 'Update failed.')
                          )
                        }
                        className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                          w.isActive
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {w.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {w.isDefault ? (
                        <span className="inline-flex items-center gap-1 text-[#14452F] font-semibold">
                          <Star className="w-3.5 h-3.5 fill-[#14452F]" />
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void setDefaultWhatsAppNumber(w.id).catch((err) =>
                              setActionError(err instanceof Error ? err.message : 'Update failed.')
                            )
                          }
                          className="text-slate-500 hover:text-[#14452F] underline"
                        >
                          Set Default
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openWaEdit(w)}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                          aria-label={`Edit ${w.displayName}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteWa(w)}
                          className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                          aria-label={`Remove ${w.displayName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit WhatsApp Modal */}
      {waModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {editingWa ? 'Edit WhatsApp Number' : 'Add WhatsApp Number'}
              </h3>
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {waError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {waError}
              </div>
            )}

            <form onSubmit={handleSaveWa} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={waDisplayName}
                  onChange={(e) => setWaDisplayName(e.target.value)}
                  placeholder="e.g. Primary Wholesale Desk"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  International Phone Number (with country code) *
                </label>
                <input
                  type="tel"
                  required
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="+917585841977"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waActive}
                    onChange={(e) => setWaActive(e.target.checked)}
                    className="rounded border-slate-300 text-[#14452F]"
                  />
                  <span className="font-medium text-slate-800">Active (available on website)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waDefault}
                    onChange={(e) => setWaDefault(e.target.checked)}
                    className="rounded border-slate-300 text-[#14452F]"
                  />
                  <span className="font-medium text-slate-800">Set as Default WhatsApp Number</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waProduct}
                    onChange={(e) => setWaProduct(e.target.checked)}
                    className="rounded border-slate-300 text-[#14452F]"
                  />
                  <span className="font-medium text-slate-800">Receives Product Enquiries</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waGeneral}
                    onChange={(e) => setWaGeneral(e.target.checked)}
                    className="rounded border-slate-300 text-[#14452F]"
                  />
                  <span className="font-medium text-slate-800">Receives General Enquiries</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWaModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWa}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] disabled:opacity-50 rounded-lg"
                >
                  {savingWa ? 'Saving...' : 'Save Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDeleteWa)}
        title={`Remove WhatsApp number "${confirmDeleteWa?.displayName}"?`}
        description={`Number ${confirmDeleteWa?.phoneNumber || ''} will be deleted. If this was the default number, enquiries will automatically fall back to another active number.`}
        confirmLabel="Confirm Remove"
        busy={deleteBusy}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteWa(null)}
      />
    </div>
  );
}
