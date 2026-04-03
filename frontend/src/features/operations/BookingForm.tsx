import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Calendar,
  ChevronDown,
  Clock3,
  FileText,
  MapPinned,
  Save,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { api, formatMoney, toNumber } from '../../lib/api';
import type { PaginatedResponse } from './listTypes';

const bookingSchema = z.object({
  client: z.string().uuid('Please select a client'),
  product: z.string().uuid('Please select a product'),
  schedule: z.string().uuid('Please select a schedule'),
  customer_full_name: z.string().min(2, 'Customer name is required'),
  customer_email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  travel_date: z.string().min(1, 'Travel date is required'),
  number_of_days: z.number().min(1, 'Number of days must be at least 1'),
  adult_quantity: z.number().min(0),
  adult_price: z.number().min(0),
  child_quantity: z.number().min(0),
  child_price: z.number().min(0),
  infant_quantity: z.number().min(0),
  infant_price: z.number().min(0),
  extra_charges: z.number().min(0),
  discount: z.number().min(0),
  itinerary: z.string().optional(),
  booking_validity: z.string().optional(),
  deposit_terms: z.string().optional(),
  payment_channels: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  supplier_notes: z.string().optional(),
  currency: z.string().min(3),
  status: z.enum(['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'FAILED', 'AMENDED']),
  source: z.enum(['ADMIN', 'WEBSITE', 'OTA', 'API', 'MANUAL_OFFICE', 'LEGACY']),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface ClientOption {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
}

interface ParticipantCategoryOption {
  id: string;
  code: string;
  label: string;
}

interface ProductPriceOption {
  id: string;
  participant_category?: string | null;
  participant_category_label?: string;
  rate_name: string;
  currency: string;
  amount: string | number;
}

interface ProductOption {
  id: string;
  product_code: string;
  name: string;
  category: string;
  category_display: string;
  destination: string;
  description?: string;
  cancellation_policy?: string;
  default_currency: string;
  participant_categories: ParticipantCategoryOption[];
  prices: ProductPriceOption[];
}

interface ScheduleOption {
  id: string;
  schedule_code: string;
  title?: string;
  product: string;
  start_at?: string;
  end_at?: string;
  timezone: string;
  status: string;
  status_display: string;
  total_capacity: number;
  remaining_capacity: number;
  notes?: string;
}

const operatingCurrencies = ['USD', 'EUR', 'GBP'] as const;

const resolveSelectableCurrencies = (product?: ProductOption): string[] => {
  const currencies = Array.from(
    new Set((product?.prices || []).map((price) => price.currency).filter((value) => operatingCurrencies.includes(value as (typeof operatingCurrencies)[number])))
  );

  return currencies.length ? currencies : [...operatingCurrencies];
};

const resolvePreferredCurrency = (product?: ProductOption): string => {
  const allowedCurrencies = resolveSelectableCurrencies(product);
  if (product?.default_currency && allowedCurrencies.includes(product.default_currency)) {
    return product.default_currency;
  }
  return allowedCurrencies[0] || 'USD';
};

const extractResults = <T,>(payload: T[] | PaginatedResponse<T> | undefined | null): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
};

const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';
const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
const readonlyInputClassName = `${inputClassName} bg-slate-50 text-slate-500`;

export const BookingForm: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = React.useState<ClientOption[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [schedules, setSchedules] = React.useState<ScheduleOption[]>([]);
  const [submitError, setSubmitError] = React.useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      client: '',
      product: '',
      schedule: '',
      customer_full_name: '',
      customer_email: '',
      customer_phone: '',
      travel_date: new Date().toISOString().split('T')[0],
      number_of_days: 1,
      adult_quantity: 2,
      adult_price: 0,
      child_quantity: 0,
      child_price: 0,
      infant_quantity: 0,
      infant_price: 0,
      extra_charges: 0,
      discount: 0,
      itinerary: '',
      booking_validity: '',
      deposit_terms: '',
      payment_channels: '',
      notes: '',
      internal_notes: '',
      supplier_notes: '',
      currency: 'USD',
      status: 'CONFIRMED',
      source: 'MANUAL_OFFICE',
    },
  });

  React.useEffect(() => {
    const fetchLookups = async () => {
      const [clientsResponse, productsResponse, schedulesResponse] = await Promise.all([
        api.get('/clients/'),
        api.get('/operations/products/'),
        api.get('/operations/schedules/'),
      ]);

      setClients(extractResults<ClientOption>(clientsResponse.data));
      setProducts(extractResults<ProductOption>(productsResponse.data));
      setSchedules(extractResults<ScheduleOption>(schedulesResponse.data));
    };

    fetchLookups().catch((error) => {
      console.error('Failed to load booking lookups:', error);
      setClients([]);
      setProducts([]);
      setSchedules([]);
    });
  }, []);

  const selectedClientId = watch('client');
  const selectedProductId = watch('product');
  const selectedScheduleId = watch('schedule');
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);
  const filteredSchedules = schedules.filter((schedule) => schedule.product === selectedProductId);

  React.useEffect(() => {
    if (!selectedClient) {
      return;
    }

    setValue('customer_full_name', selectedClient.full_name || '');
    setValue('customer_email', selectedClient.email || '');
    setValue('customer_phone', selectedClient.phone || '');
  }, [selectedClient, setValue]);

  React.useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setValue('currency', resolvePreferredCurrency(selectedProduct));
    setValue('itinerary', selectedProduct.description || '');
  }, [selectedProduct, setValue]);

  React.useEffect(() => {
    if (!selectedSchedule || !selectedSchedule.start_at) {
      return;
    }

    setValue('travel_date', selectedSchedule.start_at.slice(0, 10));
  }, [selectedSchedule, setValue]);

  React.useEffect(() => {
    if (selectedScheduleId && !filteredSchedules.some((schedule) => schedule.id === selectedScheduleId)) {
      setValue('schedule', '');
    }
  }, [filteredSchedules, selectedScheduleId, setValue]);

  const adultQuantity = watch('adult_quantity');
  const adultPrice = watch('adult_price');
  const childQuantity = watch('child_quantity');
  const childPrice = watch('child_price');
  const infantQuantity = watch('infant_quantity');
  const infantPrice = watch('infant_price');
  const extraCharges = watch('extra_charges');
  const discount = watch('discount');
  const currency = watch('currency');

  React.useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const adultRate = selectedProduct.prices.find(
      (price) =>
        price.currency === currency &&
        (!price.participant_category_label || price.participant_category_label.toUpperCase() === 'ADULT')
    );
    const childRate = selectedProduct.prices.find(
      (price) =>
        price.currency === currency &&
        price.participant_category_label?.toUpperCase() === 'CHILD'
    );
    const infantRate = selectedProduct.prices.find(
      (price) =>
        price.currency === currency &&
        price.participant_category_label?.toUpperCase() === 'INFANT'
    );

    setValue('adult_price', adultRate ? toNumber(adultRate.amount) : 0);
    setValue('child_price', childRate ? toNumber(childRate.amount) : 0);
    setValue('infant_price', infantRate ? toNumber(infantRate.amount) : 0);
  }, [currency, selectedProduct, setValue]);

  const subtotal =
    toNumber(adultQuantity) * toNumber(adultPrice) +
    toNumber(childQuantity) * toNumber(childPrice) +
    toNumber(infantQuantity) * toNumber(infantPrice) +
    toNumber(extraCharges);
  const totalCost = Math.max(subtotal - toNumber(discount), 0);
  const totalParticipants = toNumber(adultQuantity) + toNumber(childQuantity) + toNumber(infantQuantity);

  const onSubmit = async (data: BookingFormValues) => {
    setSubmitError('');

    try {
      const participant_quantities = [
        { category_code: 'ADULT', category_label: 'Adult', quantity: toNumber(data.adult_quantity), unit_price: toNumber(data.adult_price) },
        { category_code: 'CHILD', category_label: 'Child', quantity: toNumber(data.child_quantity), unit_price: toNumber(data.child_price) },
        { category_code: 'INFANT', category_label: 'Infant', quantity: toNumber(data.infant_quantity), unit_price: toNumber(data.infant_price) },
      ].filter((item) => item.quantity > 0);

      const response = await api.post('/operations/bookings/', {
        client: data.client,
        product: data.product,
        schedule: data.schedule,
        customer_full_name: data.customer_full_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || '',
        travel_date: data.travel_date,
        number_of_days: toNumber(data.number_of_days),
        extra_charges: toNumber(data.extra_charges),
        discount: toNumber(data.discount),
        itinerary: data.itinerary || '',
        booking_validity: data.booking_validity || '',
        deposit_terms: data.deposit_terms || '',
        payment_channels: data.payment_channels || '',
        notes: data.notes || '',
        internal_notes: data.internal_notes || '',
        supplier_notes: data.supplier_notes || '',
        currency: data.currency,
        status: data.status,
        source: data.source,
        product_destination_snapshot: selectedProduct?.destination || selectedProduct?.name || '',
        participant_quantities,
      });

      navigate(`/bookings/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create booking:', error);
      setSubmitError('Unable to create the booking right now. Please check the schedule capacity, traveller counts, and pricing details.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Create Structured Booking</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Create a confirmed booking against a live product schedule so availability, payment tracking, and future OTA/API flows stay aligned.
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

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 xl:grid-cols-[1.65fr_0.85fr]">
        <div className="space-y-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Booking Setup</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Client, Product & Schedule</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClassName}>Client</label>
                <div className="relative">
                  <select {...register('client')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="">-- Choose Client --</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                {errors.client && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.client.message}</p>}
              </div>

              <div>
                <label className={labelClassName}>Lead Traveller Name</label>
                <input {...register('customer_full_name')} className={inputClassName} />
                {errors.customer_full_name && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.customer_full_name.message}</p>}
              </div>

              <div>
                <label className={labelClassName}>Lead Traveller Email</label>
                <input type="email" {...register('customer_email')} className={inputClassName} />
                {errors.customer_email && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.customer_email.message}</p>}
              </div>

              <div>
                <label className={labelClassName}>Lead Traveller Phone</label>
                <input {...register('customer_phone')} className={inputClassName} />
              </div>

              <div>
                <label className={labelClassName}>Product</label>
                <div className="relative">
                  <select {...register('product')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="">-- Choose Product --</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.category_display ? `(${product.category_display})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                {errors.product && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.product.message}</p>}
              </div>

              <div>
                <label className={labelClassName}>Destination</label>
                <input value={selectedProduct?.destination || ''} readOnly className={readonlyInputClassName} placeholder="Destination appears here" />
              </div>

              <div>
                <label className={labelClassName}>Schedule</label>
                <div className="relative">
                  <select {...register('schedule')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="">-- Choose Schedule --</option>
                    {filteredSchedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.schedule_code} {schedule.start_at ? `| ${schedule.start_at.slice(0, 16).replace('T', ' ')}` : ''} {`| ${schedule.remaining_capacity} left`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                {errors.schedule && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.schedule.message}</p>}
              </div>

              <div>
                <label className={labelClassName}>Travel Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" {...register('travel_date')} className={`${inputClassName} pl-11`} />
                </div>
              </div>

              <div>
                <label className={labelClassName}>Number of Days</label>
                <input type="number" min="1" {...register('number_of_days', { valueAsNumber: true })} className={inputClassName} />
              </div>

              <div>
                <label className={labelClassName}>Booking Status</label>
                <div className="relative">
                  <select {...register('status')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                    <option value="AMENDED">Amended</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>

              <div>
                <label className={labelClassName}>Booking Source</label>
                <div className="relative">
                  <select {...register('source')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="MANUAL_OFFICE">Manual Office Entry</option>
                    <option value="ADMIN">Admin</option>
                    <option value="WEBSITE">Website</option>
                    <option value="OTA">OTA</option>
                    <option value="API">API</option>
                    <option value="LEGACY">Legacy</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2964ff]">
                <WalletCards size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Pricing</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Participant Inventory & Charges</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClassName}>Adults</label>
                <input type="number" min="0" {...register('adult_quantity', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Adult Price</label>
                <input type="number" min="0" step="0.01" {...register('adult_price', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Children</label>
                <input type="number" min="0" {...register('child_quantity', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Child Price</label>
                <input type="number" min="0" step="0.01" {...register('child_price', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Infants</label>
                <input type="number" min="0" {...register('infant_quantity', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Infant Price</label>
                <input type="number" min="0" step="0.01" {...register('infant_price', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Extra Charges</label>
                <input type="number" min="0" step="0.01" {...register('extra_charges', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Discount</label>
                <input type="number" min="0" step="0.01" {...register('discount', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Currency</label>
                <div className="relative">
                  <select {...register('currency')} className={`${inputClassName} appearance-none pr-12`}>
                    {resolveSelectableCurrencies(selectedProduct).map((priceCurrency) => (
                      <option key={priceCurrency} value={priceCurrency}>
                        {priceCurrency}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Booking Content</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Itinerary, Policies & Notes</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <label className={labelClassName}>Itinerary / Description</label>
                <textarea {...register('itinerary')} className="min-h-[150px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Booking Validity</label>
                <textarea {...register('booking_validity')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Deposit Terms</label>
                <textarea {...register('deposit_terms')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Payment Channels</label>
                <textarea {...register('payment_channels')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Client Notes</label>
                <textarea {...register('notes')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Internal Notes</label>
                <textarea {...register('internal_notes')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Supplier / Fulfilment Notes</label>
                <textarea {...register('supplier_notes')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#cfe7c8] bg-[linear-gradient(180deg,#eff9ec_0%,#def2d7_100%)] text-[#234126] shadow-[0_18px_50px_-30px_rgba(86,135,72,0.35)]">
            <div className="border-b border-[#c8dfc0] px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b8f65]">Live Summary</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#234126]">
                <Clock3 size={22} />
                Inventory Snapshot
              </h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-[1.4rem] border border-[#c5dcbf] bg-white/70 px-4 py-4 shadow-[0_10px_24px_-20px_rgba(86,135,72,0.35)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6b8f65]">Selected Product</p>
                <p className="mt-2 text-lg font-black text-[#234126]">{selectedProduct?.name || 'No product selected yet'}</p>
                <p className="mt-1 text-sm font-medium text-[#4f6a50]">{selectedProduct?.category_display || 'Choose a sellable product'}</p>
              </div>

              <div className="rounded-[1.4rem] border border-[#c5dcbf] bg-white/70 px-4 py-4 shadow-[0_10px_24px_-20px_rgba(86,135,72,0.35)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6b8f65]">Selected Schedule</p>
                <p className="mt-2 text-sm font-black text-[#234126]">{selectedSchedule?.schedule_code || 'No schedule selected yet'}</p>
                <p className="mt-1 text-sm font-medium text-[#4f6a50]">
                  {selectedSchedule?.start_at ? selectedSchedule.start_at.replace('T', ' ').slice(0, 16) : 'Choose a departure or access window'}
                </p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[#6b8f65]">
                  {selectedSchedule ? `${selectedSchedule.remaining_capacity} / ${selectedSchedule.total_capacity} spaces left` : 'Availability pending'}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Travellers</span>
                  <span className="font-black text-[#234126]">{totalParticipants}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Subtotal</span>
                  <span className="font-black text-[#234126]">{formatMoney(currency, subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Discount</span>
                  <span className="font-black text-[#234126]">{formatMoney(currency, discount)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#c8dfc0] pt-3 text-sm">
                  <span className="text-[#3c593d]">Total Cost</span>
                  <span className="text-xl font-black text-[#234126]">{formatMoney(currency, totalCost)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff7e6] text-[#d97706]">
                <MapPinned size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Product Context</p>
                <p className="mt-1 text-xs font-medium leading-6 text-slate-500">
                  {selectedProduct?.destination || 'Destination will appear here once a product is selected.'}
                </p>
                {selectedProduct?.cancellation_policy ? (
                  <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                    Cancellation policy: {selectedProduct.cancellation_policy}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {submitError ? (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-600">
              {submitError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-3 rounded-[1.3rem] bg-primary-600 px-5 py-4 text-sm font-black text-white shadow-[0_16px_28px_-20px_rgba(70,111,42,0.85)] transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={18} />
            {isSubmitting ? 'Saving Booking...' : 'Create Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};
