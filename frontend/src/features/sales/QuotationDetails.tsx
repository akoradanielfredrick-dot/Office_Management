import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  FileText,
  CheckCircle,
  ArrowRightLeft,
  Calendar,
  Users,
  MapPin,
  Clock3,
  ReceiptText,
} from 'lucide-react';
import { api, toNumber } from '../../lib/api';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  total_price: number | string;
}

interface QuotationDetailRecord {
  id: string;
  reference_no: string;
  status: string;
  client_name: string;
  destination_package: string;
  num_adults: number;
  num_children: number;
  start_date: string;
  end_date: string;
  currency: string;
  subtotal: number | string;
  discount: number | string;
  total_amount: number | string;
  notes: string;
  internal_notes: string;
  items: QuotationItem[];
  created_at: string;
}

export const QuotationDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = React.useState<QuotationDetailRecord | null>(null);

  React.useEffect(() => {
    if (!id) {
      return;
    }

    const fetchQuotation = async () => {
      const response = await api.get(`/sales/quotations/${id}/`);
      setQuotation(response.data);
    };

    fetchQuotation().catch((error) => {
      console.error('Failed to load quotation:', error);
      setQuotation(null);
    });
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'CONVERTED':
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
  };

  const handleConvert = async () => {
    if (!quotation) {
      return;
    }

    if (confirm('Are you sure you want to convert this quotation into a formal booking? This will lock the quotation.')) {
      const response = await api.post(`/sales/quotations/${quotation.id}/convert/`);
      navigate(`/bookings/${response.data.booking_id}`);
    }
  };

  if (!quotation) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">Loading quotation...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Quotation Record</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{quotation.reference_no}</h1>
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getStatusBadge(quotation.status)}`}>
                {quotation.status}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Prepared for {quotation.client_name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Edit size={18} />
            Edit
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-bold text-primary-700 shadow-sm transition-colors hover:bg-primary-100">
            <FileText size={18} />
            Download PDF
          </button>
          {quotation.status === 'ACCEPTED' && (
            <button
              onClick={handleConvert}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800"
            >
              <ArrowRightLeft size={18} />
              Convert to Booking
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.7fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                  <MapPin size={20} />
                </div>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">Destination</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{quotation.destination_package}</p>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Calendar size={20} />
                </div>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">Travel Dates</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{quotation.start_date} to {quotation.end_date}</p>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                  <Users size={20} />
                </div>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">Guests</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-900">
                  {quotation.num_adults} Adults, {quotation.num_children} Child
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ReceiptText size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Proposal Contents</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Line Items</h2>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4 text-center">Qty</th>
                    <th className="px-5 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotation.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-5 text-sm font-semibold text-slate-700">{item.description}</td>
                      <td className="px-5 py-5 text-center text-sm font-medium text-slate-500">{item.quantity}</td>
                      <td className="px-5 py-5 text-right text-sm font-black text-slate-900">
                        {quotation.currency} {toNumber(item.total_price).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-700">Client Notes</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Proposal Remarks</h2>
            <div className="mt-5 rounded-[1.6rem] border border-amber-200 bg-white/70 p-5 text-sm font-medium leading-7 text-slate-700">
              {quotation.notes}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.8)]">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Commercial Summary</p>
              <h2 className="mt-2 text-2xl font-black text-white">Financial Breakdown</h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-400">Subtotal</span>
                <span className="font-bold text-white">{quotation.currency} {toNumber(quotation.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-400">Discount</span>
                <span className="font-bold text-rose-400">-{quotation.currency} {toNumber(quotation.discount).toLocaleString()}</span>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total Payable</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Confirmed quotation value</p>
                  </div>
                  <div className="text-right text-3xl font-black text-primary-400">
                    {quotation.currency} {toNumber(quotation.total_amount).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Internal Notes</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Operations Log</h2>
            <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 text-sm font-medium leading-7 text-slate-700">
              {quotation.internal_notes}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Clock3 size={14} />
                Created {new Date(quotation.created_at).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-2 text-emerald-600">
                <CheckCircle size={14} />
                Validated
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
