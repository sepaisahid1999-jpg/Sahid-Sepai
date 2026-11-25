import React, { useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { STUDIO_MEDIA_ASSETS } from '../../lib/constants';
import { uploadCmsAsset } from '../../services/cmsService';

interface CmsImageFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
  showStudioPresets?: boolean;
}

export function CmsImageField({
  label,
  value,
  onChange,
  folder = 'media',
  placeholder = 'https://... or upload image',
  showStudioPresets = true,
}: CmsImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadCmsAsset(file, folder);
      onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-700">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        />
        <label className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#14452F] bg-[#ECF4EF] hover:bg-[#DCECE3] rounded-lg cursor-pointer shrink-0 whitespace-nowrap">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2 py-1.5 text-[11px] text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {uploadError && <p className="text-[11px] text-red-600">{uploadError}</p>}

      {value && (
        <div className="flex items-center gap-2 pt-1">
          <img
            src={value}
            alt={label}
            referrerPolicy="no-referrer"
            className="h-10 w-16 rounded object-cover border border-slate-200 bg-slate-50"
          />
          <span className="text-[11px] text-slate-500 truncate">{value}</span>
        </div>
      )}

      {showStudioPresets && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <ImagePlus className="w-3 h-3" />
            Presets:
          </span>
          {[
            { label: 'Warehouse', url: STUDIO_MEDIA_ASSETS.heroWarehouse },
            { label: 'Loom', url: STUDIO_MEDIA_ASSETS.aboutCraftsmanship },
            { label: 'Raw Bales', url: STUDIO_MEDIA_ASSETS.rawBales },
            { label: 'Hessian', url: STUDIO_MEDIA_ASSETS.hessianRolls },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.url)}
              className="px-1.5 py-0.5 text-[10px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
