import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { CmsImageField } from './CmsImageField';
import type {
  CmsConfigDocument,
  CmsHeaderLayout,
  CmsLogoPosition,
} from '../../types';

interface CmsHeaderFooterPanelProps {
  draft: CmsConfigDocument;
  onChange: (updater: (prev: CmsConfigDocument) => CmsConfigDocument) => void;
}

export function CmsHeaderFooterPanel({ draft, onChange }: CmsHeaderFooterPanelProps) {
  const { header, footer } = draft;

  const moveNavItem = (from: number, to: number) => {
    if (to < 0 || to >= header.navItems.length) return;
    const copy = [...header.navItems];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    onChange((p) => ({ ...p, header: { ...p.header, navItems: copy } }));
  };

  const addNavItem = () => {
    const id = `nav_${Date.now().toString(36)}`;
    onChange((p) => ({
      ...p,
      header: {
        ...p.header,
        navItems: [
          ...p.header.navItems,
          { id, label: 'New Link', path: '/products', visible: true },
        ],
      },
    }));
  };

  const addFooterLink = () => {
    const id = `flink_${Date.now().toString(36)}`;
    onChange((p) => ({
      ...p,
      footer: {
        ...p.footer,
        navLinks: [
          ...p.footer.navLinks,
          { id, label: 'New Link', url: '/products', visible: true },
        ],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER EDITOR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Header Editor</h3>
            <p className="text-[11px] text-slate-500">
              Logo placement, navigation menu, CTA button &amp; colors.
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={header.visible}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  header: { ...p.header, visible: e.target.checked },
                }))
              }
              className="rounded border-slate-300 text-[#14452F]"
            />
            Show Header
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Logo Position</label>
            <select
              value={header.logoPosition}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  header: { ...p.header, logoPosition: e.target.value as CmsLogoPosition },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Header Layout</label>
            <select
              value={header.layout}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  header: { ...p.header, layout: e.target.value as CmsHeaderLayout },
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="standard">Standard (64px)</option>
              <option value="centered">Centered Brand</option>
              <option value="compact">Compact (56px)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Header Background
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={header.bgColor || '#FFFFFF'}
                onChange={(e) =>
                  onChange((p) => ({ ...p, header: { ...p.header, bgColor: e.target.value } }))
                }
                className="h-7 w-8 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={header.bgColor}
                onChange={(e) =>
                  onChange((p) => ({ ...p, header: { ...p.header, bgColor: e.target.value } }))
                }
                className="w-full px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Header Text Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={header.textColor || '#13221A'}
                onChange={(e) =>
                  onChange((p) => ({ ...p, header: { ...p.header, textColor: e.target.value } }))
                }
                className="h-7 w-8 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={header.textColor}
                onChange={(e) =>
                  onChange((p) => ({ ...p, header: { ...p.header, textColor: e.target.value } }))
                }
                className="w-full px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={header.sticky}
            onChange={(e) =>
              onChange((p) => ({ ...p, header: { ...p.header, sticky: e.target.checked } }))
            }
            className="rounded border-slate-300 text-[#14452F]"
          />
          Sticky header on scroll
        </label>

        {/* Nav Menu Items */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Navigation Menu Items</span>
            <button
              type="button"
              onClick={addNavItem}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#14452F] bg-[#ECF4EF] rounded-md"
            >
              <Plus className="w-3 h-3" />
              Add Link
            </button>
          </div>
          <div className="space-y-2">
            {header.navItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange((p) => ({
                      ...p,
                      header: {
                        ...p.header,
                        navItems: p.header.navItems.map((n) =>
                          n.id === item.id ? { ...n, label: val } : n
                        ),
                      },
                    }));
                  }}
                  placeholder="Label"
                  className="w-28 px-2 py-1 text-xs border border-slate-300 rounded"
                />
                <input
                  type="text"
                  value={item.path}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange((p) => ({
                      ...p,
                      header: {
                        ...p.header,
                        navItems: p.header.navItems.map((n) =>
                          n.id === item.id ? { ...n, path: val } : n
                        ),
                      },
                    }));
                  }}
                  placeholder="/path"
                  className="flex-1 min-w-0 px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
                />
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveNavItem(idx, idx - 1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === header.navItems.length - 1}
                  onClick={() => moveNavItem(idx, idx + 1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      header: {
                        ...p.header,
                        navItems: p.header.navItems.map((n) =>
                          n.id === item.id ? { ...n, visible: !n.visible } : n
                        ),
                      },
                    }))
                  }
                  className="p-1 text-slate-500 hover:text-[#14452F]"
                >
                  {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      header: {
                        ...p.header,
                        navItems: p.header.navItems.filter((n) => n.id !== item.id),
                      },
                    }))
                  }
                  className="p-1 text-slate-400 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA Button */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={header.showContactButton}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  header: { ...p.header, showContactButton: e.target.checked },
                }))
              }
              className="rounded border-slate-300 text-[#14452F]"
            />
            Show Header Action Button
          </label>
          {header.showContactButton && (
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={header.contactButtonText}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    header: { ...p.header, contactButtonText: e.target.value },
                  }))
                }
                placeholder="Button label"
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                value={header.contactButtonUrl}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    header: { ...p.header, contactButtonUrl: e.target.value },
                  }))
                }
                placeholder="/contact"
                className="px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* FOOTER EDITOR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Footer Editor</h3>
            <p className="text-[11px] text-slate-500">
              Footer branding, description, contact details, links &amp; copyright.
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={footer.visible}
              onChange={(e) =>
                onChange((p) => ({ ...p, footer: { ...p.footer, visible: e.target.checked } }))
              }
              className="rounded border-slate-300 text-[#14452F]"
            />
            Show Footer
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Footer Company Name
            </label>
            <input
              type="text"
              value={footer.companyName}
              onChange={(e) =>
                onChange((p) => ({ ...p, footer: { ...p.footer, companyName: e.target.value } }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">Footer Email</label>
            <input
              type="email"
              value={footer.email}
              onChange={(e) =>
                onChange((p) => ({ ...p, footer: { ...p.footer, email: e.target.value } }))
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <CmsImageField
          label="Footer Logo (optional override)"
          value={footer.logoUrl}
          onChange={(url) =>
            onChange((p) => ({ ...p, footer: { ...p.footer, logoUrl: url } }))
          }
          folder="footer-logo"
          showStudioPresets={false}
        />

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Footer Phone Numbers (comma-separated)
          </label>
          <input
            type="text"
            value={footer.phoneNumbers.join(', ')}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                footer: {
                  ...p.footer,
                  phoneNumbers: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              }))
            }
            className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">Footer Address</label>
          <input
            type="text"
            value={footer.address}
            onChange={(e) =>
              onChange((p) => ({ ...p, footer: { ...p.footer, address: e.target.value } }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Footer Description
          </label>
          <textarea
            rows={2}
            value={footer.description}
            onChange={(e) =>
              onChange((p) => ({ ...p, footer: { ...p.footer, description: e.target.value } }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-700 mb-1">
            Copyright Text
          </label>
          <input
            type="text"
            value={footer.copyrightText}
            onChange={(e) =>
              onChange((p) => ({ ...p, footer: { ...p.footer, copyrightText: e.target.value } }))
            }
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Footer Background
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={footer.bgColor || '#0E3121'}
                onChange={(e) =>
                  onChange((p) => ({ ...p, footer: { ...p.footer, bgColor: e.target.value } }))
                }
                className="h-7 w-8 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={footer.bgColor}
                onChange={(e) =>
                  onChange((p) => ({ ...p, footer: { ...p.footer, bgColor: e.target.value } }))
                }
                className="w-full px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Footer Text Color
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={footer.textColor || '#F1F5F9'}
                onChange={(e) =>
                  onChange((p) => ({ ...p, footer: { ...p.footer, textColor: e.target.value } }))
                }
                className="h-7 w-8 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={footer.textColor}
                onChange={(e) =>
                  onChange((p) => ({ ...p, footer: { ...p.footer, textColor: e.target.value } }))
                }
                className="w-full px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={footer.showSocialLinks}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  footer: { ...p.footer, showSocialLinks: e.target.checked },
                }))
              }
              className="rounded border-slate-300 text-[#14452F]"
            />
            Show Social Links
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={footer.showWhatsAppButton}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  footer: { ...p.footer, showWhatsAppButton: e.target.checked },
                }))
              }
              className="rounded border-slate-300 text-[#14452F]"
            />
            Show WhatsApp Button
          </label>
        </div>

        {/* Footer Links */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Footer Navigation Links</span>
            <button
              type="button"
              onClick={addFooterLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#14452F] bg-[#ECF4EF] rounded-md"
            >
              <Plus className="w-3 h-3" />
              Add Link
            </button>
          </div>
          <div className="space-y-2">
            {footer.navLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange((p) => ({
                      ...p,
                      footer: {
                        ...p.footer,
                        navLinks: p.footer.navLinks.map((l) =>
                          l.id === link.id ? { ...l, label: val } : l
                        ),
                      },
                    }));
                  }}
                  className="w-28 px-2 py-1 text-xs border border-slate-300 rounded"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange((p) => ({
                      ...p,
                      footer: {
                        ...p.footer,
                        navLinks: p.footer.navLinks.map((l) =>
                          l.id === link.id ? { ...l, url: val } : l
                        ),
                      },
                    }));
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs font-mono-tabular border border-slate-300 rounded"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      footer: {
                        ...p.footer,
                        navLinks: p.footer.navLinks.map((l) =>
                          l.id === link.id ? { ...l, visible: !l.visible } : l
                        ),
                      },
                    }))
                  }
                  className="p-1 text-slate-500 hover:text-[#14452F]"
                >
                  {link.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange((p) => ({
                      ...p,
                      footer: {
                        ...p.footer,
                        navLinks: p.footer.navLinks.filter((l) => l.id !== link.id),
                      },
                    }))
                  }
                  className="p-1 text-slate-400 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
