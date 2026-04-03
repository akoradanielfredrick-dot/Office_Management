import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CirclePlus, Clock3, Search, ShieldAlert, Users, RefreshCcw, Ban, Eye, Filter } from 'lucide-react';
import { api } from '../../lib/api';
import type { PaginatedResponse } from './listTypes';

interface ReservationRecord {
  id: string;
  reference_no: string;
  client?: string;
  product_name: string;
  product?: string;
  schedule?: string;
  schedule_code: string;
  customer_full_name: string;
  customer_email?: string;
  customer_phone?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED';
  hold_expires_at: string;
  notes?: string;
  internal_comments?: string;
  participants?: Array<{
    id: string;
    category_code: string;
    category_label: string;
    quantity: number;
    unit_price: string | number;
  }>;
}

export const ReservationList: React.FC = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = React.useState<ReservationRecord[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [holdWindowFilter, setHoldWindowFilter] = React.useState('ALL');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const fetchReservations = React.useCallback(async () => {
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
    if (holdWindowFilter !== 'ALL') {
      params.hold_window = holdWindowFilter;
    }

    const response = await api.get<PaginatedResponse<ReservationRecord>>('/operations/reservations/', { params });
    setReservations(response.data.results);
    setTotalCount(response.data.count);
  }, [holdWindowFilter, page, search, statusFilter]);

  React.useEffect(() => {
    fetchReservations().catch((error) => {
      console.error('Failed to load reservations:', error);
      setReservations([]);
      setTotalCount(0);
    });
  }, [fetchReservations]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, holdWindowFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const activeFilterCount = [statusFilter, holdWindowFilter].filter((value) => value !== 'ALL').length;

  const getStatusTone = (status: ReservationRecord['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'EXPIRED':
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'CONVERTED':
        return 'bg-sky-100 text-sky-700 ring-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  const handleConvert = async (reservation: ReservationRecord) => {
    if (!reservation.product || !reservation.schedule) {
      return;
    }

    setBusyId(reservation.id);
    try {
      const response = await api.post(`/operations/reservations/${reservation.id}/convert_to_booking/`, {
        travel_date: new Date().toISOString().slice(0, 10),
        number_of_days: 1,
        status: 'CONFIRMED',
        source: 'MANUAL_OFFICE',
        product_destination_snapshot: reservation.product_name,
        notes: reservation.notes || '',
        internal_notes: reservation.internal_comments || '',
      });

      await fetchReservations();
      navigate(`/bookings/${response.data.id}`);
    } catch (error) {
      console.error('Failed to convert reservation:', error);
      window.alert('Unable to convert this reservation to a booking right now.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (reservation: ReservationRecord) => {
    const reason = window.prompt(`Cancel reservation ${reservation.reference_no}. Enter a reason:`)?.trim();
    if (!reason) {
      return;
    }

    setBusyId(reservation.id);
    try {
      await api.post(`/operations/reservations/${reservation.id}/cancel/`, {
        reason,
        cancelled_by_type: 'ADMIN',
      });
      await fetchReservations();
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      window.alert('Unable to cancel this reservation right now.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Reservations & Holds</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Track temporary holds before confirmation so inventory is reserved cleanly without forcing an immediate booking.
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
            onClick={() => navigate('/reservations/new')}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <CirclePlus size={17} />
            New Reservation
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldAlert size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Active Holds</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{reservations.filter((item) => item.status === 'ACTIVE').length}</p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock3 size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Expiring Soon</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {reservations.filter((item) => item.status === 'ACTIVE').length}
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Users size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Converted</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{reservations.filter((item) => item.status === 'CONVERTED').length}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by reservation reference, client, product, or schedule..."
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
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="CONVERTED">Converted</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Expiry Window</label>
                <select
                  value={holdWindowFilter}
                  onChange={(event) => setHoldWindowFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="ALL">All expiry windows</option>
                  <option value="ACTIVE_FUTURE">Future holds</option>
                  <option value="EXPIRING_24_HOURS">Expiring in 24 hours</option>
                  <option value="EXPIRED">Already expired</option>
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
                  setHoldWindowFilter('ALL');
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
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Reservation</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Expiry</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900">{reservation.reference_no}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{reservation.schedule_code}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-slate-800">{reservation.customer_full_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{reservation.customer_email || reservation.customer_phone || 'No contact detail'}</p>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">{reservation.product_name}</td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">{new Date(reservation.hold_expires_at).toLocaleString()}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getStatusTone(reservation.status)}`}>
                      {reservation.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      {reservation.status === 'ACTIVE' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate(`/reservations/${reservation.id}`)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                          >
                            <Eye size={15} />
                            View
                          </button>
                          <button
                            type="button"
                            disabled={busyId === reservation.id}
                            onClick={() => handleConvert(reservation)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-60"
                          >
                            <RefreshCcw size={15} />
                            Convert
                          </button>
                          <button
                            type="button"
                            disabled={busyId === reservation.id}
                            onClick={() => handleCancel(reservation)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-60"
                          >
                            <Ban size={15} />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/reservations/${reservation.id}`)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      )}
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
