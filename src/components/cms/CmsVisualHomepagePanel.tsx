import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { CmsImageField } from './CmsImageField';
import type {
  CmsConfigDocument,
  CmsHomepageSectionType,
  CmsSectionConfig,
  CmsSectionLayout,
} from '../../types';

interface CmsVisualHomepagePanelProps {
  draft: CmsConfigDocument;
  onChange: (updater: (prev: CmsConfigDocument) => CmsConfigDocument) => void;
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
}

export function CmsVisualHomepagePanel({
  draft,
  onChange,
  selectedSectionId,
  onSelectSection,
}: CmsVisualHomepagePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [newSectionType, setNewSectionType] = useState<CmsHomepageSectionType>('custom_banner');

  const sections = draft.homepage.sections;
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || sections[0] || null;

  const updateSections = (nextSections: CmsSectionConfig[]) => {
    onChange((prev) => ({
      ...prev,
      homepage: {
        ...prev.homepage,
        sections: nextSections,
      },
    }));
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sections.length || fromIndex === toIndex) return;
    const copy = [...sections];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    updateSections(copy);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    moveSection(dragIndex, targetIndex);
    setDragIndex(null);
  };

  const updateSelectedSection = (patch: Partial<CmsSectionConfig>) => {
    if (!selectedSection) return;
    updateSections(
      sections.map((s) => (s.id === selectedSection.id ? { ...s, ...patch } : s))
    );
  };

  const toggleVisibility = (id: string) => {
    updateSections(
      sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  };

  const addSection = () => {
    const id = `sec_${Date.now().toString(36)}`;
    const defaultsByType: Record<CmsHomepageSectionType, Partial<CmsSectionConfig>> = {
      custom_banner: {
        title: 'Bulk Mill Contract Supply',
        subtitle: 'Custom GSM & Packaging Specifications',
        body: 'Looking for recurring monthly dispatch or custom-woven hessian widths? Our Bengal supply desk quotes mill-direct container and truckload rates.',
        ctaLabel: 'Request Custom Quote',
        ctaUrl: '/contact',
        layout: 'split',
      },
      announcements: {
        title: 'Trade Announcements',
        subtitle: 'Latest wholesale dispatch notices',
        layout: 'banner',
      },
      hero: {
        title: draft.homepage.heroHeading,
        subtitle: draft.homepage.heroEyebrow,
        layout: 'split',
      },
      capabilities: {
        title: 'Wholesale Supply Capabilities',
        subtitle: 'Quality & logistics guarantees',
        layout: 'grid-4',
      },
      featured_products: {
        title: 'Featured Wholesale Products',
        subtitle: 'Catalogue Showcase',
        layout: 'grid-3',
      },
      categories: {
        title: 'Browse Categories',
        subtitle: 'Wholesale Jute Lines',
        layout: 'grid-4',
      },
      about: {
        title: draft.homepage.aboutHeading,
        subtitle: draft.homepage.aboutEyebrow,
        layout: 'split',
      },
      wholesale_enquiry: {
        title: 'Request a Bulk Wholesale Quotation',
        subtitle: 'Wholesale Enquiry Desk',
        body: 'Share your required jute grade, approximate quantity, and delivery city for INR trade pricing.',
        ctaLabel: 'Submit & Open WhatsApp',
        ctaUrl: '/contact',
        layout: 'split',
      },
      contact_section: {
        title: 'Direct Wholesale Trade Desk',
        subtitle: 'Contact Information',
        body: 'Reach our sales coordinators directly by telephone, email, or WhatsApp during business hours.',
        ctaLabel: 'Full Contact Page',
        ctaUrl: '/contact',
        layout: 'split',
      },
    };

    const spec = defaultsByType[newSectionType];
    const newSec: CmsSectionConfig = {
      id,
      type: newSectionType,
      title: spec.title || 'New Section',
      subtitle: spec.subtitle || '',
      body: spec.body || '',
      imageUrl: '',
      ctaLabel: spec.ctaLabel || '',
      ctaUrl: spec.ctaUrl || '',
      visible: true,
      layout: spec.layout || 'centered',
      bgColor: newSectionType === 'custom_banner' ? draft.design.surfaceColor : draft.design.backgroundColor,
      textColor: draft.design.textColor,
    };

    updateSections([...sections, newSec]);
    onSelectSection(id);
  };

  const removeSection = (id: string) => {
    if (sections.length <= 1) return;
    const filtered = sections.filter((s) => s.id !== id);
    updateSections(filtered);
    if (selectedSectionId === id) {
      onSelectSection(filtered[0]?.id || null);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Drag-and-Drop Homepage Section Manager */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Homepage Sections Order</h3>
            <p className="text-[11px] text-slate-500">
              Drag rows to reorder, toggle visibility, or click to edit.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {sections.map((sec, idx) => {
            const isSelected = selectedSection?.id === sec.id;
            return (
              <div
                key={sec.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                onClick={() => onSelectSection(sec.id)}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-white border-[#14452F] shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                } ${!sec.visible ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 cursor-grab" />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {sec.title || sec.type}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                      {sec.type.replace('_', ' ')} · {sec.layout}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, idx - 1)}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                    aria-label="Move section up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(idx, idx + 1)}
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                    aria-label="Move section down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(sec.id)}
                    className="p-1 text-slate-500 hover:text-[#14452F]"
                    aria-label={sec.visible ? 'Hide section' : 'Show section'}
                  >
                    {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(sec.id)}
                      className="p-1 text-slate-400 hover:text-red-700"
                      aria-label="Remove section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Homepage Section */}
        <div className="flex gap-2 pt-1 border-t border-slate-200">
          <select
            value={newSectionType}
            onChange={(e) => setNewSectionType(e.target.value as CmsHomepageSectionType)}
            className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="custom_banner">Custom Promotional Banner</option>
            <option value="featured_products">Featured Products Block</option>
            <option value="categories">Categories Grid</option>
            <option value="capabilities">Why Choose Us Block</option>
            <option value="about">Company Introduction Block</option>
            <option value="wholesale_enquiry">Wholesale Enquiry Form Block</option>
            <option value="contact_section">Direct Contact Desk Block</option>
            <option value="announcements">Announcements Block</option>
          </select>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#14452F] hover:bg-[#0D3322] rounded-lg whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Section
          </button>
        </div>
      </div>

      {/* 2. Selected Section Content & Layout Editor */}
      {selectedSection && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h4 className="text-xs font-semibold text-slate-900">
                Editing Section: {selectedSection.type.replace('_', ' ')}
              </h4>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSection.visible}
                onChange={(e) => updateSelectedSection({ visible: e.target.checked })}
                className="rounded border-slate-300 text-[#14452F]"
              />
              Visible
            </label>
          </div>

          {/* Section Colors & Layout */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Layout</label>
              <select
                value={selectedSection.layout}
                onChange={(e) => updateSelectedSection({ layout: e.target.value as CmsSectionLayout })}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="split">Split (2-Col)</option>
                <option value="centered">Centered</option>
                <option value="banner">Full Banner</option>
                <option value="grid-3">3 Columns</option>
                <option value="grid-4">4 Columns</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Background</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={selectedSection.bgColor || '#FFFFFF'}
                  onChange={(e) => updateSelectedSection({ bgColor: e.target.value })}
                  className="h-7 w-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedSection.bgColor}
                  onChange={(e) => updateSelectedSection({ bgColor: e.target.value })}
                  className="w-full px-1.5 py-1 text-[11px] font-mono-tabular border border-slate-300 rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Text Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={selectedSection.textColor || '#13221A'}
                  onChange={(e) => updateSelectedSection({ textColor: e.target.value })}
                  className="h-7 w-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedSection.textColor}
                  onChange={(e) => updateSelectedSection({ textColor: e.target.value })}
                  className="w-full px-1.5 py-1 text-[11px] font-mono-tabular border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Dedicated Hero Controls */}
          {selectedSection.type === 'hero' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Eyebrow Label</label>
                <input
                  type="text"
                  value={draft.homepage.heroEyebrow}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, heroEyebrow: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Hero Heading</label>
                <textarea
                  rows={2}
                  value={draft.homepage.heroHeading}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, heroHeading: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Hero Subheading</label>
                <textarea
                  rows={3}
                  value={draft.homepage.heroSubheading}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, heroSubheading: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <CmsImageField
                label="Hero Banner Image"
                value={draft.homepage.heroBannerImage}
                onChange={(url) =>
                  onChange((p) => ({
                    ...p,
                    homepage: { ...p.homepage, heroBannerImage: url },
                  }))
                }
                folder="hero"
              />

              <CmsImageField
                label="Hero Background Image (optional overlay)"
                value={draft.homepage.heroBgImage}
                onChange={(url) =>
                  onChange((p) => ({
                    ...p,
                    homepage: { ...p.homepage, heroBgImage: url },
                  }))
                }
                folder="hero-bg"
                showStudioPresets={false}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Primary Button Text
                  </label>
                  <input
                    type="text"
                    value={draft.homepage.heroPrimaryButtonText}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        homepage: { ...p.homepage, heroPrimaryButtonText: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Primary Button URL
                  </label>
                  <input
                    type="text"
                    value={draft.homepage.heroPrimaryButtonUrl}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        homepage: { ...p.homepage, heroPrimaryButtonUrl: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Secondary Button Text
                  </label>
                  <input
                    type="text"
                    value={draft.homepage.heroSecondaryButtonText}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        homepage: { ...p.homepage, heroSecondaryButtonText: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Secondary Button URL
                  </label>
                  <input
                    type="text"
                    value={draft.homepage.heroSecondaryButtonUrl}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        homepage: { ...p.homepage, heroSecondaryButtonUrl: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Featured Products Controls */}
          {selectedSection.type === 'featured_products' && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Eyebrow</label>
                  <input
                    type="text"
                    value={draft.homepage.featuredProductsEyebrow}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        homepage: { ...p.homepage, featuredProductsEyebrow: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Max Products Shown
                  </label>
                  <select
                    value={draft.homepage.featuredProductsCount}
                    onChange={(e) =>
                      onChange((p) => ({
                        ...p,
                        homepage: {
                          ...p.homepage,
                          featuredProductsCount: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={3}>3 Products</option>
                    <option value={6}>6 Products</option>
                    <option value={9}>9 Products</option>
                    <option value={12}>12 Products</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Section Title</label>
                <input
                  type="text"
                  value={draft.homepage.featuredProductsTitle}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, featuredProductsTitle: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={draft.homepage.featuredProductsSubtitle}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, featuredProductsSubtitle: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Categories Controls */}
          {selectedSection.type === 'categories' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Eyebrow</label>
                <input
                  type="text"
                  value={draft.homepage.categoriesEyebrow}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, categoriesEyebrow: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Categories Heading</label>
                <input
                  type="text"
                  value={draft.homepage.categoriesTitle}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, categoriesTitle: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={draft.homepage.categoriesSubtitle}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, categoriesSubtitle: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* About Section Controls */}
          {selectedSection.type === 'about' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Eyebrow</label>
                <input
                  type="text"
                  value={draft.homepage.aboutEyebrow}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, aboutEyebrow: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">About Heading</label>
                <input
                  type="text"
                  value={draft.homepage.aboutHeading}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, aboutHeading: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Story Content</label>
                <textarea
                  rows={4}
                  value={draft.homepage.aboutStory}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      homepage: { ...p.homepage, aboutStory: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <CmsImageField
                label="About Section Image"
                value={draft.homepage.aboutImageUrl}
                onChange={(url) =>
                  onChange((p) => ({
                    ...p,
                    homepage: { ...p.homepage, aboutImageUrl: url },
                  }))
                }
                folder="about"
              />
            </div>
          )}

          {/* Custom Banner, Wholesale Enquiry, Contact Section & Generic Fields */}
          {(selectedSection.type === 'custom_banner' ||
            selectedSection.type === 'announcements' ||
            selectedSection.type === 'capabilities' ||
            selectedSection.type === 'wholesale_enquiry' ||
            selectedSection.type === 'contact_section') && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={selectedSection.title}
                  onChange={(e) => updateSelectedSection({ title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={selectedSection.subtitle}
                  onChange={(e) => updateSelectedSection({ subtitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              {(selectedSection.type === 'custom_banner' ||
                selectedSection.type === 'capabilities' ||
                selectedSection.type === 'wholesale_enquiry' ||
                selectedSection.type === 'contact_section') && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Body Copy</label>
                  <textarea
                    rows={3}
                    value={selectedSection.body}
                    onChange={(e) => updateSelectedSection({ body: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              )}
              {(selectedSection.type === 'custom_banner' ||
                selectedSection.type === 'wholesale_enquiry' ||
                selectedSection.type === 'contact_section') && (
                <>
                  {selectedSection.type === 'custom_banner' && (
                    <CmsImageField
                      label="Banner Image (for Split layout)"
                      value={selectedSection.imageUrl}
                      onChange={(url) => updateSelectedSection({ imageUrl: url })}
                      folder="banners"
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        CTA Button Label
                      </label>
                      <input
                        type="text"
                        value={selectedSection.ctaLabel}
                        onChange={(e) => updateSelectedSection({ ctaLabel: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        CTA Destination URL
                      </label>
                      <input
                        type="text"
                        value={selectedSection.ctaUrl}
                        onChange={(e) => updateSelectedSection({ ctaUrl: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-tabular"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
