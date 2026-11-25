import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_COMPANY_SETTINGS } from '../lib/constants';
import {
  buildDefaultCmsConfig,
  getDesignCssStyle,
  isAnnouncementActiveOnDate,
} from '../lib/cmsDefaults';
import {
  subscribeActiveCategories,
  subscribeActiveWhatsAppNumbers,
  subscribeCompanySettings,
} from '../services/firestoreService';
import {
  subscribeActiveAnnouncements,
  subscribePublishedCmsConfig,
  subscribePublishedCmsPages,
} from '../services/cmsService';
import type {
  Announcement,
  Category,
  CmsConfigDocument,
  CmsPage,
  CompanySettings,
  WhatsAppNumber,
} from '../types';

interface CompanyContextValue {
  settings: CompanySettings;
  settingsExistInDb: boolean;
  activeWhatsAppNumbers: WhatsAppNumber[];
  activeCategories: Category[];
  loadingSettings: boolean;
  cmsConfig: CmsConfigDocument;
  cmsPublishedExists: boolean;
  publishedPages: CmsPage[];
  activeAnnouncements: Announcement[];
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [legacySettings, setLegacySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [settingsExistInDb, setSettingsExistInDb] = useState(true);
  const [activeWhatsAppNumbers, setActiveWhatsAppNumbers] = useState<WhatsAppNumber[]>([]);
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [publishedCms, setPublishedCms] = useState<CmsConfigDocument | null>(null);
  const [cmsPublishedExists, setCmsPublishedExists] = useState(false);
  const [publishedPages, setPublishedPages] = useState<CmsPage[]>([]);
  const [rawAnnouncements, setRawAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const unsubSettings = subscribeCompanySettings((data, exists) => {
      setLegacySettings(data);
      setSettingsExistInDb(exists);
      setLoadingSettings(false);
    });
    const unsubWa = subscribeActiveWhatsAppNumbers(setActiveWhatsAppNumbers);
    const unsubCats = subscribeActiveCategories(setActiveCategories);
    const unsubCms = subscribePublishedCmsConfig((cfg, exists) => {
      setPublishedCms(cfg);
      setCmsPublishedExists(exists);
    });
    const unsubPages = subscribePublishedCmsPages(setPublishedPages);
    const unsubAnn = subscribeActiveAnnouncements(setRawAnnouncements);

    return () => {
      unsubSettings();
      unsubWa();
      unsubCats();
      unsubCms();
      unsubPages();
      unsubAnn();
    };
  }, []);

  // Only expose published config when status === 'PUBLISHED'.
  // Unpublished or missing CMS falls back cleanly to baseline settings.
  const cmsConfig = useMemo<CmsConfigDocument>(() => {
    if (publishedCms && publishedCms.status === 'PUBLISHED') {
      return publishedCms;
    }
    return buildDefaultCmsConfig(legacySettings);
  }, [publishedCms, legacySettings]);

  // Synchronized CompanySettings view for downstream consumers
  const settings = useMemo<CompanySettings>(() => {
    if (publishedCms && publishedCms.status === 'PUBLISHED') {
      return {
        companyName: publishedCms.general.companyName || legacySettings.companyName,
        tagline: publishedCms.general.tagline || legacySettings.tagline,
        logoUrl: publishedCms.general.logoUrl || '',
        contactNumbers:
          publishedCms.general.contactNumbers.length > 0
            ? publishedCms.general.contactNumbers
            : legacySettings.contactNumbers,
        email: publishedCms.general.email || legacySettings.email,
        address: publishedCms.general.address || legacySettings.address,
        aboutSummary: publishedCms.homepage.aboutSummary || legacySettings.aboutSummary,
        aboutStory: publishedCms.homepage.aboutStory || legacySettings.aboutStory,
        footerCopyright: publishedCms.footer.copyrightText || legacySettings.footerCopyright,
        businessHours: publishedCms.general.businessHours || legacySettings.businessHours,
        gstNumber: publishedCms.general.gstNumber ?? legacySettings.gstNumber,
      };
    }
    return legacySettings;
  }, [publishedCms, legacySettings]);

  const activeAnnouncements = useMemo(
    () => rawAnnouncements.filter((a) => isAnnouncementActiveOnDate(a)),
    [rawAnnouncements]
  );

  // Sync design CSS variables and dynamic favicon into document root
  useEffect(() => {
    const styleVars = getDesignCssStyle(cmsConfig.design) as Record<string, string>;
    const root = document.documentElement;
    Object.entries(styleVars).forEach(([key, val]) => {
      if (key.startsWith('--cms-') && typeof val === 'string') {
        root.style.setProperty(key, val);
      }
    });
    if (cmsConfig.design.displayFont) {
      root.style.setProperty(
        '--font-display',
        `'${cmsConfig.design.displayFont}', Georgia, serif`
      );
    }
    if (cmsConfig.design.bodyFont) {
      root.style.setProperty(
        '--font-sans',
        `'${cmsConfig.design.bodyFont}', system-ui, -apple-system, sans-serif`
      );
    }

    if (cmsConfig.general.faviconUrl) {
      let linkEl = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.rel = 'icon';
        document.head.appendChild(linkEl);
      }
      linkEl.href = cmsConfig.general.faviconUrl;
    }
  }, [cmsConfig]);

  return (
    <CompanyContext.Provider
      value={{
        settings,
        settingsExistInDb,
        activeWhatsAppNumbers,
        activeCategories,
        loadingSettings,
        cmsConfig,
        cmsPublishedExists,
        publishedPages,
        activeAnnouncements,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used inside CompanyProvider');
  return ctx;
}
