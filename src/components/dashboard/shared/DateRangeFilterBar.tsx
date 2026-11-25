import { Calendar } from 'lucide-react';
import type { DateFilterPreset } from '../../../types';

interface DateRangeFilterBarProps {
  preset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
  customStart: string;
  onCustomStartChange: (val: string) => void;
  customEnd: string;
  onCustomEndChange: (val: string) => void;
  rightSlot?: React.ReactNode;
}

const PRESETS: { id: DateFilterPreset; label: string }[] = [
  { id: 'ALL', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: 'WEEK', label: 'This Week' },
  { id: 'MONTH', label: 'This Month' },
  { id: 'YEAR', label: 'This Year' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

export function DateRangeFilterBar({
  preset,
  onPresetChange,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
  rightSlot,
}: DateRangeFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 mr-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          Period:
        </span>
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPresetChange(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              preset === item.id
                ? 'bg-[#14452F] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {preset === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono-tabular text-xs"
              aria-label="Start date"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono-tabular text-xs"
              aria-label="End date"
            />
            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={() => {
                  onCustomStartChange('');
                  onCustomEndChange('');
                }}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900 underline"
              >
                Reset
              </button>
            )}
          </div>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
