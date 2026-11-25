import {
  CMS_BODY_FONTS,
  CMS_DISPLAY_FONTS,
  CMS_THEME_PRESETS,
} from '../../lib/cmsDefaults';
import { CmsImageField } from './CmsImageField';
import type {
  CmsButtonStyle,
  CmsConfigDocument,
  CmsFontScale,
  CmsRadiusScale,
  CmsSpacingScale,
  CmsThemePreset,
} from '../../types';

interface CmsDesignSeoPanelProps {
  draft: CmsConfigDocument;
  onChange: (updater: (prev: CmsConfigDocument) => CmsConfigDocument) => void;
}

export function CmsDesignSeoPanel({ draft, onChange }: CmsDesignSeoPanelProps) {
  const { design, seo } = draft;

  const applyThemePreset = (presetKey: CmsThemePreset) => {
    const preset = CMS_THEME_PRESETS[presetKey];
    if (!preset) return;
    onChange((p) => ({
      ...p,
      design: {
        ...p.design,
        themePreset: presetKey,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        backgroundColor: preset.backgroundColor,
        surfaceColor: preset.surfaceColor,
        textColor: preset.textColor,
      },
      header: {
        ...p.header,
        bgColor: preset.headerBgColor,
        textColor: preset.headerTextColor,
      },
      footer: {
        ...p.footer,
        bgColor: preset.footerBgColor,
        textColor: preset.footerTextColor,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* DESIGN SETTINGS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-semibold text-slate-900">Design, Theme &amp; Typography</h3>
          <p className="text-[11px] text-slate-500">
            Palette presets, custom colors, typography pairings, button shape &amp; spacing.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
            Theme Preset
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CMS_THEME_PRESETS) as CmsThemePreset[]).map((key) => {
              const item = CMS_THEME_PRESETS[key];
              const active = design.themePreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyThemePreset(key)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                    active
                      ? 'border-[#14452F] bg-[#ECF4EF] font-semibold text-[#14452F]'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: item.primaryColor }}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand & Surface Colors */}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { key: 'primaryColor', label: 'Primary Color' },
              { key: 'secondaryColor', label: 'Secondary Accent' },
              { key: 'backgroundColor', label: 'Page Background' },
              { key: 'surfaceColor', label: 'Surface / Card Tint' },
              { key: 'textColor', label: 'Body Text Color' },
            ] as const
          ).map((field) => (
            <div key={field.key}>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                {field.label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={design[field.key]}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      design: { ...p.design, [field.key]: e.target.value },
                    }))
                  }
                  className="h-7 w-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={design[field.key]}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      design: { ...p.design, [field.key]: e.target.value },
                    }))
                  }
                  className="w-full px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Typography */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Display / Heading Font
            </label>
            <select
              value={design.displayFont}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  design: { ...p.design, displayFont: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {CMS_DISPLAY_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Body Font</label>
            <select
              value={design.bodyFont}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  design: { ...p.design, bodyFont: e.target.value },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {CMS_BODY_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scale, Radius, Button Style & Spacing */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Button Style
            </label>
            <select
              value={design.buttonStyle}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  design: { ...p.design, buttonStyle: e.target.value as CmsButtonStyle },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="rounded">Rounded</option>
              <option value="pill">Pill</option>
              <option value="sharp">Sharp / Square</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Font Size Scale
            </label>
            <select
              value={design.fontSizeScale}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  design: { ...p.design, fontSizeScale: e.target.value as CmsFontScale },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="compact">Compact (15px)</option>
              <option value="standard">Standard (16px)</option>
              <option value="comfortable">Comfortable (17px)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Border Radius
            </label>
            <select
              value={design.borderRadius}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  design: { ...p.design, borderRadius: e.target.value as CmsRadiusScale },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="none">None (0px)</option>
              <option value="sm">Small (4px)</option>
              <option value="md">Medium (8px)</option>
              <option value="lg">Large (12px)</option>
              <option value="xl">Extra Large (16px)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Page Spacing
            </label>
            <select
              value={design.sectionSpacing}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  design: { ...p.design, sectionSpacing: e.target.value as CmsSpacingScale },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>
      </div>

      {/* GLOBAL SEO SETTINGS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-semibold text-slate-900">Global SEO &amp; Open Graph</h3>
          <p className="text-[11px] text-slate-500">
            Controls search engine title, description, keywords &amp; social share preview image.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Website Meta Title
          </label>
          <input
            type="text"
            value={seo.siteTitle}
            onChange={(e) =>
              onChange((p) => ({ ...p, seo: { ...p.seo, siteTitle: e.target.value } }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Meta Description
          </label>
          <textarea
            rows={2}
            value={seo.metaDescription}
            onChange={(e) =>
              onChange((p) => ({ ...p, seo: { ...p.seo, metaDescription: e.target.value } }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            SEO Keywords (comma-separated)
          </label>
          <input
            type="text"
            value={seo.keywords}
            onChange={(e) =>
              onChange((p) => ({ ...p, seo: { ...p.seo, keywords: e.target.value } }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <CmsImageField
          label="Open Graph Share Image"
          value={seo.ogImage}
          onChange={(url) =>
            onChange((p) => ({ ...p, seo: { ...p.seo, ogImage: url } }))
          }
          folder="seo"
        />
      </div>
    </div>
  );
}
