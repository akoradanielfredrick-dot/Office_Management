import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  ShieldCheck,
  Download,
  History,
  ListChecks,
  ShoppingCart,
  MapPin,
  Calendar,
  Users,
  ReceiptText,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api, toNumber } from '../../lib/api';

interface BookingPayment {
  id: string;
  internal_reference: string;
  payment_date: string;
  amount: number | string;
  method: string;
  receipt?: { id: string };
}

interface BookingExpense {
  id: string;
  internal_reference: string;
  expense_date: string;
  category: string;
  amount: number | string;
  supplier_name?: string;
}

interface BookingDetailRecord {
  id: string;
  reference_no: string;
  status: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  package_name?: string;
  package_type_display?: string;
  destination_package: string;
  travel_date?: string;
  number_of_days: number;
  num_adults: number;
  price_per_adult: number | string;
  num_children: number;
  price_per_child: number | string;
  extra_charges: number | string;
  itinerary?: string;
  start_date: string;
  end_date: string;
  currency: string;
  subtotal: number | string;
  discount: number | string;
  total_cost: number | string;
  paid_amount: number | string;
  booking_validity?: string;
  deposit_terms?: string;
  payment_channels?: string;
  created_at: string;
}

export const BookingDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'itinerary' | 'payments' | 'travellers' | 'expenses'>('expenses');
  const [booking, setBooking] = React.useState<BookingDetailRecord | null>(null);
  const [payments, setPayments] = React.useState<BookingPayment[]>([]);
  const [expenses, setExpenses] = React.useState<BookingExpense[]>([]);

  React.useEffect(() => {
    if (!id) {
      return;
    }

    const fetchData = async () => {
      const [bookingResponse, paymentsResponse, expensesResponse] = await Promise.all([
        api.get(`/operations/bookings/${id}/`),
        api.get(`/finance/payments/?booking=${id}`),
        api.get(`/finance/expenses/?booking=${id}`),
      ]);

      setBooking(bookingResponse.data);
      setPayments(paymentsResponse.data);
      setExpenses(expensesResponse.data);
    };

    fetchData().catch((error) => {
      console.error('Failed to load booking details:', error);
      setBooking(null);
      setPayments([]);
      setExpenses([]);
    });
  }, [id]);

  if (!booking) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">Loading booking...</div>;
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const paidAmount = toNumber(booking.paid_amount);
  const totalCost = toNumber(booking.total_cost);
  const grossProfit = paidAmount - totalExpenses;
  const balance = totalCost - paidAmount;
  const paymentProgress = totalCost > 0 ? (paidAmount / totalCost) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bookings')}
            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Record</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{booking.reference_no}</h1>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 ring-1 ring-emerald-200">
                {booking.status}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Tour for {booking.client_name} | {booking.package_name || booking.destination_package}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Printer size={18} />
            Print Voucher
          </button>
          <button
            onClick={() => navigate(`/finance/payments/new?bookingId=${booking.id}`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800"
          >
            <CreditCard size={18} />
            Add Payment
          </button>
          <button
            onClick={() => navigate(`/finance/expenses/new?bookingId=${booking.id}`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-900/20 transition-colors hover:bg-rose-700"
          >
            <ShoppingCart size={18} />
            Add Expense
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <MapPin size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Package</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{booking.package_name || booking.destination_package}</p>
          {booking.package_type_display ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">{booking.package_type_display}</p> : null}
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Calendar size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Travel Date</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{booking.travel_date || booking.start_date}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{booking.number_of_days} day trip</p>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Users size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Travellers</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{booking.num_adults} Adults, {booking.num_children} Children</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {booking.currency} {toNumber(booking.price_per_adult).toLocaleString()} per adult | {booking.currency} {toNumber(booking.price_per_child).toLocaleString()} per child
          </p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.7fr_0.8fr]">
        <div className="space-y-6">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-sm">
            {[
              { id: 'expenses', label: 'Expenses', icon: ShoppingCart },
              { id: 'payments', label: 'Payments', icon: History },
              { id: 'itinerary', label: 'Itinerary', icon: ListChecks },
              { id: 'travellers', label: 'Travellers', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
                  activeTab === tab.id
                    ? 'bg-primary-700 text-white shadow-md shadow-primary-900/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {activeTab === 'expenses' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Direct Operations Costing</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">Expense Register</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {expenses.length} items
                  </span>
                </div>

                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                      <tr>
                        <th className="px-5 py-4">Reference</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Supplier</th>
                        <th className="px-5 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td className="px-5 py-5 text-sm font-black text-slate-900">{e.internal_reference}</td>
                          <td className="px-5 py-5">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 ring-1 ring-slate-200">
                              {e.category}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-sm font-medium text-slate-600">{e.supplier_name || 'No supplier'}</td>
                          <td className="px-5 py-5 text-right text-sm font-black text-rose-600">
                            -{booking.currency} {toNumber(e.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-rose-50/60">
                        <td colSpan={3} className="px-5 py-5 text-right text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                          Total Direct Costs
                        </td>
                        <td className="px-5 py-5 text-right text-sm font-black text-rose-700">
                          {booking.currency} {totalExpenses.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'payments' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Collections</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">Payment History</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {payments.length} transaction
                  </span>
                </div>

                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                      <tr>
                        <th className="px-5 py-4">Reference</th>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Method</th>
                        <th className="px-5 py-4 text-right">Amount</th>
                        <th className="px-5 py-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-5 py-5 text-sm font-black text-slate-900">{p.internal_reference}</td>
                          <td className="px-5 py-5 text-sm font-medium text-slate-500">{p.payment_date?.slice(0, 10)}</td>
                          <td className="px-5 py-5 text-sm font-semibold text-slate-700">{p.method}</td>
                          <td className="px-5 py-5 text-right text-sm font-black text-slate-900">
                            {booking.currency} {toNumber(p.amount).toLocaleString()}
                          </td>
                          <td className="px-5 py-5 text-right">
                            <button
                              onClick={() => p.receipt?.id && window.open(`/api/finance/receipts/${p.receipt.id}/download/`, '_blank')}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                            >
                              <Download size={15} />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'itinerary' ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Safari Plan</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Itinerary & Terms</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Booking Validity</p>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{booking.booking_validity || 'Not specified'}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Deposit Terms</p>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{booking.deposit_terms || 'Not specified'}</p>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Itinerary</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                    {booking.itinerary || 'No itinerary has been entered yet.'}
                  </p>
                </div>

                <div className="rounded-[1.6rem] border border-slate-200 bg-primary-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary-700">Payment Channels</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                    {booking.payment_channels || 'No payment channels have been specified yet.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Client Snapshot</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Traveller Contact Context</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Lead Client</p>
                    <p className="mt-3 text-sm font-bold text-slate-900">{booking.client_name}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">{booking.client_email || 'No email captured'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-600">{booking.client_phone || 'No phone captured'}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Pricing Snapshot</p>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Adults: {booking.num_adults} x {booking.currency} {toNumber(booking.price_per_adult).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Children: {booking.num_children} x {booking.currency} {toNumber(booking.price_per_child).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Extra charges: {booking.currency} {toNumber(booking.extra_charges).toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Discount: {booking.currency} {toNumber(booking.discount).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.8)]">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Performance View</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-white">
                <ShieldCheck size={22} />
                Profitability Index
              </h2>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Revenue Collected</p>
                <p className="mt-2 text-2xl font-black text-emerald-400">+{booking.currency} {paidAmount.toLocaleString()}</p>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Direct Tour Costs</p>
                <p className="mt-2 text-2xl font-black text-rose-400">-{booking.currency} {totalExpenses.toLocaleString()}</p>
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Estimated Gross Profit</p>
                <p className={clsx('mt-2 text-4xl font-black', grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-500')}>
                  {booking.currency} {grossProfit.toLocaleString()}
                </p>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={clsx('h-full rounded-full transition-all duration-1000', grossProfit >= 0 ? 'bg-emerald-400' : 'bg-rose-500')}
                  style={{ width: `${Math.max(0, Math.min(100, paidAmount > 0 ? (grossProfit / paidAmount) * 100 : 0))}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Collections Progress</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Payment Target</h2>

            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Balance Due</p>
                <p className="mt-1 text-3xl font-black text-rose-600">{booking.currency} {balance.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary-700">
                {Math.round(paymentProgress)}% paid
              </div>
            </div>

            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${paymentProgress}%` }} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Booking Record</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Reference Notes</h2>

            <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{booking.reference_no}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Created {new Date(booking.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Subtotal</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{booking.currency} {toNumber(booking.subtotal).toLocaleString()}</p>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Payment Channels</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{booking.payment_channels || 'Not specified'}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
