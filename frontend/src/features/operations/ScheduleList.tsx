import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CirclePlus, Clock3, Search, Users, Pencil, Filter } from 'lucide-react';
import { api } from '../../lib/api';
import type { PaginatedResponse } from './listTypes';

interface ScheduleRecord {
  id: string;
  schedule_code: string;
  product: string;
  product_name: string;
  title?: string;
  schedule_type: string;
  status: string;
  status_display: string;
  start_at?: string;
  end_at?: string;
  timezone: string;
  total_capacity: number;
  reserved_count: number;
  confirmed_count: number;
  remaining_capacity: number;
}

export const ScheduleList: React.FC = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = React.useState<ScheduleRecord[]>([]);
  const [search, setSearch] = React.useState('');
  const [totalCount, setTotalCount] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [scheduleTypeFilter, setScheduleTypeFilter] = React.useState('ALL');
  const [availableOnly, setAvailableOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const fetchSchedules = React.useCallback(async () => {
    const params: Record<string, string | number | boolean> = {
      page,
      page_size: pageSize,
      ordering: 'start_at',
    };

    if (search.trim()) {
      params.search = search.trim();
    }
    if (statusFilter !== 'ALL') {
      params.status = statusFilter;
    }
    if (scheduleTypeFilter !== 'ALL') {
      params.schedule_type = scheduleTypeFilter;
    }
    if (availableOnly) {
      params.available_only = true;
    }

    const response = await api.get<PaginatedResponse<ScheduleRecord>>('/operations/schedules/', { params });
    setSchedules(response.data.results);
    setTotalCount(response.data.count);
  }, [availableOnly, page, scheduleTypeFilter, search, statusFilter]);

  React.useEffect(() => {
    fetchSchedules().catch((error) => {
      console.error('Failed to load schedules:', error);
      setSchedules([]);
      setTotalCount(0);
    });
  }, [fetchSchedules]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, scheduleTypeFilter, availableOnly]);

  const activeFilterCount = [statusFilter, scheduleTypeFilter].filter((value) => value !== 'ALL').length + (availableOnly ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'SOLD_OUT':
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'PAUSED':
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Schedules & Departures</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Manage fixed-date, recurring, and timed product availability with live capacity visibility.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Filter size={17} />
            Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => navigate('/schedules/new')}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <CirclePlus size={17} />
            New Schedule
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <CalendarDays size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Live Schedules</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{totalCount}</p>
        </div>

        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Users size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Remaining Capacity</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {schedules.reduce((sum, schedule) => sum + Number(schedule.remaining_capacity || 0), 0)}
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock3 size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Available Now</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {schedules.filter((schedule) => schedule.status === 'AVAILABLE').length}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by schedule code, product, title, or status..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
              {totalCount} matching records
            </div>
          </div>

          {filtersOpen ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="SOLD_OUT">Sold out</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Schedule Type</label>
                <select
                  value={scheduleTypeFilter}
                  onChange={(event) => setScheduleTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All schedule types</option>
                  <option value="FIXED_DATE">Fixed date</option>
                  <option value="RECURRING">Recurring</option>
                  <option value="TIME_POINT">Time point</option>
                  <option value="TIME_PERIOD">Time period</option>
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => setAvailableOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                Available only
              </label>
            </div>
          ) : null}

          {activeFilterCount ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active filters</p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setScheduleTypeFilter('ALL');
                  setAvailableOnly(false);
                  setPage(1);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 transition-colors hover:bg-slate-50"
              >
                Clear All
              </button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Window</th>
                <th className="px-6 py-4">Inventory</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900">{schedule.schedule_code}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{schedule.title || schedule.schedule_type}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-slate-800">{schedule.product_name}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{schedule.timezone}</p>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">
                    <div>{schedule.start_at ? schedule.start_at.replace('T', ' ').slice(0, 16) : 'Not set'}</div>
                    <div className="mt-1 text-xs text-slate-400">{schedule.end_at ? schedule.end_at.replace('T', ' ').slice(0, 16) : 'Open-ended'}</div>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">
                    <div>Total: {schedule.total_capacity}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Reserved {schedule.reserved_count} | Confirmed {schedule.confirmed_count} | Left {schedule.remaining_capacity}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getStatusTone(schedule.status)}`}>
                      {schedule.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/schedules/${schedule.id}/edit`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
