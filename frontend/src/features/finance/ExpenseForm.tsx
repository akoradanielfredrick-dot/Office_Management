import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Save,
  X,
  ShoppingCart,
  DollarSign,
  Calendar,
  ArrowRightLeft,
  Building,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { api, toNumber } from '../../lib/api';
import type { PaginatedResponse } from '../operations/listTypes';

const expenseSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  expense_date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().min(3),
  exchange_rate: z.number().min(0.0001),
  payment_method: z.string().min(1, 'Method is required'),
  supplier: z.string().uuid().optional().or(z.literal('')),
  booking: z.string().uuid().optional().or(z.literal('')),
  invoice_ref: z.string().optional(),
  description: z.string().min(3, 'Description is required'),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface SupplierOption {
  id: string;
  name: string;
}

interface BookingOption {
  id: string;
  reference_no: string;
  client_name?: string;
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

export const ExpenseForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdFromUrl = searchParams.get('bookingId');

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'OTHER',
      expense_date: new Date().toISOString().split('T')[0],
      amount: 0,
      currency: 'KES',
      exchange_rate: 1,
      payment_method: 'CASH',
      booking: bookingIdFromUrl || '',
      supplier: '',
      invoice_ref: '',
      description: '',
      notes: '',
    },
  });

  useEffect(() => {
    const fetchLookups = async () => {
      const [suppliersResponse, bookingsResponse] = await Promise.all([
        api.get('/operations/suppliers/'),
        api.get('/operations/bookings/'),
      ]);
      setSuppliers(extractResults<SupplierOption>(suppliersResponse.data));
      setBookings(extractResults<BookingOption>(bookingsResponse.data));
    };

    fetchLookups().catch((error) => {
      console.error('Failed to load expense lookups:', error);
      setSuppliers([]);
      setBookings([]);
    });
  }, []);

  const onSubmit = async (data: ExpenseFormValues) => {
    setSubmitError('');

    try {
      await api.post('/finance/expenses/', {
        category: data.category,
        expense_date: data.expense_date,
        amount: toNumber(data.amount),
        currency: data.currency,
        exchange_rate: toNumber(data.exchange_rate),
        payment_method: data.payment_method,
        supplier: data.supplier || null,
        booking: data.booking || null,
        invoice_ref: data.invoice_ref || '',
        description: data.description,
      });
      navigate('/finance/expenses');
    } catch (error) {
      console.error('Failed to record expense:', error);
      setSubmitError('Unable to save the expense right now. Please review the required fields and try again.');
    }
  };

  const inputClassName = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
  const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Finance Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Record Expense</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Capture direct tour costs or office overheads with clear attribution for operations and profitability tracking.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-50"
        >
          <X size={22} />
        </button>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-8 xl:grid-cols-[1.65fr_0.8fr]">
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Expense Entry</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Core Details</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Category</label>
                  <div className="relative">
                    <select {...register('category')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="ACCOMMODATION">Accommodation</option>
                      <option value="TRANSPORT">Transport / Vehicle Hire</option>
                      <option value="FUEL">Fuel</option>
                      <option value="GUIDE_FEE">Guide Fees / Allowances</option>
                      <option value="PARK_FEE">Park Entry Fees</option>
                      <option value="MEAL">Meals & Drinks</option>
                      <option value="OFFICE">Office Operations</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="COMMISSION">Commission</option>
                      <option value="UTILITY">Utilities</option>
                      <option value="SALARY">Salaries & Allowances</option>
                      <option value="REFUND">Client Refunds</option>
                      <option value="OTHER">Miscellaneous</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>Expense Date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" {...register('expense_date')} className={`${inputClassName} pl-11`} />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClassName}>Description / Purpose</label>
                  <input
                    type="text"
                    {...register('description')}
                    className={inputClassName}
                    placeholder="e.g. Park fees for 3 adults at Maasai Mara"
                  />
                  {errors.description && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.description.message}</p>}
                </div>

                <div>
                  <label className={labelClassName}>Amount</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount', { valueAsNumber: true })}
                      className={`${inputClassName} pl-11`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>Currency</label>
                  <div className="relative">
                    <select {...register('currency')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="KES">KES - Kenya Shilling</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <Building size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Allocation</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Attribution & Suppliers</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Supplier (Optional)</label>
                  <div className="relative">
                    <select {...register('supplier')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="">-- No Supplier --</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>Link to Booking (Optional)</label>
                  <div className="relative">
                    <select {...register('booking')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="">-- General Office Expense --</option>
                      {bookings.map((b) => <option key={b.id} value={b.id}>{b.reference_no} - {b.client_name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClassName}>Supplier Invoice / Receipt Reference</label>
                  <input type="text" {...register('invoice_ref')} className={inputClassName} placeholder="e.g. INV-123456" />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-[#cfe7c8] bg-[linear-gradient(180deg,#eff9ec_0%,#def2d7_100%)] text-[#234126] shadow-[0_18px_50px_-30px_rgba(86,135,72,0.35)]">
              <div className="border-b border-[#c8dfc0] px-6 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b8f65]">Finance Check</p>
                <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#234126]">
                  <Wallet size={22} />
                  Financial Check
                </h2>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="border-b border-[#c8dfc0] pb-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Payment Type</p>
                  <p className="mt-2 text-2xl font-black text-[#234126]">Outgoing Cashflow</p>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">
                    Exchange Rate Used
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.0001"
                      {...register('exchange_rate', { valueAsNumber: true })}
                      className="w-full border-none bg-transparent p-0 text-3xl font-black text-[#234126] outline-none"
                    />
                    <ArrowRightLeft size={18} className="text-[#6b8f65]" />
                  </div>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-700 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save size={19} />
              {isSubmitting ? 'Recording...' : 'Save Expense Record'}
            </button>
            {submitError ? <p className="px-2 text-sm font-semibold text-rose-500">{submitError}</p> : null}

            <p className="px-4 text-center text-[11px] font-medium leading-6 text-slate-400">
              Saved expenses will flow into finance reporting and, where linked, contribute to booking profitability analysis.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
