import React from 'react';
import { Calendar, Download, Search } from 'lucide-react';

interface ReportToolbarProps {
  onSearch: (query: string) => void;
  onDateChange: (start: string, end: string) => void;
  onExport: () => void;
  placeholder?: string;
  showSearch?: boolean;
}

export const ReportToolbar: React.FC<ReportToolbarProps> = ({
  onSearch,
  onDateChange,
  onExport,
  placeholder = 'Search reports...',
  showSearch = true,
}) => {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-soft)]/90 px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
            <input
              type="text"
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white py-3 pl-11 pr-4 text-sm font-medium text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-soft)]"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-[0_12px_24px_-22px_rgba(111,130,5,0.22)]">
            <Calendar size={16} className="text-[var(--color-text-muted)]" />
            <input
              type="date"
              className="bg-transparent text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] outline-none"
              onChange={(e) => onDateChange(e.target.value, '')}
            />
            <span className="text-[var(--color-text-muted)]">to</span>
            <input
              type="date"
              className="bg-transparent text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] outline-none"
              onChange={(e) => onDateChange('', e.target.value)}
            />
          </div>

          <button
            onClick={onExport}
            className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold"
          >
            <Download size={17} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};
