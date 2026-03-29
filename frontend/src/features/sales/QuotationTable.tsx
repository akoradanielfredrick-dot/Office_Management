import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  CalendarDays,
  FolderKanban,
  ArrowUpRight,
} from 'lucide-react';
import { api, toNumber } from '../../lib/api';

interface Quotation {
  id: string;
  reference_no: string;
  client_name: string;
  destination_package: string;
  total_amount: number | string;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  created_at: string;
}

export const QuotationTable: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const fetchQuotations = async () => {
      const response = await api.get('/sales/quotations/');
      setQuotations(response.data);
    };

    fetchQuotations().catch((error) => {
      console.error('Failed to load quotations:', error);
      setQuotations([]);
    });
  }, []);

  const filteredQuotations = quotations.filter((quotation) => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return true;
    }

    return [
      quotation.reference_no,
      quotation.client_name,
      quotation.destination_package,
    ].some((value) => value?.toLowerCase().includes(needle));
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      case 'SENT':
        return 'bg-sky-100 text-sky-700 ring-sky-200';
      case 'ACCEPTED':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'CONVERTED':
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Sales Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Quotations</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Create, review, and manage client-ready travel proposals with a clear operational overview.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Filter size={17} />
            Filters
          </button>
          <button
            onClick={() => navigate('/quotations/new')}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800"
          >
            <Plus size={18} />
            New Quotation
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <FolderKanban size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Open Quotations</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{filteredQuotations.length}</p>
        </div>

        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ArrowUpRight size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Accepted Value</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            KES {filteredQuotations.filter((q) => q.status === 'ACCEPTED').reduce((sum, q) => sum + toNumber(q.total_amount), 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <CalendarDays size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Latest Activity</p>
          <p className="mt-2 text-lg font-black text-slate-900">{filteredQuotations[0]?.created_at?.slice(0, 10) || 'No records'}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by quotation reference, client, or package name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
              {filteredQuotations.length} active records
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.map((q) => (
                <tr key={q.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-black text-slate-900">{q.reference_no}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">Travel proposal record</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-semibold text-slate-800">{q.client_name}</p>
                      <p className="mt-1 text-xs text-slate-400">Client account</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">{q.destination_package}</td>
                  <td className="px-6 py-5">
                    <span className="text-lg font-black text-slate-900">
                      {q.currency} {toNumber(q.total_amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getStatusColor(q.status)}`}>
                      {q.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-500">{q.created_at}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <button
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Edit size={16} />
                        Edit
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
