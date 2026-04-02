import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
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

interface Booking {
  id: string;
  reference_no: string;
  client_name: string;
  package_name?: string;
  package_type?: string;
  package_type_display?: string;
  destination_package: string;
  total_cost: number | string;
  currency: string;
  status: 'CONFIRMED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  travel_date?: string;
  start_date?: string;
  number_of_days?: number;
}

export const BookingTable: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const fetchBookings = async () => {
      const response = await api.get('/operations/bookings/');
      setBookings(response.data);
    };

    fetchBookings().catch((error) => {
      console.error('Failed to load bookings:', error);
      setBookings([]);
    });
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    return [
      booking.reference_no,
      booking.client_name,
      booking.package_name,
      booking.destination_package,
    ].some((value) => value?.toLowerCase().includes(needle));
  });

  const bookingValueByCurrency = filteredBookings.reduce<Record<string, number>>((summary, booking) => {
    const currency = booking.currency || 'KES';
    summary[currency] = (summary[currency] || 0) + toNumber(booking.total_cost);
    return summary;
  }, {});

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
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Active Bookings</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Monitor confirmed trips, payment position, and upcoming travel activity from one clean operations view.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Filter size={17} />
            Filters
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
          <p className="mt-2 text-3xl font-black text-slate-900">{filteredBookings.filter((b) => b.status === 'CONFIRMED').length}</p>
        </div>

        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Calendar size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Next Departure</p>
          <p className="mt-2 text-lg font-black text-slate-900">{filteredBookings[0]?.travel_date || filteredBookings[0]?.start_date || 'No upcoming trip'}</p>
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
              {filteredBookings.length} live records
            </div>
          </div>
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
              {filteredBookings.map((b) => (
                <tr key={b.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-black text-slate-900">{b.reference_no}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <MapPin size={12} />
                        {b.package_name || b.destination_package}
                        {b.package_type_display ? ` | ${b.package_type_display}` : ''}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-500">
                        {b.client_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{b.client_name}</p>
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
                      Full payment pending
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
                      <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700">
                        <ArrowUpRight size={16} />
                        Open
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
