import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { ReportToolbar } from './ReportToolbar';
import { api } from '../../lib/api';

interface DebtData {
  id: string;
  ref: string;
  client: string;
  currency: string;
  total_cost: number;
  paid_amount: number;
  balance: number;
  last_payment: string;
  days_overdue: number;
}

export const OutstandingBalances: React.FC = () => {
  const navigate = useNavigate();
  const [debtData, setDebtData] = useState<DebtData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebt = async () => {
      try {
        const response = await api.get('/finance/analytics/outstanding/');
        setDebtData(response.data);
      } catch (err) {
        console.error('Debt fetch failed', err);
        setDebtData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDebt();
  }, []);

  const operatingCurrencies = ['USD', 'EUR', 'GBP'] as const;
  const totalDebtByCurrency = operatingCurrencies.map((currency) => ({
    currency,
    value: debtData
      .filter((debt) => debt.currency === currency)
      .reduce((sum, debt) => sum + Number(debt.balance), 0),
  }));

  if (loading) return <div className="p-8 text-center text-slate-400">Aging debt records...</div>;

  return (
    <div className="space-y-8">
      <section className="flex items-start gap-4">
        <button
          onClick={() => navigate('/analytics')}
          className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Detailed Analytics</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Debt Aging Tracker</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Categorized collection risk and recovery actions for outstanding booking balances.</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-[1.8rem] border border-rose-200 bg-rose-600 p-5 text-white shadow-xl shadow-rose-200/50">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-100">Total Outstanding Portfolio</p>
          <div className="mt-3 space-y-2">
            {totalDebtByCurrency.map((item) => (
              <p key={item.currency} className="text-xl font-black">{item.currency} {item.value.toLocaleString()}</p>
            ))}
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
            <AlertCircle size={13} />
            High risk (60+ days): {debtData.filter((d) => d.days_overdue > 60).length}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Aging Buckets</p>
          <div className="mt-6 flex h-20 items-end justify-between gap-4">
            {[15, 30, 45, 60, 40].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="h-full w-full overflow-hidden rounded-t-xl bg-slate-100">
                  <div className="w-full rounded-t-xl bg-rose-400" style={{ height: `${h}%` }} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {['0-30', '31-60', '61-90', '91-120', '120+'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <ReportToolbar placeholder="Search debtors or bookings..." onSearch={() => {}} onDateChange={() => {}} onExport={() => window.print()} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Booking / Client</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Balance Due</th>
                <th className="px-6 py-4 text-center">Aging Status</th>
                <th className="px-6 py-4 text-right">Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debtData.filter((d) => d.balance > 0).sort((a, b) => b.days_overdue - a.days_overdue).map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900">{d.ref}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{d.client}</p>
                  </td>
                  <td className="px-6 py-5 text-right text-sm font-medium text-slate-500">{d.currency} {d.total_cost.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right text-sm font-black text-emerald-600">+{d.currency} {d.paid_amount.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right text-sm font-black text-rose-600">{d.currency} {d.balance.toLocaleString()}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={clsx(
                      'inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1',
                      d.days_overdue > 60 ? 'bg-rose-100 text-rose-700 ring-rose-200' :
                      d.days_overdue > 30 ? 'bg-amber-100 text-amber-700 ring-amber-200' :
                      'bg-sky-100 text-sky-700 ring-sky-200'
                    )}>
                      {d.days_overdue} days overdue
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => navigate(`/finance/payments/new?bookingId=${d.id}`)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary-900/20 transition-colors hover:bg-primary-800"
                    >
                      Record Recovery
                      <ArrowRight size={15} />
                    </button>
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
