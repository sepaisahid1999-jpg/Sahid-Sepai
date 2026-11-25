import React, { useState } from 'react';
import { ExternalLink, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { CmsImageField } from './CmsImageField';
import { createDefaultSystemPages } from '../../lib/cmsDefaults';
import { deleteCmsPage, saveCmsPage, slugifyCmsSlug, uploadCmsAsset } from '../../services/cmsService';
import type { CmsPage, CmsPageStatus, CompanySettings } from '../../types';

interface CmsPagesPanelProps {
  pages: CmsPage[];
  settings: CompanySettings;
  onPreviewPage?: (page: CmsPage) => void;
}

export function CmsPagesPanel({ pages, settings, onPreviewPage }: CmsPagesPanelProps) {
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CmsPage | null>(null);

  const startNewPage = () => {
    setMessage(null);
    setEditingPage({
      id: '',
      pageId: '',
      slug: 'quality-standards',
      title: 'Quality & Export Grading Standards',
      subtitle: 'Moisture limits, bale weight tolerance, and commercial testing criteria.',
      heroImage: '',
      content:
        'Describe your wholesale jute supply standards, dispatch terms, and buyer documentation here.',
      galleryImages: [],
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      seoOgImage: '',
      status: 'DRAFT',
      isSystemPage: false,
      showInNav: true,
    });
  };

  const handleSeedSystemPages = async () => {
    setSeeding(true);
    setMessage(null);
    try {
      const defaults = createDefaultSystemPages(settings);
      for (const p of defaults) {
        await saveCmsPage(
          {
            slug: p.slug,
            title: p.title,
            subtitle: p.subtitle,
            heroImage: p.heroImage,
            content: p.content,
            galleryImages: p.galleryImages,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            seoKeywords: p.seoKeywords,
            seoOgImage: p.seoOgImage,
            status: p.status,
            isSystemPage: p.isSystemPage,
            showInNav: p.showInNav,
          },
          p.pageId
        );
      }
      setMessage('System pages (About Us & Contact Us) initialized in CMS.');
    } finally {
      setSeeding(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPage) return;
    setUploadingGallery(true);
    try {
      const url = await uploadCmsAsset(file, 'pages-gallery');
      setEditingPage((prev) =>
        prev ? { ...prev, galleryImages: [...prev.galleryImages, url].slice(0, 8) } : prev
      );
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    setSaving(true);
    setMessage(null);
    try {
      const savedId = await saveCmsPage(
        {
          slug: editingPage.isSystemPage
            ? editingPage.slug
            : slugifyCmsSlug(editingPage.slug || editingPage.title),
          title: editingPage.title,
          subtitle: editingPage.subtitle,
          heroImage: editingPage.heroImage,
          content: editingPage.content,
          galleryImages: editingPage.galleryImages,
          seoTitle: editingPage.seoTitle,
          seoDescription: editingPage.seoDescription,
          seoKeywords: editingPage.seoKeywords,
          seoOgImage: editingPage.seoOgImage,
          status: editingPage.status,
          isSystemPage: editingPage.isSystemPage,
          showInNav: editingPage.showInNav,
        },
        editingPage.pageId || undefined
      );
      setMessage(`Saved "${editingPage.title}" (${editingPage.status}).`);
      if (!editingPage.pageId) {
        setEditingPage((prev) => (prev ? { ...prev, id: savedId, pageId: savedId } : prev));
      }
    } finally {
      setSaving(false);
    }
  };

  const hasSystemPages =
    pages.some((p) => p.slug === 'about') &&
    pages.some((p) => p.slug === 'contact') &&
    pages.some((p) => p.slug === 'privacy-policy') &&
    pages.some((p) => p.slug === 'terms-and-conditions');

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Page Management</h3>
            <p className="text-[11px] text-slate-500">
              Manage About Us, Contact Us, Privacy Policy, Terms &amp; custom pages.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewPage}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#14452F] rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            New Page
          </button>
        </div>

        {!hasSystemPages && (
          <div className="p-3 rounded-lg bg-[#F8FAF9] border border-slate-200 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-700">
              Initialize About Us, Contact Us, Privacy Policy &amp; Terms in CMS.
            </span>
            <button
              type="button"
              disabled={seeding}
              onClick={() => void handleSeedSystemPages()}
              className="px-2.5 py-1 font-semibold text-white bg-[#14452F] rounded-lg whitespace-nowrap"
            >
              {seeding ? 'Seeding...' : 'Initialize Pages'}
            </button>
          </div>
        )}

        {message && (
          <div className="p-2.5 rounded-lg bg-[#ECF4EF] border border-[#14452F]/20 text-xs text-[#14452F]">
            {message}
          </div>
        )}

        <div className="space-y-2">
          {pages.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No CMS pages saved yet. Create a new page or initialize About &amp; Contact pages.
            </p>
          ) : (
            pages.map((p) => {
              const publicPath = p.isSystemPage ? `/${p.slug}` : `/p/${p.slug}`;
              return (
                <div
                  key={p.pageId}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 text-xs hover:border-slate-300"
                >
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      setMessage(null);
                      setEditingPage(p);
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <FileText className="w-3.5 h-3.5 text-[#14452F] shrink-0" />
                      <span className="truncate">{p.title}</span>
                    </div>
                    <div className="text-[11px] font-mono-tabular text-slate-500 truncate">
                      {publicPath} · {p.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onPreviewPage && (
                      <button
                        type="button"
                        onClick={() => onPreviewPage(p)}
                        className="px-2 py-1 text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Preview
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setEditingPage(p);
                      }}
                      className="px-2 py-1 text-[10px] font-semibold text-[#14452F] bg-[#ECF4EF] rounded"
                    >
                      Edit
                    </button>
                    {!p.isSystemPage && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(p)}
                        className="p-1 text-slate-400 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Page Form */}
      {editingPage && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-semibold text-slate-900">
              {editingPage.pageId ? `Editing: ${editingPage.title}` : 'Create New Page'}
            </h4>
            <button
              type="button"
              onClick={() => setEditingPage(null)}
              className="text-[11px] text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Page Title *
              </label>
              <input
                type="text"
                required
                value={editingPage.title}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                required
                disabled={editingPage.isSystemPage}
                value={editingPage.slug}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Subtitle</label>
            <input
              type="text"
              value={editingPage.subtitle}
              onChange={(e) => setEditingPage({ ...editingPage, subtitle: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <CmsImageField
            label="Page Hero Image"
            value={editingPage.heroImage}
            onChange={(url) => setEditingPage({ ...editingPage, heroImage: url })}
            folder="pages"
          />

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Page Content
            </label>
            <textarea
              rows={5}
              value={editingPage.content}
              onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          {/* Gallery Images */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-700">
                Gallery Images ({editingPage.galleryImages.length}/8)
              </label>
              <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#14452F] bg-[#ECF4EF] rounded cursor-pointer">
                <Upload className="w-3 h-3" />
                {uploadingGallery ? 'Uploading...' : 'Add Image'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingGallery}
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
              </label>
            </div>
            {editingPage.galleryImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editingPage.galleryImages.map((img, i) => (
                  <div key={`${img}-${i}`} className="relative w-14 h-12 rounded border border-slate-200 overflow-hidden">
                    <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPage({
                          ...editingPage,
                          galleryImages: editingPage.galleryImages.filter((_, idx) => idx !== i),
                        })
                      }
                      className="absolute top-0 right-0 bg-red-700 text-white text-[9px] px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Page-specific SEO */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <span className="block text-[11px] font-semibold text-slate-800">
              Page-Specific SEO Settings
            </span>
            <input
              type="text"
              value={editingPage.seoTitle}
              onChange={(e) => setEditingPage({ ...editingPage, seoTitle: e.target.value })}
              placeholder="SEO Title override"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
            <textarea
              rows={2}
              value={editingPage.seoDescription}
              onChange={(e) => setEditingPage({ ...editingPage, seoDescription: e.target.value })}
              placeholder="SEO Meta Description override"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={editingPage.seoKeywords}
              onChange={(e) => setEditingPage({ ...editingPage, seoKeywords: e.target.value })}
              placeholder="Keywords (comma-separated)"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Publish Status
              </label>
              <select
                value={editingPage.status}
                onChange={(e) =>
                  setEditingPage({ ...editingPage, status: e.target.value as CmsPageStatus })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="PUBLISHED">PUBLISHED (Live)</option>
                <option value="DRAFT">DRAFT (Hidden)</option>
              </select>
            </div>
            {!editingPage.isSystemPage && (
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer pt-5">
                <input
                  type="checkbox"
                  checked={editingPage.showInNav}
                  onChange={(e) => setEditingPage({ ...editingPage, showInNav: e.target.checked })}
                  className="rounded border-slate-300 text-[#14452F]"
                />
                Show in Header Menu
              </label>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {editingPage.status === 'PUBLISHED' && editingPage.pageId && (
              <a
                href={editingPage.isSystemPage ? `/${editingPage.slug}` : `/p/${editingPage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#14452F] hover:underline"
              >
                Open Live URL
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              type="submit"
              disabled={saving}
              className="ml-auto px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </form>
      )}

      {/* Confirmation modal for deleting custom pages */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h4 className="font-display text-base font-semibold text-slate-900">
              Delete Custom Page?
            </h4>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{confirmDelete.title}</strong> (/p/
              {confirmDelete.slug})?
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
                  await deleteCmsPage(confirmDelete.pageId);
                  if (editingPage?.pageId === confirmDelete.pageId) setEditingPage(null);
                  setConfirmDelete(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 rounded-lg"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
