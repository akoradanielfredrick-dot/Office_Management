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
    <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              className="bg-transparent text-xs font-bold uppercase tracking-[0.18em] text-slate-600 outline-none"
              onChange={(e) => onDateChange(e.target.value, '')}
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              className="bg-transparent text-xs font-bold uppercase tracking-[0.18em] text-slate-600 outline-none"
              onChange={(e) => onDateChange('', e.target.value)}
            />
          </div>

          <button
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download size={17} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};
