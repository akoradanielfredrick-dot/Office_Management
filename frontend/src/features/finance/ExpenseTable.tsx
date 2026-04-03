import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Building,
  Tag,
  ExternalLink,
  Wallet,
  BriefcaseBusiness,
  Landmark,
} from 'lucide-react';
import { api, toNumber } from '../../lib/api';

interface Expense {
  id: string;
  booking?: string | null;
  internal_reference: string;
  expense_date: string;
  category: string;
  category_display: string;
  amount: number | string;
  currency: string;
  supplier_name: string;
  booking_ref: string;
  description: string;
}

const operatingCurrencies = ['USD', 'EUR', 'GBP'] as const;

const sumByCurrency = (items: Expense[]) =>
  operatingCurrencies.reduce<Record<(typeof operatingCurrencies)[number], number>>(
    (summary, currency) => {
      summary[currency] = items
        .filter((item) => item.currency === currency)
        .reduce((sum, item) => sum + toNumber(item.amount), 0);
      return summary;
    },
    { USD: 0, EUR: 0, GBP: 0 }
  );

export const ExpenseTable: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const fetchExpenses = async () => {
      const response = await api.get('/finance/expenses/');
      setExpenses(response.data);
    };

    fetchExpenses().catch((error) => {
      console.error('Failed to load expenses:', error);
      setExpenses([]);
    });
  }, []);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthExpenses = expenses.filter((expense) => new Date(expense.expense_date) >= monthStart);
  const totalExpenses = sumByCurrency(monthExpenses);
  const directCosts = sumByCurrency(expenses.filter((expense) => expense.booking_ref));
  const generalOverheads = sumByCurrency(expenses.filter((expense) => !expense.booking_ref));

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Finance Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Expense Management</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Track outgoing operational spend, separate direct tour costs from overheads, and keep profitability visible.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/finance/expenses/new')}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800"
        >
          <Plus size={18} />
          Record New Expense
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <Wallet size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Total Expenses (MTD)</p>
          <div className="mt-3 space-y-2">
            {operatingCurrencies.map((currency) => (
              <p key={currency} className="text-lg font-black text-slate-900">{currency} {totalExpenses[currency].toLocaleString()}</p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <BriefcaseBusiness size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Tour Direct Costs</p>
          <div className="mt-3 space-y-2">
            {operatingCurrencies.map((currency) => (
              <p key={currency} className="text-lg font-black text-slate-900">{currency} {directCosts[currency].toLocaleString()}</p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
            <Landmark size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">General Overheads</p>
          <div className="mt-3 space-y-2">
            {operatingCurrencies.map((currency) => (
              <p key={currency} className="text-lg font-black text-slate-900">{currency} {generalOverheads[currency].toLocaleString()}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by expense reference, supplier, booking, or description..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Filter size={17} />
              Category
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Expense</th>
                <th className="px-6 py-4">Supplier / Details</th>
                <th className="px-6 py-4">Booking</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-5">
                    <div className="flex w-16 flex-col items-center justify-center rounded-2xl bg-slate-50 py-3 text-center">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="mt-1 text-2xl font-black text-slate-700">
                        {new Date(e.expense_date).getDate()}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div>
                      <p className="font-black text-slate-900">{e.internal_reference}</p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 ring-1 ring-slate-200">
                        <Tag size={12} />
                        {e.category_display || e.category}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="max-w-xs">
                      <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                        <Building size={14} className="text-slate-400" />
                        {e.supplier_name || 'No supplier'}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-500">{e.description}</p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    {e.booking_ref ? (
                      <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-sky-700 ring-1 ring-sky-200">
                        {e.booking_ref}
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        General Office
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <p className="text-lg font-black text-rose-600">
                      {e.currency} {toNumber(e.amount).toLocaleString()}
                    </p>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <button
                        onClick={() => e.booking && navigate(`/bookings/${e.booking}`)}
                        disabled={!e.booking}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ExternalLink size={15} />
                        Open
                      </button>
                      <button
                        onClick={async () => {
                          await api.delete(`/finance/expenses/${e.id}/`);
                          setExpenses((current) => current.filter((expense) => expense.id !== e.id));
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
