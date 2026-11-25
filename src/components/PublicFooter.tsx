import { Link } from 'react-router-dom';
import { Globe, MessageCircle } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { buildGeneralEnquiryMessage, buildWhatsAppUrl, selectWhatsAppNumber } from '../lib/whatsapp';
import type { CmsConfigDocument } from '../types';

interface PublicFooterProps {
  cmsOverride?: CmsConfigDocument;
  previewMode?: boolean;
  onPreviewNavigate?: (path: string) => void;
}

export function PublicFooter({
  cmsOverride,
  previewMode = false,
  onPreviewNavigate,
}: PublicFooterProps) {
  const { cmsConfig, activeWhatsAppNumbers } = useCompany();
  const cms = cmsOverride || cmsConfig;
  const { footer, general, design } = cms;

  if (!footer.visible) return null;

  const activeWa = selectWhatsAppNumber(activeWhatsAppNumbers, 'general');
  const displayName = footer.companyName || general.companyName;
  const displayLogo = footer.logoUrl || general.logoUrl;
  const displayPhones =
    footer.phoneNumbers.length > 0 ? footer.phoneNumbers : general.contactNumbers;
  const displayEmail = footer.email || general.email;
  const displayAddress = footer.address || general.address;

  const waHref = activeWa
    ? buildWhatsAppUrl(
        activeWa.phoneNumber,
        buildGeneralEnquiryMessage({
          companyName: displayName,
          buyerName: 'Wholesale Buyer',
          buyerLocation: 'India',
          message: 'Hello, I would like to request wholesale pricing for jute products.',
        })
      )
    : null;

  const socialEntries = [
    { key: 'facebook', label: 'Facebook', url: general.socialLinks.facebook },
    { key: 'instagram', label: 'Instagram', url: general.socialLinks.instagram },
    { key: 'linkedin', label: 'LinkedIn', url: general.socialLinks.linkedin },
    { key: 'youtube', label: 'YouTube', url: general.socialLinks.youtube },
    { key: 'twitter', label: 'X / Twitter', url: general.socialLinks.twitter },
  ].filter((item) => item.url && item.url.trim().length > 0);

  const visibleLinks = footer.navLinks.filter((l) => l.visible);
  const existingUrls = new Set(visibleLinks.map((l) => l.url));
  const ensureLegalLinks = [
    ...visibleLinks,
    ...(!existingUrls.has('/privacy-policy')
      ? [{ id: 'legal_privacy', label: 'Privacy Policy', url: '/privacy-policy', visible: true }]
      : []),
    ...(!existingUrls.has('/terms-and-conditions')
      ? [
          {
            id: 'legal_terms',
            label: 'Terms & Conditions',
            url: '/terms-and-conditions',
            visible: true,
          },
        ]
      : []),
  ];

  const buttonRadius =
    design.buttonStyle === 'pill'
      ? '9999px'
      : design.buttonStyle === 'sharp'
        ? '0.125rem'
        : '0.5rem';

  const renderFooterLink = (url: string, label: string) =>
    previewMode ? (
      <button
        type="button"
        onClick={() => onPreviewNavigate?.(url)}
        className="hover:underline text-left opacity-85 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
      >
        {label}
      </button>
    ) : (
      <Link
        to={url}
        className="hover:opacity-100 opacity-85 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
      >
        {label}
      </Link>
    );

  return (
    <footer
      className="border-t border-white/15"
      style={{
        backgroundColor: footer.bgColor || '#0E3121',
        color: footer.textColor || '#F1F5F9',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/15">
          {/* Brand & About */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              {displayLogo ? (
                <img
                  src={displayLogo}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded object-cover bg-white shrink-0"
                />
              ) : (
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded bg-white text-sm font-bold tracking-wider shrink-0"
                  style={{ color: design.primaryColor || '#14452F' }}
                  aria-hidden="true"
                >
                  {(displayName || 'GJ').slice(0, 2).toUpperCase()}
                </span>
              )}
              <div>
                <h2
                  className="text-lg font-semibold tracking-wide uppercase"
                  style={{ fontFamily: `'${design.displayFont || 'Fraunces'}', Georgia, serif` }}
                >
                  {displayName}
                </h2>
                {general.tagline && <p className="text-xs opacity-75">{general.tagline}</p>}
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed max-w-md">{footer.description}</p>
            {displayAddress && <p className="text-xs opacity-75">{displayAddress}</p>}
            <p className="text-xs opacity-70">
              Trade Currency: {general.currencyCode || 'INR'} ({general.currencySymbol || '₹'})
              {general.gstNumber ? ` · GSTIN: ${general.gstNumber}` : ''}
            </p>

            {footer.showSocialLinks && socialEntries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {socialEntries.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    <Globe className="w-3 h-3" />
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation & Legal Pages */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-75">
              Website Pages
            </h3>
            <ul className="space-y-2.5 text-sm">
              {ensureLegalLinks.map((link) => (
                <li key={link.id}>{renderFooterLink(link.url, link.label)}</li>
              ))}
            </ul>
          </div>

          {/* Contact & WhatsApp */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-75">
              Direct Contact
            </h3>
            <div className="space-y-2.5 text-sm opacity-90">
              <div>
                <span className="opacity-70 text-xs block">Phone Numbers:</span>
                <div className="font-mono-tabular space-y-1 mt-0.5">
                  {displayPhones.map((num, idx) => (
                    <div key={`${num}-${idx}`}>
                      <a
                        href={`tel:${num}`}
                        className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
                      >
                        {num}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-1">
                <span className="opacity-70 text-xs block">Email Address:</span>
                <a
                  href={`mailto:${displayEmail}`}
                  className="hover:underline break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
                >
                  {displayEmail}
                </a>
              </div>
            </div>

            {footer.showWhatsAppButton && (
              <div className="pt-2">
                {waHref && !previewMode ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white hover:opacity-90 transition-opacity whitespace-nowrap"
                    style={{
                      color: design.primaryColor || '#14452F',
                      borderRadius: buttonRadius,
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Enquiry
                  </a>
                ) : (
                  <Link
                    to="/contact"
                    onClick={(e) => {
                      if (previewMode) {
                        e.preventDefault();
                        onPreviewNavigate?.('/contact');
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white hover:opacity-90 transition-opacity whitespace-nowrap"
                    style={{
                      color: design.primaryColor || '#14452F',
                      borderRadius: buttonRadius,
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send Trade Enquiry
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs opacity-75">
          <p>{footer.copyrightText}</p>
          <div className="flex flex-wrap items-center gap-4">
            {renderFooterLink('/privacy-policy', 'Privacy Policy')}
            <span aria-hidden="true">·</span>
            {renderFooterLink('/terms-and-conditions', 'Terms & Conditions')}
            {(footer.businessHours || general.businessHours) && (
              <>
                <span aria-hidden="true">·</span>
                <span>{footer.businessHours || general.businessHours}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
