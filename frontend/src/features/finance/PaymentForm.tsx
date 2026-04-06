import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Save,
  X,
  CreditCard,
  DollarSign,
  Calendar,
  FileText,
  ArrowRightLeft,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { api, toNumber } from '../../lib/api';
import type { PaginatedResponse } from '../operations/listTypes';

const paymentSchema = z.object({
  booking: z.string().uuid('Please select a booking'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().min(3),
  exchange_rate: z.number().min(0.0001),
  payment_type: z.string().min(1, 'Payment type is required'),
  method: z.string().min(1, 'Payment method is required'),
  payment_date: z.string().min(1, 'Date is required'),
  txn_reference: z.string(),
  notes: z.string(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface BookingOption {
  id: string;
  reference_no: string;
  client_name?: string;
  product_name?: string;
  product_name_snapshot?: string;
  product_destination_snapshot?: string;
  travel_date?: string;
  start_date?: string;
  currency: string;
  total_cost: number | string;
  paid_amount: number | string;
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

export const PaymentForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdFromUrl = searchParams.get('bookingId');
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, watch, setValue, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      booking: bookingIdFromUrl || '',
      amount: 0,
      currency: 'KES',
      exchange_rate: 1,
      payment_type: 'DEPOSIT',
      payment_date: new Date().toISOString().split('T')[0],
      method: 'MPESA',
      txn_reference: '',
      notes: '',
    },
  });

  const selectedBookingId = watch('booking');
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);
  const selectedPaymentType = watch('payment_type');
  const selectedCurrency = watch('currency');
  const enteredAmount = watch('amount');
  const enteredExchangeRate = watch('exchange_rate');

  useEffect(() => {
    if (selectedBooking?.currency) {
      setValue('currency', selectedBooking.currency);
      setValue('exchange_rate', 1);
    }
  }, [selectedBooking, setValue]);

  useEffect(() => {
    if (!selectedBooking?.currency) {
      return;
    }

    if (selectedCurrency === selectedBooking.currency && toNumber(enteredExchangeRate) !== 1) {
      setValue('exchange_rate', 1);
    }
  }, [enteredExchangeRate, selectedBooking, selectedCurrency, setValue]);

  useEffect(() => {
    const fetchBookings = async () => {
      const response = await api.get('/operations/bookings/');
      setBookings(extractResults<BookingOption>(response.data));
    };

    fetchBookings().catch((error) => {
      console.error('Failed to load bookings:', error);
      setBookings([]);
    });
  }, []);

  const onSubmit = async (data: PaymentFormValues) => {
    setSubmitError('');
    clearErrors();

    try {
      await api.post('/finance/payments/', {
        ...data,
        amount: toNumber(data.amount),
        exchange_rate: toNumber(data.exchange_rate),
        payment_date: `${data.payment_date}T00:00:00+03:00`,
      });
      navigate('/finance/payments');
    } catch (error) {
      console.error('Failed to record payment:', error);
      if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
        const payload = error.response.data as Record<string, unknown>;
        const fieldEntries = Object.entries(payload).filter(([, value]) => Array.isArray(value) || typeof value === 'string');

        fieldEntries.forEach(([field, value]) => {
          const message = Array.isArray(value) ? String(value[0] ?? '') : String(value);
          if (
            field === 'booking'
            || field === 'amount'
            || field === 'currency'
            || field === 'exchange_rate'
            || field === 'payment_type'
            || field === 'method'
            || field === 'payment_date'
            || field === 'txn_reference'
            || field === 'notes'
          ) {
            setError(field as keyof PaymentFormValues, { type: 'server', message });
          }
        });

        const detail = payload.detail;
        if (typeof detail === 'string' && detail.trim()) {
          setSubmitError(detail);
          return;
        }

        const firstFieldMessage = fieldEntries.length
          ? (Array.isArray(fieldEntries[0][1]) ? String((fieldEntries[0][1] as unknown[])[0] ?? '') : String(fieldEntries[0][1]))
          : '';
        if (firstFieldMessage) {
          setSubmitError(firstFieldMessage);
          return;
        }
      }

      setSubmitError('Unable to record the payment right now. Please confirm the booking and transaction fields, then try again.');
    }
  };

  const balance = selectedBooking ? Math.max(toNumber(selectedBooking.total_cost) - toNumber(selectedBooking.paid_amount), 0) : 0;
  const isSameCurrency = selectedBooking ? selectedCurrency === selectedBooking.currency : true;
  const convertedIncomingAmount = selectedBooking
    ? (isSameCurrency ? toNumber(enteredAmount) : toNumber(enteredAmount) * toNumber(enteredExchangeRate || 1))
    : 0;
  const projectedBalance = Math.max(balance - convertedIncomingAmount, 0);
  const wouldOverpay = Boolean(selectedBooking) && convertedIncomingAmount > balance;
  const bookingIsSettled = Boolean(selectedBooking) && balance <= 0;
  const inputClassName = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
  const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Finance Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Record Payment</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Capture a payment, issue the receipt trail, and update the booking’s financial position with accuracy.
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <CreditCard size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Receipt Input</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Transaction Details</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClassName}>Select Booking</label>
                  <div className="relative">
                    <select {...register('booking')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="">-- Choose a Booking --</option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.reference_no} - {b.client_name} ({b.currency} {Math.max(toNumber(b.total_cost) - toNumber(b.paid_amount), 0).toLocaleString()} due)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                  {errors.booking && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.booking.message}</p>}
                  {selectedBooking ? (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {selectedBooking.client_name || 'Client'} | {selectedBooking.reference_no} | {selectedBooking.currency} {balance.toLocaleString()} still due
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={labelClassName}>Amount Paid</label>
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
                  {errors.amount && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.amount.message}</p>}
                  {selectedBooking ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setValue('currency', selectedBooking.currency);
                          setValue('exchange_rate', 1);
                          setValue('amount', balance);
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Use Balance Due
                      </button>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className={labelClassName}>Payment Date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" {...register('payment_date')} className={`${inputClassName} pl-11`} />
                  </div>
                  {errors.payment_date && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.payment_date.message}</p>}
                </div>

                <div>
                  <label className={labelClassName}>Currency</label>
                  <div className="relative">
                    <select {...register('currency')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="KES">KES - Kenya Shilling</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - Pound Sterling</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                  {errors.currency && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.currency.message}</p>}
                </div>

                <div>
                  <label className={labelClassName}>Exchange Rate</label>
                  <div className="relative">
                    <ArrowRightLeft size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      step="0.0001"
                      {...register('exchange_rate', { valueAsNumber: true })}
                      className={`${inputClassName} pl-11`}
                      disabled={isSameCurrency}
                    />
                  </div>
                  {selectedBooking ? (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {isSameCurrency
                        ? 'Same currency as booking. Exchange rate locked to 1.'
                        : `Converted into ${selectedBooking.currency} before updating booking balance.`}
                    </p>
                  ) : null}
                  {errors.exchange_rate && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.exchange_rate.message}</p>}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Audit Trail</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Audit & References</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>Payment Type</label>
                  <div className="relative">
                    <select {...register('payment_type')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="DEPOSIT">Deposit</option>
                      <option value="BALANCE">Balance Payment</option>
                      <option value="FULL">Full Payment</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                  {selectedPaymentType === 'DEPOSIT' && selectedBooking ? (
                    <p className="mt-2 text-xs font-semibold text-amber-600">
                      Deposits are flexible. Enter any amount the client is paying now, as long as it does not exceed the remaining balance.
                    </p>
                  ) : null}
                  {selectedPaymentType === 'FULL' && selectedBooking ? (
                    <p className="mt-2 text-xs font-semibold text-sky-600">
                      Full payment should normally clear the booking balance in one go.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className={labelClassName}>Payment Method</label>
                  <div className="relative">
                    <select {...register('method')} className={`${inputClassName} appearance-none pr-12`}>
                      <option value="MPESA">MPesa</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                  {errors.method && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.method.message}</p>}
                </div>

                <div>
                  <label className={labelClassName}>Transaction Reference</label>
                  <input type="text" {...register('txn_reference')} className={inputClassName} placeholder="e.g. QRC1234567" />
                  {errors.txn_reference && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.txn_reference.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className={labelClassName}>Internal Notes / Narration</label>
                  <textarea
                    {...register('notes')}
                    className="min-h-[130px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                    placeholder="Add narration, reconciliation notes, or any internal context for this transaction..."
                  />
                  {errors.notes && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.notes.message}</p>}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-[#cfe7c8] bg-[linear-gradient(180deg,#eff9ec_0%,#def2d7_100%)] text-[#234126] shadow-[0_18px_50px_-30px_rgba(86,135,72,0.35)]">
              <div className="border-b border-[#c8dfc0] px-6 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b8f65]">Live Balance View</p>
                <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#234126]">
                  <Wallet size={22} />
                  Outstanding Summary
                </h2>
              </div>

              <div className="px-6 py-6">
                {selectedBooking ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Product</p>
                      <p className="mt-2 text-lg font-black text-[#234126]">
                        {selectedBooking.product_name || selectedBooking.product_name_snapshot || selectedBooking.product_destination_snapshot || 'Booking product'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Client</p>
                      <p className="mt-2 text-lg font-black text-[#234126]">
                        {selectedBooking.client_name || 'Client not captured'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Travel Date</p>
                      <p className="mt-2 text-lg font-black text-[#234126]">
                        {selectedBooking.travel_date || selectedBooking.start_date || 'TBD'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Booking Total</p>
                      <p className="mt-2 text-2xl font-black text-[#234126]">
                        {selectedBooking.currency} {toNumber(selectedBooking.total_cost).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Already Paid</p>
                      <p className="mt-2 text-2xl font-black text-[#2f7a40]">
                        +{selectedBooking.currency} {toNumber(selectedBooking.paid_amount).toLocaleString()}
                      </p>
                    </div>

                    {selectedPaymentType === 'DEPOSIT' ? (
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Deposit Mode</p>
                        <p className="mt-2 text-base font-black text-[#c27b10]">
                          Flexible partial payment
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#5e7d5d]">
                          Record whatever amount the client pays now. The remaining balance will stay open for later collection.
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Incoming Payment In Booking Currency</p>
                      <p className="mt-2 text-2xl font-black text-[#234126]">
                        {selectedBooking.currency} {convertedIncomingAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="border-t border-[#c8dfc0] pt-5">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b8f65]">Balance Due</p>
                      <p className="mt-2 text-3xl font-black text-[#9d3f4b]">
                        {selectedBooking.currency} {balance.toLocaleString()}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-[#5e7d5d]">
                        Projected balance after this payment: {selectedBooking.currency} {projectedBalance.toLocaleString()}
                      </p>
                      {wouldOverpay ? (
                        <p className="mt-3 text-sm font-semibold text-rose-700">
                          This amount is higher than the remaining balance. Reduce it before recording the payment.
                        </p>
                      ) : null}
                      {bookingIsSettled ? (
                        <p className="mt-3 text-sm font-semibold text-emerald-700">
                          This booking is already fully settled.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm font-medium italic text-[#5e7d5d]">
                    Select a booking to review its outstanding balance and payment position.
                  </div>
                )}
              </div>
            </section>

            <button
              type="submit"
              disabled={isSubmitting || bookingIsSettled || wouldOverpay}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-700 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save size={19} />
              {isSubmitting ? 'Recording...' : 'Record Payment & Receipt'}
            </button>
            {submitError ? <p className="px-2 text-sm font-semibold text-rose-500">{submitError}</p> : null}
          </div>
        </div>
      </form>
    </div>
  );
};
