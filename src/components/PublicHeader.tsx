import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Megaphone, Menu, X } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import type { Announcement, CmsConfigDocument, CmsPage } from '../types';

interface PublicHeaderProps {
  cmsOverride?: CmsConfigDocument;
  announcementsOverride?: Announcement[];
  pagesOverride?: CmsPage[];
  previewMode?: boolean;
  onPreviewNavigate?: (path: string) => void;
}

export function PublicHeader({
  cmsOverride,
  announcementsOverride,
  pagesOverride,
  previewMode = false,
  onPreviewNavigate,
}: PublicHeaderProps) {
  const { cmsConfig, activeAnnouncements, publishedPages } = useCompany();
  const { isAdmin, isViewer } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const cms = cmsOverride || cmsConfig;
  const announcements = announcementsOverride ?? activeAnnouncements;
  const pages = pagesOverride ?? publishedPages;
  const { header, general, design } = cms;

  const portalPath = isAdmin ? '/admin' : isViewer ? '/viewer' : '/admin/login';
  const portalLabel = isAdmin ? 'Admin' : isViewer ? 'Viewer' : 'Portal';

  // Combine configured menu items + published CMS custom pages flagged showInNav
  const baseNavItems = header.navItems.filter((item) => item.visible);
  const existingPaths = new Set(baseNavItems.map((i) => i.path));
  const extraPageNavItems = pages
    .filter((p) => p.status === 'PUBLISHED' && p.showInNav && !p.isSystemPage)
    .map((p) => ({
      id: p.pageId,
      label: p.title,
      path: `/p/${p.slug}`,
      visible: true,
    }))
    .filter((p) => !existingPaths.has(p.path));

  const combinedNav = [...baseNavItems, ...extraPageNavItems];

  const buttonRadius =
    design.buttonStyle === 'pill'
      ? '9999px'
      : design.buttonStyle === 'sharp'
        ? '0.125rem'
        : '0.5rem';

  const topAnnouncement = announcements[0];

  const renderBrand = () => {
    const content = (
      <span
        className="inline-flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight whitespace-nowrap shrink-0"
        style={{
          fontFamily: `'${design.displayFont || 'Fraunces'}', Georgia, serif`,
          color: header.textColor || design.primaryColor,
        }}
      >
        {general.logoUrl ? (
          <img
            src={general.logoUrl}
            alt={general.companyName}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded object-cover border border-black/10 shrink-0"
          />
        ) : (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded text-white text-xs font-bold tracking-wider shrink-0"
            style={{ backgroundColor: design.primaryColor }}
            aria-hidden="true"
          >
            {(general.companyName || 'GJ').slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="truncate max-w-[190px] sm:max-w-none">{general.companyName}</span>
      </span>
    );

    if (previewMode) {
      return (
        <button
          type="button"
          onClick={() => onPreviewNavigate?.('/')}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] rounded"
        >
          {content}
        </button>
      );
    }

    return (
      <Link
        to="/"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] rounded"
      >
        {content}
      </Link>
    );
  };

  const renderNavLinks = (isMobile = false) => (
    <>
      {combinedNav.map((item) =>
        previewMode ? (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onPreviewNavigate?.(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            className={
              isMobile
                ? 'flex items-center w-full min-h-[44px] text-left px-3 text-sm font-medium rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]'
                : 'text-sm font-medium transition-opacity hover:opacity-75 whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] rounded'
            }
            style={{ color: header.textColor || '#13221A' }}
          >
            {item.label}
          </button>
        ) : (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            onClick={() => isMobile && setMobileOpen(false)}
            className={({ isActive }) =>
              isMobile
                ? `flex items-center min-h-[44px] px-3 text-sm font-medium rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] ${
                    isActive ? 'bg-black/5 font-semibold' : ''
                  }`
                : `text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] ${
                    isActive ? 'opacity-100' : 'opacity-75 border-transparent hover:opacity-100'
                  }`
            }
            style={({ isActive }) => ({
              color: header.textColor || '#13221A',
              borderColor: !isMobile && isActive ? design.primaryColor : 'transparent',
            })}
          >
            {item.label}
          </NavLink>
        )
      )}

      {!previewMode && (
        <NavLink
          to={portalPath}
          onClick={() => isMobile && setMobileOpen(false)}
          className={({ isActive }) =>
            isMobile
              ? 'flex items-center min-h-[44px] px-3 text-sm font-medium rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]'
              : `text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F] ${
                  isActive ? 'opacity-100' : 'opacity-75 border-transparent hover:opacity-100'
                }`
          }
          style={({ isActive }) => ({
            color: design.primaryColor,
            borderColor: !isMobile && isActive ? design.primaryColor : 'transparent',
          })}
        >
          {portalLabel}
        </NavLink>
      )}
    </>
  );

  const renderCta = (fullWidth = false) => {
    if (!header.showContactButton) return null;
    const classes = fullWidth
      ? 'flex items-center justify-center w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14452F]'
      : 'hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14452F]';
    const style = {
      backgroundColor: design.primaryColor,
      borderRadius: buttonRadius,
    };

    if (previewMode) {
      return (
        <button
          type="button"
          onClick={() => onPreviewNavigate?.(header.contactButtonUrl || '/contact')}
          className={classes}
          style={style}
        >
          {header.contactButtonText || 'Request Quote'}
        </button>
      );
    }

    return (
      <Link
        to={header.contactButtonUrl || '/contact'}
        onClick={() => setMobileOpen(false)}
        className={classes}
        style={style}
      >
        {header.contactButtonText || 'Request Quote'}
      </Link>
    );
  };

  if (!header.visible) {
    return topAnnouncement ? (
      <div
        className="text-xs py-2 px-4 text-center font-medium"
        style={{
          backgroundColor: topAnnouncement.bgColor || design.primaryColor,
          color: topAnnouncement.textColor || '#FFFFFF',
        }}
      >
        <span>{topAnnouncement.message}</span>
      </div>
    ) : null;
  }

  const headerHeightClass = header.layout === 'compact' ? 'h-14' : 'h-16';
  const isCenteredLogo = header.logoPosition === 'center' || header.layout === 'centered';
  const isRightLogo = header.logoPosition === 'right';

  return (
    <>
      {/* Slim Active Announcement Notice Bar (unpinned so sticky mobile header stays well under 15% cap) */}
      {topAnnouncement && (
        <div
          className="text-xs py-2 px-4 border-b border-black/10"
          style={{
            backgroundColor: topAnnouncement.bgColor || design.primaryColor,
            color: topAnnouncement.textColor || '#FFFFFF',
          }}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
              {topAnnouncement.title}:
            </span>
            <span className="opacity-95">{topAnnouncement.message}</span>
            {topAnnouncement.linkLabel && topAnnouncement.linkUrl && (
              previewMode ? (
                <button
                  type="button"
                  onClick={() => onPreviewNavigate?.(topAnnouncement.linkUrl)}
                  className="underline font-semibold hover:opacity-80"
                >
                  {topAnnouncement.linkLabel}
                </button>
              ) : (
                <Link
                  to={topAnnouncement.linkUrl}
                  className="underline font-semibold hover:opacity-80"
                >
                  {topAnnouncement.linkLabel}
                </Link>
              )
            )}
          </div>
        </div>
      )}

      <header
        className={`${
          header.sticky && !previewMode ? 'sticky top-0 z-40' : 'relative z-20'
        } border-b border-black/10 backdrop-blur-sm`}
        style={{
          backgroundColor: header.bgColor || '#FFFFFF',
          color: header.textColor || '#13221A',
        }}
      >
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${headerHeightClass} flex items-center justify-between gap-8`}
        >
          {isRightLogo ? (
            <>
              <div className="flex items-center gap-4">
                {renderCta(false)}
                <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
                  {renderNavLinks(false)}
                </nav>
              </div>
              <div className="flex items-center gap-3">
                {renderBrand()}
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]"
                  aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </>
          ) : isCenteredLogo ? (
            <>
              <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
                {renderNavLinks(false)}
              </nav>
              <div className="flex-shrink-0">{renderBrand()}</div>
              <div className="flex items-center gap-3 shrink-0">
                {renderCta(false)}
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]"
                  aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </>
          ) : (
            <>
              {renderBrand()}
              <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
                {renderNavLinks(false)}
              </nav>
              <div className="flex items-center gap-3 shrink-0">
                {renderCta(false)}
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14452F]"
                  aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div
            className="md:hidden border-t border-black/10 px-4 py-4 space-y-1.5"
            style={{ backgroundColor: header.bgColor || '#FFFFFF' }}
          >
            {renderNavLinks(true)}
            {header.showContactButton && <div className="pt-2">{renderCta(true)}</div>}
          </div>
        )}
      </header>
    </>
  );
}
