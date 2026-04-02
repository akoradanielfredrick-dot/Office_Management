import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Plus,
  CreditCard,
  DollarSign,
  Calendar,
  ReceiptText,
  ArrowUpRight,
} from 'lucide-react';
import { api, toNumber } from '../../lib/api';

interface Payment {
  id: string;
  internal_reference: string;
  booking_ref: string;
  amount: number | string;
  currency: string;
  exchange_rate: number | string;
  payment_type: string;
  payment_type_display?: string;
  method: string;
  payment_date: string;
  recorder_name: string;
  receipt?: { id: string };
}

export const PaymentTable: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const fetchPayments = async () => {
      const response = await api.get('/finance/payments/');
      setPayments(response.data);
    };

    fetchPayments().catch((error) => {
      console.error('Failed to load payments:', error);
      setPayments([]);
    });
  }, []);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthToDatePayments = payments.filter((payment) => new Date(payment.payment_date) >= monthStart);
  const mtdBreakdown = monthToDatePayments.reduce(
    (summary, payment) => {
      const amount = toNumber(payment.amount);
      const rate = toNumber(payment.exchange_rate) || 1;
      const currency = payment.currency.toUpperCase();

      if (currency === 'USD') {
        summary.usd += amount;
      } else if (currency === 'EUR') {
        summary.eur += amount;
      } else {
        summary.kes += amount;
      }

      summary.kesEquivalent += currency === 'KES' ? amount : amount * rate;
      return summary;
    },
    { kes: 0, usd: 0, eur: 0, kesEquivalent: 0 }
  );

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'BANK':
        return <DollarSign size={14} className="text-sky-600" />;
      case 'MPESA':
        return <CreditCard size={14} className="text-emerald-600" />;
      default:
        return <CreditCard size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Finance Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Financial Ledger</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Centralized oversight for collections, receipts, reconciliation, and payment processing across bookings.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/finance/payments/new')}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800"
        >
          <Plus size={18} />
          Record New Payment
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <DollarSign size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Total Collections (MTD)</p>
          <p className="mt-2 text-3xl font-black text-slate-900">KES {mtdBreakdown.kesEquivalent.toLocaleString()}</p>
          <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500">
            <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary-100">
              <span>KES Recorded</span>
              <span className="font-black text-slate-700">KES {mtdBreakdown.kes.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary-100">
              <span>USD Recorded</span>
              <span className="font-black text-slate-700">USD {mtdBreakdown.usd.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary-100">
              <span>EUR Recorded</span>
              <span className="font-black text-slate-700">EUR {mtdBreakdown.eur.toLocaleString()}</span>
            </div>
          </div>
          <p className="mt-4 text-xs font-medium leading-5 text-slate-500">
            Foreign collections are converted to KES using the saved exchange rate, then combined into the MTD total above.
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ReceiptText size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Receipts Generated</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{payments.length}</p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ArrowUpRight size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Pending Reconciliation</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by payment reference, booking, or client..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Filter size={17} />
              Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Processed By</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-black text-slate-900">{p.internal_reference}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{p.booking_ref}</p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-primary-700 ring-1 ring-primary-100">
                      {p.payment_type_display || p.payment_type}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 ring-1 ring-slate-200">
                      {getMethodIcon(p.method)}
                      {p.method}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <p className="text-lg font-black text-slate-900">
                      {p.currency} {toNumber(p.amount).toLocaleString()}
                    </p>
                  </td>

                  <td className="px-6 py-5">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Calendar size={15} className="text-slate-400" />
                      {p.payment_date}
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-100 text-sm font-black text-primary-700">
                        {p.recorder_name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{p.recorder_name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <button
                        onClick={() => p.receipt?.id && window.open(`/api/finance/receipts/${p.receipt.id}/download/`, '_blank')}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Download size={15} />
                        Receipt
                      </button>
                      <button
                        onClick={async () => {
                          await api.delete(`/finance/payments/${p.id}/`);
                          setPayments((current) => current.filter((payment) => payment.id !== p.id));
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 size={15} />
                        Void
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
