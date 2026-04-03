import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, ChevronDown, Save, Users, X } from 'lucide-react';
import { api, formatMoney, toNumber } from '../../lib/api';

const amendSchema = z.object({
  schedule: z.string().uuid('Please select a schedule'),
  travel_date: z.string().min(1, 'Travel date is required'),
  number_of_days: z.number().min(1),
  adult_quantity: z.number().min(0),
  adult_price: z.number().min(0),
  child_quantity: z.number().min(0),
  child_price: z.number().min(0),
  infant_quantity: z.number().min(0),
  infant_price: z.number().min(0),
  extra_charges: z.number().min(0),
  discount: z.number().min(0),
  status: z.enum(['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'FAILED', 'AMENDED']),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
});

type AmendValues = z.infer<typeof amendSchema>;

interface ScheduleOption {
  id: string;
  product: string;
  schedule_code: string;
  start_at?: string;
  total_capacity: number;
  remaining_capacity: number;
}

interface BookingRecord {
  id: string;
  product?: string;
  product_name?: string;
  schedule?: string;
  status: AmendValues['status'];
  travel_date?: string;
  number_of_days: number;
  extra_charges: number | string;
  discount: number | string;
  notes?: string;
  internal_notes?: string;
  currency: string;
  participant_quantities?: Array<{
    category_code: string;
    quantity: number;
    unit_price: number | string;
  }>;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

export const BookingAmendForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = React.useState<BookingRecord | null>(null);
  const [schedules, setSchedules] = React.useState<ScheduleOption[]>([]);
  const [submitError, setSubmitError] = React.useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AmendValues>({
    resolver: zodResolver(amendSchema),
    defaultValues: {
      schedule: '',
      travel_date: new Date().toISOString().slice(0, 10),
      number_of_days: 1,
      adult_quantity: 0,
      adult_price: 0,
      child_quantity: 0,
      child_price: 0,
      infant_quantity: 0,
      infant_price: 0,
      extra_charges: 0,
      discount: 0,
      status: 'AMENDED',
      notes: '',
      internal_notes: '',
    },
  });

  React.useEffect(() => {
    if (!id) {
      return;
    }

    const fetchData = async () => {
      const bookingResponse = await api.get(`/operations/bookings/${id}/`);
      const bookingData = bookingResponse.data as BookingRecord;
      setBooking(bookingData);

      const schedulesResponse = await api.get('/operations/schedules/');
      const filteredSchedules = (schedulesResponse.data as ScheduleOption[]).filter(
        (schedule) => schedule.product === bookingData.product
      );
      setSchedules(filteredSchedules);

      const byCode = Object.fromEntries((bookingData.participant_quantities || []).map((line) => [line.category_code, line]));
      reset({
        schedule: bookingData.schedule || '',
        travel_date: bookingData.travel_date || new Date().toISOString().slice(0, 10),
        number_of_days: bookingData.number_of_days || 1,
        adult_quantity: Number(byCode.ADULT?.quantity || 0),
        adult_price: toNumber(byCode.ADULT?.unit_price),
        child_quantity: Number(byCode.CHILD?.quantity || 0),
        child_price: toNumber(byCode.CHILD?.unit_price),
        infant_quantity: Number(byCode.INFANT?.quantity || 0),
        infant_price: toNumber(byCode.INFANT?.unit_price),
        extra_charges: toNumber(bookingData.extra_charges),
        discount: toNumber(bookingData.discount),
        status: bookingData.status,
        notes: bookingData.notes || '',
        internal_notes: bookingData.internal_notes || '',
      });
    };

    fetchData().catch((error) => {
      console.error('Failed to load booking for amendment:', error);
      setSubmitError('Unable to load this booking right now.');
    });
  }, [id, reset]);

  const adultQuantity = watch('adult_quantity');
  const adultPrice = watch('adult_price');
  const childQuantity = watch('child_quantity');
  const childPrice = watch('child_price');
  const infantQuantity = watch('infant_quantity');
  const infantPrice = watch('infant_price');
  const extraCharges = watch('extra_charges');
  const discount = watch('discount');
  const selectedScheduleId = watch('schedule');
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);

  const subtotal =
    toNumber(adultQuantity) * toNumber(adultPrice) +
    toNumber(childQuantity) * toNumber(childPrice) +
    toNumber(infantQuantity) * toNumber(infantPrice) +
    toNumber(extraCharges);
  const totalCost = Math.max(subtotal - toNumber(discount), 0);

  const onSubmit = async (data: AmendValues) => {
    if (!id) {
      return;
    }

    setSubmitError('');
    try {
      await api.post(`/operations/bookings/${id}/amend/`, {
        schedule: data.schedule,
        travel_date: data.travel_date,
        number_of_days: data.number_of_days,
        extra_charges: data.extra_charges,
        discount: data.discount,
        status: data.status,
        notes: data.notes || '',
        internal_notes: data.internal_notes || '',
        participants: [
          { category_code: 'ADULT', category_label: 'Adult', quantity: data.adult_quantity, unit_price: data.adult_price },
          { category_code: 'CHILD', category_label: 'Child', quantity: data.child_quantity, unit_price: data.child_price },
          { category_code: 'INFANT', category_label: 'Infant', quantity: data.infant_quantity, unit_price: data.infant_price },
        ].filter((line) => line.quantity > 0),
      });
      navigate(`/bookings/${id}`);
    } catch (error) {
      console.error('Failed to amend booking:', error);
      setSubmitError('Unable to amend this booking right now. Please check the schedule capacity and participant quantities.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Amend Booking</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Update schedule assignment, participant quantities, and booking context through the inventory-safe amendment flow.
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
                <Calendar size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Amendment Setup</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{booking?.product_name || 'Booking'} Schedule & Status</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClassName}>Schedule</label>
                <div className="relative">
                  <select {...register('schedule')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="">-- Choose Schedule --</option>
                    {schedules.map((schedule) => (
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
                <label className={labelClassName}>Status</label>
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
                <label className={labelClassName}>Travel Date</label>
                <input type="date" {...register('travel_date')} className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName}>Number of Days</label>
                <input type="number" min="1" {...register('number_of_days', { valueAsNumber: true })} className={inputClassName} />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2964ff]">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Participant Update</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Quantities & Charges</h2>
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
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              <div>
                <label className={labelClassName}>Client Notes</label>
                <textarea {...register('notes')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
              <div>
                <label className={labelClassName}>Internal Notes</label>
                <textarea {...register('internal_notes')} className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#cfe7c8] bg-[linear-gradient(180deg,#eff9ec_0%,#def2d7_100%)] text-[#234126] shadow-[0_18px_50px_-30px_rgba(86,135,72,0.35)]">
            <div className="border-b border-[#c8dfc0] px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b8f65]">Amendment Summary</p>
              <h2 className="mt-2 text-2xl font-black text-[#234126]">Revised Totals</h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-[1.4rem] border border-[#c5dcbf] bg-white/70 px-4 py-4 shadow-[0_10px_24px_-20px_rgba(86,135,72,0.35)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6b8f65]">Selected Schedule</p>
                <p className="mt-2 text-lg font-black text-[#234126]">{selectedSchedule?.schedule_code || 'No schedule selected yet'}</p>
                <p className="mt-1 text-sm font-medium text-[#4f6a50]">{selectedSchedule ? `${selectedSchedule.remaining_capacity} spaces currently open` : 'Choose a schedule'}</p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Subtotal</span>
                  <span className="font-black text-[#234126]">{formatMoney(booking?.currency, subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5e7d5d]">Discount</span>
                  <span className="font-black text-[#234126]">{formatMoney(booking?.currency, discount)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#c8dfc0] pt-3 text-sm">
                  <span className="text-[#3c593d]">Total Cost</span>
                  <span className="text-xl font-black text-[#234126]">{formatMoney(booking?.currency, totalCost)}</span>
                </div>
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
            {isSubmitting ? 'Applying Amendment...' : 'Apply Amendment'}
          </button>
        </div>
      </form>
    </div>
  );
};
