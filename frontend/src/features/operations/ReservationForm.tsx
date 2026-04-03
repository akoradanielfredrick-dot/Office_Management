import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, ChevronDown, Clock3, FileText, Save, ShieldAlert, Users, X } from 'lucide-react';
import { api, formatMoney, toNumber } from '../../lib/api';
import type { PaginatedResponse } from './listTypes';

const reservationSchema = z.object({
  client: z.string().uuid('Please select a client'),
  product: z.string().uuid('Please select a product'),
  schedule: z.string().uuid('Please select a schedule'),
  customer_full_name: z.string().min(2, 'Customer name is required'),
  customer_email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  hold_expires_at: z.string().min(1, 'Expiry time is required'),
  adult_quantity: z.number().min(0),
  adult_price: z.number().min(0),
  child_quantity: z.number().min(0),
  child_price: z.number().min(0),
  infant_quantity: z.number().min(0),
  infant_price: z.number().min(0),
  notes: z.string().optional(),
  internal_comments: z.string().optional(),
  currency: z.string().min(3),
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

interface ClientOption {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
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
  name: string;
  category_display: string;
  destination: string;
  description?: string;
  default_currency: string;
  prices: ProductPriceOption[];
}

interface ScheduleOption {
  id: string;
  schedule_code: string;
  product: string;
  start_at?: string;
  total_capacity: number;
  remaining_capacity: number;
  status: string;
}

interface AvailabilitySnapshot {
  remaining_capacity: number;
  reserved_count: number;
  confirmed_count: number;
  cancelled_count: number;
  released_count: number;
  is_available: boolean;
  can_sell_requested_quantity: boolean;
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

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
const readonlyInputClassName = `${inputClassName} bg-slate-50 text-slate-500`;
const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

export const ReservationForm: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = React.useState<ClientOption[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [schedules, setSchedules] = React.useState<ScheduleOption[]>([]);
  const [submitError, setSubmitError] = React.useState('');
  const [availability, setAvailability] = React.useState<AvailabilitySnapshot | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      client: '',
      product: '',
      schedule: '',
      customer_full_name: '',
      customer_email: '',
      customer_phone: '',
      hold_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      adult_quantity: 2,
      adult_price: 0,
      child_quantity: 0,
      child_price: 0,
      infant_quantity: 0,
      infant_price: 0,
      notes: '',
      internal_comments: '',
      currency: 'KES',
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
      console.error('Failed to load reservation lookups:', error);
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

    setValue('currency', selectedProduct.default_currency || 'KES');
  }, [selectedProduct, setValue]);

  const adultQuantity = watch('adult_quantity');
  const adultPrice = watch('adult_price');
  const childQuantity = watch('child_quantity');
  const childPrice = watch('child_price');
  const infantQuantity = watch('infant_quantity');
  const infantPrice = watch('infant_price');
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

  React.useEffect(() => {
    if (selectedScheduleId && !filteredSchedules.some((schedule) => schedule.id === selectedScheduleId)) {
      setValue('schedule', '');
    }
  }, [filteredSchedules, selectedScheduleId, setValue]);

  const subtotal =
    toNumber(adultQuantity) * toNumber(adultPrice) +
    toNumber(childQuantity) * toNumber(childPrice) +
    toNumber(infantQuantity) * toNumber(infantPrice);
  const totalParticipants = toNumber(adultQuantity) + toNumber(childQuantity) + toNumber(infantQuantity);

  React.useEffect(() => {
    if (!selectedScheduleId) {
      setAvailability(null);
      return;
    }

    const requestedQuantity = totalParticipants;
    setAvailabilityLoading(true);

    api
      .get(`/operations/schedules/${selectedScheduleId}/availability/`, {
        params: { quantity: requestedQuantity || 0 },
      })
      .then((response) => setAvailability(response.data))
      .catch((error) => {
        console.error('Failed to load live availability:', error);
        setAvailability(null);
      })
      .finally(() => setAvailabilityLoading(false));
  }, [selectedScheduleId, totalParticipants]);

  const onSubmit = async (data: ReservationFormValues) => {
    setSubmitError('');

    try {
      const participants = [
        { category_code: 'ADULT', category_label: 'Adult', quantity: toNumber(data.adult_quantity), unit_price: toNumber(data.adult_price) },
        { category_code: 'CHILD', category_label: 'Child', quantity: toNumber(data.child_quantity), unit_price: toNumber(data.child_price) },
        { category_code: 'INFANT', category_label: 'Infant', quantity: toNumber(data.infant_quantity), unit_price: toNumber(data.infant_price) },
      ].filter((item) => item.quantity > 0);

      await api.post('/operations/reservations/', {
        client: data.client,
        product: data.product,
        schedule: data.schedule,
        customer_full_name: data.customer_full_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || '',
        hold_expires_at: new Date(data.hold_expires_at).toISOString(),
        notes: data.notes || '',
        internal_comments: data.internal_comments || '',
        participants,
      });

      navigate('/reservations');
    } catch (error) {
      console.error('Failed to create reservation:', error);
      setSubmitError('Unable to create this hold right now. Please check schedule availability and hold expiry.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Create Reservation Hold</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Hold inventory temporarily before confirmation so the office team can secure space while waiting for payment or final approval.
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
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Reservation Setup</p>
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
              </div>

              <div>
                <label className={labelClassName}>Lead Traveller Email</label>
                <input type="email" {...register('customer_email')} className={inputClassName} />
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
                        {product.name} ({product.category_display})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                {errors.product && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.product.message}</p>}
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
                <label className={labelClassName}>Hold Expires At</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="datetime-local" {...register('hold_expires_at')} className={`${inputClassName} pl-11`} />
                </div>
              </div>

              <div>
                <label className={labelClassName}>Currency</label>
                <div className="relative">
                  <select {...register('currency')} className={`${inputClassName} appearance-none pr-12`}>
                    {Array.from(new Set((selectedProduct?.prices || []).map((price) => price.currency))).map((priceCurrency) => (
                      <option key={priceCurrency} value={priceCurrency}>
                        {priceCurrency}
                      </option>
                    ))}
                    {selectedProduct?.prices?.length ? null : (
                      <>
                        <option value="KES">KES</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2964ff]">
                <ShieldAlert size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Held Inventory</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Participant Quantities</h2>
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
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Notes</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Client & Internal Context</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <label className={labelClassName}>Customer Notes</label>
                <textarea {...register('notes')} className="min-h-[120px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Internal Comments</label>
                <textarea {...register('internal_comments')} className="min-h-[120px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#cfe7c8] bg-[linear-gradient(180deg,#eff9ec_0%,#def2d7_100%)] text-[#234126] shadow-[0_18px_50px_-30px_rgba(86,135,72,0.35)]">
            <div className="border-b border-[#c8dfc0] px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b8f65]">Live Hold Summary</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#234126]">
                <Clock3 size={22} />
                Reservation Totals
              </h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-[1.4rem] border border-[#c5dcbf] bg-white/70 px-4 py-4 shadow-[0_10px_24px_-20px_rgba(86,135,72,0.35)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6b8f65]">Selected Product</p>
                <p className="mt-2 text-lg font-black text-[#234126]">{selectedProduct?.name || 'No product selected yet'}</p>
                <p className="mt-1 text-sm font-medium text-[#4f6a50]">{selectedProduct?.destination || 'Choose a sellable product'}</p>
              </div>

              <div className="rounded-[1.4rem] border border-[#c5dcbf] bg-white/70 px-4 py-4 shadow-[0_10px_24px_-20px_rgba(86,135,72,0.35)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6b8f65]">Selected Schedule</p>
                <p className="mt-2 text-sm font-black text-[#234126]">{selectedSchedule?.schedule_code || 'No schedule selected yet'}</p>
                <p className="mt-1 text-sm font-medium text-[#4f6a50]">{selectedSchedule?.start_at ? selectedSchedule.start_at.replace('T', ' ').slice(0, 16) : 'Choose a departure or access window'}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[#6b8f65]">
                  {availabilityLoading
                    ? 'Checking live availability...'
                    : availability
                      ? `${availability.remaining_capacity} live spaces left`
                      : selectedSchedule
                        ? `${selectedSchedule.remaining_capacity} / ${selectedSchedule.total_capacity} spaces left`
                        : 'Availability pending'}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Participants</span>
                  <span className="font-black text-[#234126]">{totalParticipants}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Hold Value</span>
                  <span className="font-black text-[#234126]">{formatMoney(currency, subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Can Hold Requested Qty</span>
                  <span className="font-black text-[#234126]">
                    {availability ? (availability.can_sell_requested_quantity ? 'YES' : 'NO') : 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff7e6] text-[#d97706]">
                <Clock3 size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Hold Behavior</p>
                <p className="mt-1 text-xs font-medium leading-6 text-slate-500">
                  Active reservations reduce schedule availability immediately. Expired or cancelled holds release the inventory automatically.
                </p>
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
            {isSubmitting ? 'Saving Reservation...' : 'Create Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
};
