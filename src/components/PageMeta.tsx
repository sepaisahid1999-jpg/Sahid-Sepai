import { useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';

interface PageMetaProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
}

export function PageMeta({ title, description, keywords, ogImage }: PageMetaProps) {
  const { cmsConfig } = useCompany();

  const resolvedTitle = title || cmsConfig.seo.siteTitle;
  const resolvedDesc = description || cmsConfig.seo.metaDescription;
  const resolvedKeywords = keywords ?? cmsConfig.seo.keywords;
  const resolvedOgImage = ogImage ?? cmsConfig.seo.ogImage;

  useEffect(() => {
    if (resolvedTitle) {
      document.title = resolvedTitle;
    }

    const setMeta = (selector: string, attrName: 'name' | 'property', key: string, value: string) => {
      if (!value) return;
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('meta[name="description"]', 'name', 'description', resolvedDesc);
    setMeta('meta[name="keywords"]', 'name', 'keywords', resolvedKeywords);
    setMeta('meta[property="og:title"]', 'property', 'og:title', resolvedTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', resolvedDesc);
    if (resolvedOgImage) {
      setMeta('meta[property="og:image"]', 'property', 'og:image', resolvedOgImage);
    }
  }, [resolvedTitle, resolvedDesc, resolvedKeywords, resolvedOgImage]);

  return null;
}
