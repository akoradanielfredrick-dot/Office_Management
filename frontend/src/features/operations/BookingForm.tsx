import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  MapPinned,
  Save,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { api, formatMoney, toNumber } from '../../lib/api';

const bookingSchema = z.object({
  client: z.string().uuid('Please select a client'),
  package: z.string().uuid('Please select a package').or(z.literal('')),
  excursion: z.string().uuid('Please select an excursion').optional().or(z.literal('')),
  travel_date: z.string().min(1, 'Travel date is required'),
  number_of_days: z.number().min(1, 'Number of days must be at least 1'),
  num_adults: z.number().min(0),
  price_per_adult: z.number().min(0),
  num_children: z.number().min(0),
  price_per_child: z.number().min(0),
  extra_charges: z.number().min(0),
  discount: z.number().min(0),
  itinerary: z.string().optional(),
  booking_validity: z.string().optional(),
  deposit_terms: z.string().optional(),
  payment_channels: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  currency: z.string().min(3),
  status: z.enum(['CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface ClientOption {
  id: string;
  full_name: string;
}

interface PackageOption {
  id: string;
  name: string;
  package_type_display?: string;
  price: string | number;
  itinerary?: string;
}

interface ExcursionOption {
  id: string;
  name: string;
  location: string;
  price: string | number;
  itinerary?: string;
}

export const BookingForm: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = React.useState<ClientOption[]>([]);
  const [packages, setPackages] = React.useState<PackageOption[]>([]);
  const [excursions, setExcursions] = React.useState<ExcursionOption[]>([]);
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
      package: '',
      excursion: '',
      travel_date: new Date().toISOString().split('T')[0],
      number_of_days: 1,
      num_adults: 2,
      price_per_adult: 0,
      num_children: 0,
      price_per_child: 0,
      extra_charges: 0,
      discount: 0,
      itinerary: '',
      booking_validity: '',
      deposit_terms: '',
      payment_channels: '',
      notes: '',
      internal_notes: '',
      currency: 'KES',
      status: 'CONFIRMED',
    },
  });

  React.useEffect(() => {
    const fetchLookups = async () => {
      const [clientsResponse, packagesResponse, excursionsResponse] = await Promise.all([
        api.get('/clients/'),
        api.get('/operations/packages/'),
        api.get('/operations/excursions/'),
      ]);
      setClients(clientsResponse.data);
      setPackages(packagesResponse.data);
      setExcursions(excursionsResponse.data);
    };

    fetchLookups().catch((error) => {
      console.error('Failed to load booking lookups:', error);
      setClients([]);
      setPackages([]);
      setExcursions([]);
    });
  }, []);

  const selectedPackageId = watch('package');
  const selectedExcursionId = watch('excursion');
  const selectedPackage = packages.find((item) => item.id === selectedPackageId);
  const selectedExcursion = excursions.find((item) => item.id === selectedExcursionId);
  const numAdults = watch('num_adults');
  const pricePerAdult = watch('price_per_adult');
  const numChildren = watch('num_children');
  const pricePerChild = watch('price_per_child');
  const extraCharges = watch('extra_charges');
  const discount = watch('discount');
  const currency = watch('currency');

  React.useEffect(() => {
    if (!selectedPackage) {
      return;
    }

    setValue('price_per_adult', toNumber(selectedPackage.price));
    setValue('itinerary', selectedPackage.itinerary || '');
  }, [selectedPackage, setValue]);

  React.useEffect(() => {
    if (!selectedExcursion) {
      return;
    }

    setValue('extra_charges', toNumber(selectedExcursion.price));

    const currentItinerary = watch('itinerary');
    const excursionSummary = `${selectedExcursion.name} - ${selectedExcursion.location}`;
    const excursionItinerary = selectedExcursion.itinerary?.trim();

    if (!currentItinerary?.trim()) {
      setValue('itinerary', excursionItinerary || excursionSummary);
      return;
    }

    if (!currentItinerary.includes(excursionSummary)) {
      setValue(
        'itinerary',
        `${currentItinerary.trim()}\n\nExcursion: ${excursionSummary}${excursionItinerary ? `\n${excursionItinerary}` : ''}`
      );
    }
  }, [selectedExcursion, setValue, watch]);

  const subtotal =
    toNumber(numAdults) * toNumber(pricePerAdult) +
    toNumber(numChildren) * toNumber(pricePerChild) +
    toNumber(extraCharges);
  const totalCost = Math.max(subtotal - toNumber(discount), 0);

  const inputClassName =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
  const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

  const onSubmit = async (data: BookingFormValues) => {
    setSubmitError('');

    try {
      const response = await api.post('/operations/bookings/', {
        client: data.client,
        package: data.package || null,
        travel_date: data.travel_date,
        number_of_days: toNumber(data.number_of_days),
        num_adults: toNumber(data.num_adults),
        price_per_adult: toNumber(data.price_per_adult),
        num_children: toNumber(data.num_children),
        price_per_child: toNumber(data.price_per_child),
        extra_charges: toNumber(data.extra_charges),
        discount: toNumber(data.discount),
        itinerary: data.itinerary || '',
        booking_validity: data.booking_validity || '',
        deposit_terms: data.deposit_terms || '',
        payment_channels: data.payment_channels || '',
        notes: data.notes || '',
        internal_notes: data.internal_notes || '',
        currency: data.currency,
        status: data.status,
        subtotal,
        total_cost: totalCost,
      });

      navigate(`/bookings/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create booking:', error);
      setSubmitError('Unable to create the booking right now. Please confirm the client, package, and pricing details.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Create Booking</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Create bookings from the frontend, attach the client and package, and have the record saved directly into the backend operations workflow.
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
                <h2 className="mt-1 text-2xl font-black text-slate-900">Client & Excursion</h2>
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
                <label className={labelClassName}>Package</label>
                <div className="relative">
                  <select {...register('package')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="">-- Choose Package --</option>
                    {packages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.package_type_display ? `(${item.package_type_display})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClassName}>Excursion</label>
                <div className="relative">
                  <select {...register('excursion')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="">-- Choose Excursion --</option>
                    {excursions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.location})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Excursions work like an add-on to the booking and can feed into pricing and itinerary details.
                </p>
              </div>

              <div>
                <label className={labelClassName}>Travel Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" {...register('travel_date')} className={`${inputClassName} pl-11`} />
                </div>
                {errors.travel_date && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.travel_date.message}</p>}
              </div>

              <div>
                <label className={labelClassName}>Number of Days</label>
                <input type="number" min="1" {...register('number_of_days', { valueAsNumber: true })} className={inputClassName} />
                {errors.number_of_days && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.number_of_days.message}</p>}
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
                <h2 className="mt-1 text-2xl font-black text-slate-900">Travellers & Charges</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClassName}>Adults</label>
                <input type="number" min="0" {...register('num_adults', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Price Per Adult</label>
                <input type="number" min="0" step="0.01" {...register('price_per_adult', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Children</label>
                <input type="number" min="0" {...register('num_children', { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Price Per Child</label>
                <input type="number" min="0" step="0.01" {...register('price_per_child', { valueAsNumber: true })} className={inputClassName} />
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
                    <option value="KES">KES - Kenya Shilling</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - Pound Sterling</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>
              <div>
                <label className={labelClassName}>Status</label>
                <div className="relative">
                  <select {...register('status')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
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
                <h2 className="mt-1 text-2xl font-black text-slate-900">Itinerary & Terms</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <label className={labelClassName}>Itinerary</label>
                <textarea
                  {...register('itinerary')}
                  className="min-h-[150px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="Safari itinerary, areas to cover, or client-specific trip details"
                />
              </div>
              <div>
                <label className={labelClassName}>Booking Validity</label>
                <textarea
                  {...register('booking_validity')}
                  className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="e.g. Valid for 7 days from issue date"
                />
              </div>
              <div>
                <label className={labelClassName}>Deposit Terms</label>
                <textarea
                  {...register('deposit_terms')}
                  className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="Deposit percentage, timing, and balance expectations"
                />
              </div>
              <div>
                <label className={labelClassName}>Payment Channels</label>
                <textarea
                  {...register('payment_channels')}
                  className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="Accepted payment methods and collection instructions"
                />
              </div>
              <div>
                <label className={labelClassName}>Client Notes</label>
                <textarea
                  {...register('notes')}
                  className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="Visible booking notes"
                />
              </div>
              <div>
                <label className={labelClassName}>Internal Notes</label>
                <textarea
                  {...register('internal_notes')}
                  className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="Internal handling notes for the office team"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#cfe7c8] bg-[linear-gradient(180deg,#eff9ec_0%,#def2d7_100%)] text-[#234126] shadow-[0_18px_50px_-30px_rgba(86,135,72,0.35)]">
            <div className="border-b border-[#c8dfc0] px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b8f65]">Live Summary</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#234126]">
                <CreditCard size={22} />
                Booking Totals
              </h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-[1.4rem] border border-[#c5dcbf] bg-white/70 px-4 py-4 shadow-[0_10px_24px_-20px_rgba(86,135,72,0.35)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6b8f65]">Selected Package</p>
                <p className="mt-2 text-lg font-black text-[#234126]">{selectedPackage?.name || 'No package selected yet'}</p>
                <p className="mt-1 text-sm font-medium text-[#4f6a50]">
                  {selectedPackage?.package_type_display || 'Package type will appear here'}
                  {selectedExcursion ? ` | Excursion: ${selectedExcursion.name}` : ''}
                </p>
              </div>

              <div className="grid gap-3">
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
                <p className="text-sm font-black text-slate-900">Backend Reflection</p>
                <p className="mt-1 text-xs font-medium leading-6 text-slate-500">
                  Once saved, this booking will appear in the operations backend and become available for payment and expense recording immediately.
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
            {isSubmitting ? 'Saving Booking...' : 'Create Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};
