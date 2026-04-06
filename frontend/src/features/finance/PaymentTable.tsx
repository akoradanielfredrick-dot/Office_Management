import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { api, buildBackendApiUrl, toNumber } from '../../lib/api';
import type { PaginatedResponse } from '../operations/listTypes';

interface Payment {
  id: string;
  booking: string;
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

const extractResults = <T,>(payload: T[] | PaginatedResponse<T> | undefined | null): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
};

export const PaymentTable: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tableError, setTableError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [methodFilter, setMethodFilter] = useState(searchParams.get('method') || 'ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState(searchParams.get('type') || 'ALL');
  const [currencyFilter, setCurrencyFilter] = useState(searchParams.get('currency') || 'ALL');

  useEffect(() => {
    const fetchPayments = async () => {
      const response = await api.get('/finance/payments/');
      setPayments(extractResults<Payment>(response.data));
    };

    fetchPayments().catch((error) => {
      console.error('Failed to load payments:', error);
      setPayments([]);
      setTableError('Payments could not be loaded right now.');
    });
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (searchTerm.trim()) {
      nextParams.set('search', searchTerm.trim());
    }
    if (methodFilter !== 'ALL') {
      nextParams.set('method', methodFilter);
    }
    if (paymentTypeFilter !== 'ALL') {
      nextParams.set('type', paymentTypeFilter);
    }
    if (currencyFilter !== 'ALL') {
      nextParams.set('currency', currencyFilter);
    }
    setSearchParams(nextParams, { replace: true });
  }, [currencyFilter, methodFilter, paymentTypeFilter, searchTerm, setSearchParams]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch = !normalizedSearch || [
        payment.internal_reference,
        payment.booking_ref,
        payment.recorder_name,
        payment.method,
        payment.payment_type,
        payment.payment_type_display,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesMethod = methodFilter === 'ALL' || payment.method === methodFilter;
      const matchesPaymentType = paymentTypeFilter === 'ALL' || payment.payment_type === paymentTypeFilter;
      const matchesCurrency = currencyFilter === 'ALL' || payment.currency === currencyFilter;

      return matchesSearch && matchesMethod && matchesPaymentType && matchesCurrency;
    });
  }, [currencyFilter, methodFilter, paymentTypeFilter, payments, searchTerm]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthToDatePayments = filteredPayments.filter((payment) => new Date(payment.payment_date) >= monthStart);
  const mtdBreakdown = monthToDatePayments.reduce(
    (summary, payment) => {
      const amount = toNumber(payment.amount);
      const currency = payment.currency.toUpperCase();

      if (currency === 'USD') {
        summary.usd += amount;
      } else if (currency === 'EUR') {
        summary.eur += amount;
      } else if (currency === 'GBP') {
        summary.gbp += amount;
      } else if (currency === 'KES') {
        summary.kes += amount;
      }
      return summary;
    },
    { usd: 0, eur: 0, gbp: 0, kes: 0 }
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
          <p className="mt-2 text-3xl font-black text-slate-900">USD {mtdBreakdown.usd.toLocaleString()}</p>
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
            <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary-100">
              <span>GBP Recorded</span>
              <span className="font-black text-slate-700">GBP {mtdBreakdown.gbp.toLocaleString()}</span>
            </div>
          </div>
          <p className="mt-4 text-xs font-medium leading-5 text-slate-500">
            Collections are shown in the three operating currencies only: USD, EUR, and GBP.
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ReceiptText size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Receipts Generated</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{filteredPayments.length}</p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ArrowUpRight size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Pending Reconciliation</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0</p>
        </div>
      </section>

      {tableError ? (
        <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {tableError}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by payment reference, booking, or client..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={methodFilter}
                onChange={(event) => setMethodFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-colors hover:bg-slate-50 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              >
                <option value="ALL">All Methods</option>
                <option value="MPESA">MPesa</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={paymentTypeFilter}
                onChange={(event) => setPaymentTypeFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-colors hover:bg-slate-50 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="BALANCE">Balance Payment</option>
                <option value="FULL">Full Payment</option>
              </select>

              <select
                value={currencyFilter}
                onChange={(event) => setCurrencyFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-colors hover:bg-slate-50 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              >
                <option value="ALL">All Currencies</option>
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('');
                  setMethodFilter('ALL');
                  setPaymentTypeFilter('ALL');
                  setCurrencyFilter('ALL');
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <Filter size={17} />
                Reset Filters
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              <Filter size={14} />
              Showing {filteredPayments.length} of {payments.length} payments
            </div>
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
              {filteredPayments.map((p) => (
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
                        onClick={() => navigate(`/bookings/${p.booking}`)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <ArrowUpRight size={15} />
                        Booking
                      </button>
                      <button
                        onClick={() => p.receipt?.id && window.open(buildBackendApiUrl(`/finance/receipts/${p.receipt.id}/download/`), '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Download size={15} />
                        Receipt
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Void payment ${p.internal_reference}? This will remove it from the booking's paid balance.`)) {
                            return;
                          }

                          try {
                            setTableError('');
                            await api.delete(`/finance/payments/${p.id}/`);
                            setPayments((current) => current.filter((payment) => payment.id !== p.id));
                          } catch (error) {
                            console.error('Failed to void payment:', error);
                            setTableError('The payment could not be voided right now.');
                          }
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
              {!filteredPayments.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="space-y-2">
                      <p className="text-base font-black text-slate-700">No payments match this view.</p>
                      <p className="text-sm font-medium text-slate-500">
                        Adjust the search or filters, or record a new payment to populate the ledger.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
