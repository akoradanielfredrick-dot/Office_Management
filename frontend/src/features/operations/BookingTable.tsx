import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban,
  CirclePlus,
  Search,
  Filter,
  Eye,
  Calendar,
  MapPin,
  BriefcaseBusiness,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import { api, toNumber } from '../../lib/api';
import type { PaginatedResponse } from './listTypes';

interface Booking {
  id: string;
  client: string;
  reference_no: string;
  client_name: string;
  product_name?: string;
  product_name_snapshot?: string;
  product_category_snapshot?: string;
  product_category_display?: string;
  product_destination_snapshot: string;
  schedule_code?: string;
  total_cost: number | string;
  currency: string;
  source?: string;
  payment_status?: string;
  refund_status?: string;
  status: 'PENDING' | 'CONFIRMED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'AMENDED';
  travel_date?: string;
  start_date?: string;
  number_of_days?: number;
}

export const BookingTable: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [busyBookingId, setBusyBookingId] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [paymentFilter, setPaymentFilter] = React.useState('ALL');
  const [sourceFilter, setSourceFilter] = React.useState('ALL');
  const [refundFilter, setRefundFilter] = React.useState('ALL');
  const [dateWindowFilter, setDateWindowFilter] = React.useState('ALL');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const fetchBookings = React.useCallback(async () => {
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
      ordering: '-created_at',
    };

    if (search.trim()) {
      params.search = search.trim();
    }
    if (statusFilter !== 'ALL') {
      params.status = statusFilter;
    }
    if (paymentFilter !== 'ALL') {
      params.payment_status = paymentFilter;
    }
    if (sourceFilter !== 'ALL') {
      params.source = sourceFilter;
    }
    if (refundFilter !== 'ALL') {
      params.refund_status = refundFilter;
    }
    if (dateWindowFilter !== 'ALL') {
      params.travel_window = dateWindowFilter;
    }

    const response = await api.get<PaginatedResponse<Booking>>('/operations/bookings/', { params });
    setBookings(response.data.results);
    setTotalCount(response.data.count);
  }, [dateWindowFilter, page, paymentFilter, refundFilter, search, sourceFilter, statusFilter]);

  React.useEffect(() => {
    fetchBookings().catch((error) => {
      console.error('Failed to load bookings:', error);
      setBookings([]);
      setTotalCount(0);
    });
  }, [fetchBookings]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, sourceFilter, refundFilter, dateWindowFilter]);

  const uniqueSources = React.useMemo(
    () => Array.from(new Set(bookings.map((booking) => booking.source).filter(Boolean))) as string[],
    [bookings]
  );

  const uniquePaymentStatuses = React.useMemo(
    () => Array.from(new Set(bookings.map((booking) => booking.payment_status).filter(Boolean))) as string[],
    [bookings]
  );

  const uniqueRefundStatuses = React.useMemo(
    () => Array.from(new Set(bookings.map((booking) => booking.refund_status).filter(Boolean))) as string[],
    [bookings]
  );

  const activeFilterCount = [
    statusFilter,
    paymentFilter,
    sourceFilter,
    refundFilter,
    dateWindowFilter,
  ].filter((value) => value !== 'ALL').length;

  const bookingValueByCurrency = bookings.reduce<Record<string, number>>((summary, booking) => {
    const currency = booking.currency || 'USD';
    summary[currency] = (summary[currency] || 0) + toNumber(booking.total_cost);
    return summary;
  }, {});

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const getBookingDisplayName = (booking: Booking) =>
    booking.product_name || booking.product_name_snapshot || booking.product_destination_snapshot || 'Booking';
  const getClientInitial = (booking: Booking) => (booking.client_name || booking.reference_no || 'B').charAt(0).toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'ONGOING':
        return 'bg-sky-100 text-sky-700 ring-sky-200';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 'FAILED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'AMENDED':
        return 'bg-violet-100 text-violet-700 ring-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    const reason = window.prompt(`Cancel booking ${booking.reference_no}. Enter a reason:`)?.trim();
    if (!reason) {
      return;
    }

    const shouldReleaseInventory = window.confirm(
      'Release inventory back to the schedule?\n\nChoose OK to restore space, or Cancel to keep inventory blocked.'
    );
    const refundStatusInput = window.prompt(
      'Refund status (NONE, PENDING, PARTIAL, REFUNDED). Leave blank for NONE:',
      booking.refund_status || 'NONE'
    );

    setBusyBookingId(booking.id);
    try {
      await api.post(`/operations/bookings/${booking.id}/cancel/`, {
        reason,
        cancelled_by_type: 'ADMIN',
        release_inventory: shouldReleaseInventory,
        refund_status: (refundStatusInput || 'NONE').trim().toUpperCase(),
      });
      await fetchBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      window.alert('Unable to cancel this booking right now.');
    } finally {
      setBusyBookingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Active Bookings</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Monitor confirmed trips, payment position, and upcoming travel activity from one clean operations view.
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
            onClick={() => navigate('/bookings/new')}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <CirclePlus size={17} />
            New Booking
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <BriefcaseBusiness size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Confirmed Trips</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{bookings.filter((b) => b.status === 'CONFIRMED').length}</p>
        </div>

        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Calendar size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Next Departure</p>
          <p className="mt-2 text-lg font-black text-slate-900">{bookings[0]?.travel_date || bookings[0]?.start_date || 'No upcoming trip'}</p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Wallet size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Booking Value</p>
          <div className="mt-3 space-y-2">
            {Object.keys(bookingValueByCurrency).length > 0 ? Object.entries(bookingValueByCurrency).map(([currency, total]) => (
              <div key={currency} className="flex items-center justify-between text-sm font-black text-slate-900">
                <span>{currency}</span>
                <span>{total.toLocaleString()}</span>
              </div>
            )) : (
              <p className="text-3xl font-black text-slate-900">0</p>
            )}
          </div>
          <p className="mt-3 text-xs font-medium text-slate-500">Totals are grouped by booking currency to avoid mixed-currency miscalculation.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by booking reference, client, or destination..."
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
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="AMENDED">Amended</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Payment</label>
                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All payment states</option>
                  <option value="UNPAID">UNPAID</option>
                  {uniquePaymentStatuses.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Source</label>
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All sources</option>
                  <option value="MANUAL_OFFICE">MANUAL_OFFICE</option>
                  {uniqueSources.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Refund</label>
                <select
                  value={refundFilter}
                  onChange={(event) => setRefundFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All refund states</option>
                  <option value="NONE">NONE</option>
                  {uniqueRefundStatuses.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Date Window</label>
                <select
                  value={dateWindowFilter}
                  onChange={(event) => setDateWindowFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All dates</option>
                  <option value="TODAY">Today</option>
                  <option value="NEXT_7_DAYS">Next 7 days</option>
                  <option value="NEXT_30_DAYS">Next 30 days</option>
                  <option value="PAST">Past trips</option>
                </select>
              </div>
            </div>
          ) : null}

          {activeFilterCount ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active filters</p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setPaymentFilter('ALL');
                  setSourceFilter('ALL');
                  setRefundFilter('ALL');
                  setDateWindowFilter('ALL');
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
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Booking</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Travel Date</th>
                <th className="px-6 py-4">Financial Position</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-black text-slate-900">{b.reference_no}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <MapPin size={12} />
                        {getBookingDisplayName(b)}
                        {b.product_category_display ? ` | ${b.product_category_display}` : ''}
                        {b.schedule_code ? ` | ${b.schedule_code}` : ''}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-500">
                        {getClientInitial(b)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{b.client_name || 'Client not captured'}</p>
                        <p className="mt-1 text-xs text-slate-400">Lead traveller</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div>
                      <p className="font-bold text-slate-900">{b.travel_date || b.start_date || 'TBD'}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        {b.number_of_days ? `${b.number_of_days} day trip` : 'Confirmed date'}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <p className="text-lg font-black text-slate-900">
                      {b.currency} {toNumber(b.total_cost).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
                      {b.payment_status || 'UNPAID'}
                    </p>
                  </td>

                  <td className="px-6 py-5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getStatusColor(b.status)}`}>
                      {b.status}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <button
                        onClick={() => navigate(`/bookings/${b.id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/clients?clientId=${b.client}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                      >
                        <ArrowUpRight size={16} />
                        Client
                      </button>
                      {b.status !== 'CANCELLED' ? (
                        <button
                          onClick={() => void handleCancelBooking(b)}
                          disabled={busyBookingId === b.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-60"
                        >
                          <Ban size={16} />
                          Cancel
                        </button>
                      ) : null}
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
