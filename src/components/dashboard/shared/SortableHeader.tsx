import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  activeKey: K;
  direction: SortDirection;
  onSort: (key: K) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'left',
  className = '',
}: SortableHeaderProps<K>) {
  const isActive = activeKey === sortKey;
  const alignClass =
    align === 'right'
      ? 'justify-end text-right'
      : align === 'center'
        ? 'justify-center text-center'
        : 'justify-start text-left';

  return (
    <th className={`py-3 px-3 font-semibold select-none ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`w-full inline-flex items-center gap-1 hover:text-slate-950 transition-colors ${alignClass} ${
          isActive ? 'text-[#14452F]' : 'text-slate-600'
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3 h-3 shrink-0" />
          ) : (
            <ArrowDown className="w-3 h-3 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 shrink-0 opacity-45" />
        )}
      </button>
    </th>
  );
}
