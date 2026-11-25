import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  History,
  Layout,
  Megaphone,
  Monitor,
  Palette,
  Save,
  Send,
  Smartphone,
  SlidersHorizontal,
  FileText,
  X,
} from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { CmsHomeRenderer } from '../components/CmsHomeRenderer';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { CmsVisualHomepagePanel } from '../components/cms/CmsVisualHomepagePanel';
import { CmsHeaderFooterPanel } from '../components/cms/CmsHeaderFooterPanel';
import { CmsGeneralWhatsAppPanel } from '../components/cms/CmsGeneralWhatsAppPanel';
import { CmsDesignSeoPanel } from '../components/cms/CmsDesignSeoPanel';
import { CmsPagesPanel } from '../components/cms/CmsPagesPanel';
import { CmsAnnouncementsPanel } from '../components/cms/CmsAnnouncementsPanel';
import { CmsRevisionsModal } from '../components/cms/CmsRevisionsModal';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import {
  buildDefaultCmsConfig,
  createDefaultSystemPages,
  getDesignCssStyle,
  isAnnouncementActiveOnDate,
} from '../lib/cmsDefaults';
import { STUDIO_MEDIA_ASSETS } from '../lib/constants';
import {
  subscribeAdminWhatsAppNumbers,
  subscribeAllCategories,
  subscribePublicProducts,
} from '../services/firestoreService';
import {
  publishCmsConfig,
  restoreRevisionToDraft,
  saveDraftCmsConfig,
  subscribeAllAnnouncements,
  subscribeAllCmsPages,
  subscribeCmsRevisions,
  subscribeDraftCmsConfig,
  subscribePublishedCmsConfig,
  unpublishCmsConfig,
} from '../services/cmsService';
import type {
  Announcement,
  Category,
  CmsConfigDocument,
  CmsPage,
  CmsRevision,
  PublicProduct,
  WhatsAppNumber,
} from '../types';

type EditorTab =
  | 'visual'
  | 'header-footer'
  | 'general'
  | 'design-seo'
  | 'pages'
  | 'announcements';

export function WebsiteEditorPage() {
  const { user, isAdmin, isViewer, authReady } = useAuth();
  const { settings } = useCompany();

  const [tab, setTab] = useState<EditorTab>('visual');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [previewPath, setPreviewPath] = useState<string>('/');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>('sec_hero');

  // Firestore CMS & Catalogue Subscriptions
  const [draft, setDraft] = useState<CmsConfigDocument>(() => buildDefaultCmsConfig(settings));
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const [publishedDoc, setPublishedDoc] = useState<CmsConfigDocument | null>(null);
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [allPages, setAllPages] = useState<CmsPage[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);

  // Actions & Modals
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false);
  const [publishNote, setPublishNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !isAdmin) return;

    const unsubs = [
      subscribeDraftCmsConfig((cfg, exists) => {
        if (!hasLocalEdits) {
          setDraft(exists ? cfg : buildDefaultCmsConfig(settings));
        }
        setDraftInitialized(true);
      }),
      subscribePublishedCmsConfig((cfg) => {
        setPublishedDoc(cfg);
      }),
      subscribeCmsRevisions(setRevisions),
      subscribeAllCmsPages(setAllPages),
      subscribeAllAnnouncements(setAllAnnouncements),
      subscribePublicProducts(setProducts),
      subscribeAllCategories((cats) => setCategories(cats.filter((c) => c.active))),
      subscribeAdminWhatsAppNumbers(setWhatsappNumbers),
    ];

    return () => unsubs.forEach((u) => u());
  }, [authReady, isAdmin]);

  const updateDraft = (updater: (prev: CmsConfigDocument) => CmsConfigDocument) => {
    setHasLocalEdits(true);
    setDraft((prev) => updater(prev));
  };

  const previewAnnouncements = useMemo(
    () => allAnnouncements.filter((a) => isAnnouncementActiveOnDate(a)),
    [allAnnouncements]
  );

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9] text-sm text-slate-600">
        Verifying administrator session...
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) {
    if (isViewer) return <Navigate to="/viewer" replace />;
    return <Navigate to="/admin/login" replace />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setErrorBanner(null);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setErrorBanner(null);
    try {
      const ver = await saveDraftCmsConfig(draft, 'Saved draft in Website Control Panel');
      setDraft((prev) => ({ ...prev, status: 'DRAFT', version: ver }));
      setHasLocalEdits(false);
      showToast(`Draft saved (v${ver}). Public website remains unchanged until published.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setErrorBanner(null);
    try {
      const ver = await publishCmsConfig(
        draft,
        publishNote.trim() || 'Published updates from Website Control Panel'
      );
      setDraft((prev) => ({ ...prev, status: 'PUBLISHED', version: ver }));
      setHasLocalEdits(false);
      setConfirmPublishOpen(false);
      setPublishNote('');
      showToast(`Published live (v${ver}). All public visitors now see your updates.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to publish changes.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setUnpublishing(true);
    setErrorBanner(null);
    try {
      const target = publishedDoc || draft;
      const ver = await unpublishCmsConfig(target);
      setConfirmUnpublishOpen(false);
      showToast(`Custom CMS unpublished (v${ver}). Public site reverted to default baseline.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to unpublish.');
    } finally {
      setUnpublishing(false);
    }
  };

  const handleRestoreRevision = async (rev: CmsRevision) => {
    setRestoringId(rev.id);
    setErrorBanner(null);
    try {
      const restored = await restoreRevisionToDraft(rev);
      setDraft(restored);
      setHasLocalEdits(false);
      setRevisionsOpen(false);
      showToast(
        `Restored v${rev.version} into Draft. Review the preview and click Publish Changes to go live.`
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to restore revision.');
    } finally {
      setRestoringId(null);
    }
  };

  const isPublishedLive = publishedDoc?.status === 'PUBLISHED';

  const renderPreviewBody = () => {
    const designStyle = getDesignCssStyle(draft.design);
    const displayFont = { fontFamily: `'${draft.design.displayFont || 'Fraunces'}', Georgia, serif` };

    if (previewPath === '/' || previewPath === '') {
      return (
        <CmsHomeRenderer
          cms={draft}
          products={products}
          categories={categories}
          announcements={previewAnnouncements}
          whatsappNumbers={whatsappNumbers}
          previewMode={true}
          selectedSectionId={selectedSectionId}
          onSelectSection={(secId) => {
            setSelectedSectionId(secId);
            setTab('visual');
          }}
          onPreviewNavigate={(path) => setPreviewPath(path)}
        />
      );
    }

    if (previewPath.startsWith('/products')) {
      return (
        <div style={designStyle} className="py-10 px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-black/10 pb-4">
            <h1 className="text-3xl font-semibold" style={displayFont}>
              Wholesale Jute Catalogue
            </h1>
            <p className="text-sm opacity-75 mt-1">
              Live product preview ({products.length} active SKUs)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((prod) => (
              <ProductCard
                key={prod.productId}
                product={prod}
                onRequestQuote={() => {}}
              />
            ))}
          </div>
        </div>
      );
    }

    const customSlug = previewPath.startsWith('/p/')
      ? previewPath.slice(3)
      : previewPath.replace(/^\//, '');
    const matchedPage =
      allPages.find((p) => p.slug === customSlug) ||
      createDefaultSystemPages(settings).find((p) => p.slug === customSlug);

    if (previewPath === '/about') {
      const title = matchedPage?.title || draft.general.companyName;
      const sub = matchedPage?.subtitle || draft.homepage.aboutSummary;
      const body = matchedPage?.content || draft.homepage.aboutStory;
      const img =
        matchedPage?.heroImage ||
        draft.homepage.aboutImageUrl ||
        STUDIO_MEDIA_ASSETS.aboutCraftsmanship;

      return (
        <div style={designStyle} className="py-12 px-4 sm:px-8 space-y-8">
          <div className="max-w-3xl space-y-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: draft.design.primaryColor }}
            >
              About Company
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold" style={displayFont}>
              {title}
            </h1>
            <p className="text-base opacity-80">{sub}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <p className="lg:col-span-7 text-sm leading-relaxed opacity-85 whitespace-pre-line">
              {body}
            </p>
            <div className="lg:col-span-5 aspect-[4/3] rounded-xl overflow-hidden border border-black/10">
              <SafeImage src={img} alt={title} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      );
    }

    if (previewPath === '/contact') {
      return (
        <div style={designStyle} className="py-12 px-4 sm:px-8 space-y-6">
          <div className="max-w-2xl space-y-2 border-b border-black/10 pb-4">
            <h1 className="text-3xl font-semibold" style={displayFont}>
              {matchedPage?.title || `Contact ${draft.general.companyName}`}
            </h1>
            <p className="text-sm opacity-80">
              {matchedPage?.subtitle ||
                'Direct wholesale phone, email, address & WhatsApp enquiry desk.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div
              className="p-5 rounded-xl border border-black/10 space-y-3"
              style={{ backgroundColor: draft.design.surfaceColor }}
            >
              <p>
                <strong>Phones:</strong> {draft.general.contactNumbers.join(', ')}
              </p>
              <p>
                <strong>Email:</strong> {draft.general.email}
              </p>
              <p>
                <strong>Address:</strong> {draft.general.address}
              </p>
            </div>
            <div className="p-5 rounded-xl border border-black/10 bg-white text-slate-600 text-xs flex items-center justify-center">
              Live General Wholesale &amp; WhatsApp Enquiry Form renders here for public buyers.
            </div>
          </div>
        </div>
      );
    }

    if (matchedPage) {
      return (
        <div style={designStyle} className="py-12 px-4 sm:px-8 space-y-6">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl sm:text-4xl font-semibold" style={displayFont}>
              {matchedPage.title}
            </h1>
            {matchedPage.subtitle && <p className="text-base opacity-80">{matchedPage.subtitle}</p>}
          </div>
          {matchedPage.heroImage && (
            <div className="aspect-[16/7] rounded-xl overflow-hidden border border-black/10">
              <SafeImage
                src={matchedPage.heroImage}
                alt={matchedPage.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="text-sm leading-relaxed opacity-90 whitespace-pre-line">
            {matchedPage.content}
          </div>
        </div>
      );
    }

    return (
      <div style={designStyle} className="py-16 px-6 text-center space-y-3">
        <p className="text-sm opacity-75">Preview route: {previewPath}</p>
        <button
          type="button"
          onClick={() => setPreviewPath('/')}
          className="px-4 py-2 text-xs font-semibold text-white rounded-lg"
          style={{ backgroundColor: draft.design.primaryColor }}
        >
          Back to Homepage Preview
        </button>
      </div>
    );
  };

  const renderPreviewFrame = (isFullscreen = false) => (
    <div
      className={`mx-auto bg-white shadow-sm border border-slate-300 overflow-hidden flex flex-col transition-all duration-200 ${
        deviceMode === 'mobile' && !isFullscreen
          ? 'w-[390px] rounded-2xl min-h-[700px]'
          : 'w-full rounded-xl min-h-full'
      }`}
    >
      <PublicHeader
        cmsOverride={draft}
        announcementsOverride={previewAnnouncements}
        pagesOverride={allPages}
        previewMode={true}
        onPreviewNavigate={(path) => setPreviewPath(path)}
      />
      <div className="flex-1 flex flex-col">{renderPreviewBody()}</div>
      <PublicFooter
        cmsOverride={draft}
        previewMode={true}
        onPreviewNavigate={(path) => setPreviewPath(path)}
      />
    </div>
  );

  const editorTabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'visual', label: 'Visual & Home', icon: <Layout className="w-3.5 h-3.5" /> },
    { id: 'header-footer', label: 'Header & Footer', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'general', label: 'General & WA', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'design-seo', label: 'Design & SEO', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'pages', label: 'Pages', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'announcements', label: 'Notices', icon: <Megaphone className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      <PageMeta
        title={`Website Control Panel – ${draft.general.companyName}`}
        description="Admin visual website editor, page manager, theme customizer, and draft/publish CMS."
      />

      {/* Top Control Toolbar */}
      <header className="h-14 bg-[#0E3121] text-white px-4 flex items-center justify-between gap-3 shrink-0 border-b border-white/15">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Admin
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm font-semibold truncate">
                Website Control Panel
              </h1>
              <span className="font-mono-tabular text-[11px] px-1.5 py-0.5 rounded bg-white/15 text-emerald-100">
                v{draft.version}
              </span>
              {hasLocalEdits ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 font-medium whitespace-nowrap">
                  Unsaved Edits
                </span>
              ) : isPublishedLive ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 font-medium whitespace-nowrap">
                  Published Live
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-400/25 text-slate-200 font-medium whitespace-nowrap">
                  Unpublished
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Preview Controls */}
        <div className="hidden md:flex items-center gap-2">
          <select
            value={previewPath}
            onChange={(e) => setPreviewPath(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none"
            aria-label="Preview page route"
          >
            <option value="/" className="text-slate-900">Preview: Homepage (/)</option>
            <option value="/products" className="text-slate-900">Preview: Products (/products)</option>
            <option value="/about" className="text-slate-900">Preview: About Us (/about)</option>
            <option value="/contact" className="text-slate-900">Preview: Contact (/contact)</option>
            {allPages
              .filter((p) => !p.isSystemPage)
              .map((p) => (
                <option key={p.pageId} value={`/p/${p.slug}`} className="text-slate-900">
                  Preview: {p.title} (/p/{p.slug})
                </option>
              ))}
          </select>

          <div className="inline-flex bg-white/10 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                deviceMode === 'desktop' ? 'bg-white text-[#0E3121] font-semibold' : 'text-white/80'
              }`}
              title="Desktop preview"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                deviceMode === 'mobile' ? 'bg-white text-[#0E3121] font-semibold' : 'text-white/80'
              }`}
              title="Mobile preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Publish & Draft Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRevisionsOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>

          <button
            type="button"
            onClick={() => setFullPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Preview</span>
          </button>

          <button
            type="button"
            disabled={savingDraft || !draftInitialized}
            onClick={() => void handleSaveDraft()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 disabled:opacity-50 rounded-lg whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>

          {isPublishedLive && (
            <button
              type="button"
              onClick={() => setConfirmUnpublishOpen(true)}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-100 bg-red-600/40 hover:bg-red-600/70 rounded-lg whitespace-nowrap"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Unpublish
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmPublishOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0E3121] bg-emerald-300 hover:bg-emerald-200 rounded-lg whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            Publish Changes
          </button>
        </div>
      </header>

      {/* Feedback Banner */}
      {(toastMessage || errorBanner) && (
        <div
          className={`px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 shrink-0 ${
            errorBanner
              ? 'bg-red-50 text-red-800 border-b border-red-200'
              : 'bg-[#ECF4EF] text-[#14452F] border-b border-[#14452F]/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{errorBanner || toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setToastMessage(null);
              setErrorBanner(null);
            }}
            className="p-0.5 hover:opacity-70"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Split Screen Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANEL: Editing Controls */}
        <aside className="w-full lg:w-[440px] xl:w-[470px] bg-[#F8FAF9] border-r border-slate-200 flex flex-col shrink-0 min-h-0">
          {/* Tab Switcher */}
          <div className="p-2 bg-white border-b border-slate-200 grid grid-cols-3 gap-1 shrink-0">
            {editorTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-[#14452F] text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Scrollable Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {tab === 'visual' && (
              <CmsVisualHomepagePanel
                draft={draft}
                onChange={updateDraft}
                selectedSectionId={selectedSectionId}
                onSelectSection={setSelectedSectionId}
              />
            )}
            {tab === 'header-footer' && (
              <CmsHeaderFooterPanel draft={draft} onChange={updateDraft} />
            )}
            {tab === 'general' && (
              <CmsGeneralWhatsAppPanel
                draft={draft}
                onChange={updateDraft}
                whatsappNumbers={whatsappNumbers}
              />
            )}
            {tab === 'design-seo' && (
              <CmsDesignSeoPanel draft={draft} onChange={updateDraft} />
            )}
            {tab === 'pages' && (
              <CmsPagesPanel
                pages={allPages}
                settings={settings}
                onPreviewPage={(page) => {
                  setPreviewPath(page.isSystemPage ? `/${page.slug}` : `/p/${page.slug}`);
                }}
              />
            )}
            {tab === 'announcements' && (
              <CmsAnnouncementsPanel announcements={allAnnouncements} />
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: Real-Time Live Website Preview */}
        <section className="flex-1 bg-slate-200/80 flex flex-col min-w-0 min-h-0">
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono-tabular text-slate-600 truncate">
                https://gazijuteenterprises.com{previewPath}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              {tab === 'visual'
                ? 'Click any section in preview to edit · Draft mode'
                : 'Real-time draft preview · Not public until published'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {renderPreviewFrame(false)}
          </div>
        </section>
      </div>

      {/* Fullscreen Interactive Live Preview Modal */}
      {fullPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex flex-col">
          <div className="h-12 bg-[#0E3121] text-white px-4 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold">Live Draft Preview</span>
              <span className="opacity-75">
                Inspecting unpublished changes ({previewPath})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeviceMode((m) => (m === 'desktop' ? 'mobile' : 'desktop'))}
                className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded"
              >
                {deviceMode === 'desktop' ? 'Switch to Mobile' : 'Switch to Desktop'}
              </button>
              <button
                type="button"
                onClick={() => setFullPreviewOpen(false)}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white text-[#0E3121] rounded"
              >
                <X className="w-3.5 h-3.5" />
                Exit Preview
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200">
            <div
              className={`mx-auto ${
                deviceMode === 'mobile' ? 'max-w-[390px]' : 'max-w-7xl'
              }`}
            >
              {renderPreviewFrame(true)}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Publish Changes Modal */}
      {confirmPublishOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Publish Website Changes Live?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will immediately push your visual layout, header, footer, design colors,
              typography, company details, and SEO settings to the public website for all buyers.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Revision Note (optional)
              </label>
              <input
                type="text"
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
                placeholder="e.g. Updated seasonal banner and emerald theme"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPublishOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={() => void handlePublish()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Unpublish Modal */}
      {confirmUnpublishOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Unpublish Custom CMS Layout?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your draft edits will remain safely saved inside the editor, while the live public
              website reverts to baseline company settings until you publish again.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUnpublishOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unpublishing}
                onClick={() => void handleUnpublish()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg disabled:opacity-50"
              >
                {unpublishing ? 'Unpublishing...' : 'Confirm Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {revisionsOpen && (
        <CmsRevisionsModal
          revisions={revisions}
          restoringId={restoringId}
          onRestore={handleRestoreRevision}
          onClose={() => setRevisionsOpen(false)}
        />
      )}
    </div>
  );
}
