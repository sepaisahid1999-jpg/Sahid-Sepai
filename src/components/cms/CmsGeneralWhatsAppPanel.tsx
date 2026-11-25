import React, { useState } from 'react';
import { MessageCircle, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { CmsImageField } from './CmsImageField';
import { validateInternationalPhone } from '../../lib/whatsapp';
import {
  deleteWhatsAppNumber,
  saveWhatsAppNumber,
  setDefaultWhatsAppNumber,
  toggleWhatsAppActive,
} from '../../services/firestoreService';
import type { CmsConfigDocument, WhatsAppNumber } from '../../types';

interface CmsGeneralWhatsAppPanelProps {
  draft: CmsConfigDocument;
  onChange: (updater: (prev: CmsConfigDocument) => CmsConfigDocument) => void;
  whatsappNumbers: WhatsAppNumber[];
}

export function CmsGeneralWhatsAppPanel({
  draft,
  onChange,
  whatsappNumbers,
}: CmsGeneralWhatsAppPanelProps) {
  const { general } = draft;

  const [waModalOpen, setWaModalOpen] = useState(false);
  const [editingWa, setEditingWa] = useState<WhatsAppNumber | null>(null);
  const [waDisplayName, setWaDisplayName] = useState('');
  const [waPhone, setWaPhone] = useState('+91');
  const [waActive, setWaActive] = useState(true);
  const [waDefault, setWaDefault] = useState(false);
  const [waProduct, setWaProduct] = useState(true);
  const [waGeneral, setWaGeneral] = useState(true);
  const [waError, setWaError] = useState<string | null>(null);
  const [savingWa, setSavingWa] = useState(false);
  const [confirmDeleteWa, setConfirmDeleteWa] = useState<WhatsAppNumber | null>(null);

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
      setWaError(check.error || 'Enter a valid international WhatsApp number.');
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

  return (
    <div className="space-y-6">
      {/* 1. General Identity, Contact & Currency */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-semibold text-slate-900">General Company &amp; Branding</h3>
          <p className="text-[11px] text-slate-500">
            Company name, logo, favicon, contact phones, currency &amp; social channels.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={general.companyName}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  general: { ...p.general, companyName: e.target.value },
                  footer: { ...p.footer, companyName: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Official Email
            </label>
            <input
              type="email"
              value={general.email}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  general: { ...p.general, email: e.target.value },
                  footer: { ...p.footer, email: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">Tagline</label>
          <input
            type="text"
            value={general.tagline}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                general: { ...p.general, tagline: e.target.value },
              }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <CmsImageField
          label="Company Logo"
          value={general.logoUrl}
          onChange={(url) =>
            onChange((p) => ({
              ...p,
              general: { ...p.general, logoUrl: url },
            }))
          }
          folder="logo"
          showStudioPresets={false}
        />

        <CmsImageField
          label="Browser Favicon"
          value={general.faviconUrl}
          onChange={(url) =>
            onChange((p) => ({
              ...p,
              general: { ...p.general, faviconUrl: url },
            }))
          }
          folder="favicon"
          showStudioPresets={false}
        />

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Contact Phone Numbers (comma-separated)
          </label>
          <input
            type="text"
            value={general.contactNumbers.join(', ')}
            onChange={(e) => {
              const list = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              onChange((p) => ({
                ...p,
                general: { ...p.general, contactNumbers: list },
                footer: { ...p.footer, phoneNumbers: list },
              }));
            }}
            className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Business Address
          </label>
          <input
            type="text"
            value={general.address}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                general: { ...p.general, address: e.target.value },
                footer: { ...p.footer, address: e.target.value },
              }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Business Hours
            </label>
            <input
              type="text"
              value={general.businessHours}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  general: { ...p.general, businessHours: e.target.value },
                  footer: { ...p.footer, businessHours: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              GSTIN (optional)
            </label>
            <input
              type="text"
              value={general.gstNumber}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  general: { ...p.general, gstNumber: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Currency Code
            </label>
            <input
              type="text"
              value={general.currencyCode}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  general: { ...p.general, currencyCode: e.target.value.toUpperCase() },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Currency Symbol
            </label>
            <input
              type="text"
              value={general.currencySymbol}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  general: { ...p.general, currencySymbol: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Social Media Links */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="block text-xs font-semibold text-slate-800">Social Media Links</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['facebook', 'instagram', 'linkedin', 'youtube', 'twitter'] as const).map((net) => (
              <input
                key={net}
                type="url"
                value={general.socialLinks[net]}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    general: {
                      ...p.general,
                      socialLinks: {
                        ...p.general.socialLinks,
                        [net]: e.target.value,
                      },
                    },
                  }))
                }
                placeholder={`${net.charAt(0).toUpperCase() + net.slice(1)} URL`}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Live WhatsApp Number Management */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#14452F]" />
            <div>
              <h3 className="text-xs font-semibold text-slate-900">WhatsApp Number Management</h3>
              <p className="text-[11px] text-slate-500">
                Live Firestore routing with automatic active fallback.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openWaAdd}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#14452F] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {whatsappNumbers.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No WhatsApp numbers configured.</p>
          ) : (
            whatsappNumbers.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-medium text-slate-900">
                    <span className="truncate">{w.displayName}</span>
                    {w.isDefault && (
                      <Star className="w-3 h-3 text-[#14452F] fill-[#14452F] shrink-0" />
                    )}
                  </div>
                  <div className="font-mono-tabular text-[11px] text-slate-600">
                    {w.phoneNumber} · {w.receivesProductEnquiries ? 'Prod' : ''}{' '}
                    {w.receivesGeneralEnquiries ? 'Gen' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void toggleWhatsAppActive(w.id, !w.isActive)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      w.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {w.isActive ? 'Active' : 'Off'}
                  </button>
                  {!w.isDefault && (
                    <button
                      type="button"
                      onClick={() => void setDefaultWhatsAppNumber(w.id)}
                      className="px-2 py-0.5 text-[10px] text-slate-600 hover:text-[#14452F] underline"
                    >
                      Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openWaEdit(w)}
                    className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWa(w)}
                    className="p-1 text-slate-400 hover:text-red-700 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit WhatsApp Modal */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-display text-base font-semibold text-slate-900">
                {editingWa ? 'Edit WhatsApp Number' : 'Add WhatsApp Number'}
              </h4>
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="p-1 rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {waError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {waError}
              </div>
            )}

            <form onSubmit={handleSaveWa} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  value={waDisplayName}
                  onChange={(e) => setWaDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  International Number *
                </label>
                <input
                  type="tel"
                  required
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="+917585841977"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waActive}
                  onChange={(e) => setWaActive(e.target.checked)}
                />
                Active
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waDefault}
                  onChange={(e) => setWaDefault(e.target.checked)}
                />
                Set as Default
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waProduct}
                  onChange={(e) => setWaProduct(e.target.checked)}
                />
                Receives Product Enquiries
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waGeneral}
                  onChange={(e) => setWaGeneral(e.target.checked)}
                />
                Receives General Enquiries
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWaModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWa}
                  className="px-4 py-1.5 font-semibold text-white bg-[#14452F] rounded-lg"
                >
                  {savingWa ? 'Saving...' : 'Save Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Delete */}
      {confirmDeleteWa && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="font-display text-base font-semibold text-slate-900">
              Remove WhatsApp Number?
            </h4>
            <p className="text-xs text-slate-600">
              Confirm removing <strong>{confirmDeleteWa.displayName}</strong> (
              <span className="font-mono-tabular">{confirmDeleteWa.phoneNumber}</span>).
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteWa(null)}
                className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteWhatsAppNumber(confirmDeleteWa.id);
                  setConfirmDeleteWa(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 rounded-lg"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
