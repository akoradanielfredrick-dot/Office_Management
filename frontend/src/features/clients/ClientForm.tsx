import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Mail, MapPin, Phone, Save, UserRound, X } from 'lucide-react';
import { api } from '../../lib/api';

const clientSchema = z.object({
  full_name: z.string().min(3, 'Client name is required'),
  email: z.string().email('Enter a valid email address').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    },
  });

  const inputClassName =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
  const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

  const onSubmit = async (data: ClientFormValues) => {
    setSubmitError('');

    try {
      await api.post('/clients/', {
        ...data,
        email: data.email || null,
        phone: data.phone || '',
        address: data.address || '',
        notes: data.notes || '',
      });
      navigate('/clients');
    } catch (error) {
      console.error('Failed to save client:', error);
      setSubmitError('Unable to save this client right now. Please confirm the details and try again.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Client Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Add Client</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Create a client profile here so it is immediately available for bookings, payments, and finance records.
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

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 xl:grid-cols-[1.5fr_0.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <UserRound size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Client Entry</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Profile Details</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClassName}>Client Name</label>
              <div className="relative">
                <UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  {...register('full_name')}
                  className={`${inputClassName} pl-11`}
                  placeholder="e.g. Jane Wanjiku or Acacia Holdings"
                />
              </div>
              {errors.full_name && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" {...register('email')} className={`${inputClassName} pl-11`} placeholder="client@example.com" />
              </div>
              {errors.email && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" {...register('phone')} className={`${inputClassName} pl-11`} placeholder="+254..." />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClassName}>Address</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-4 text-slate-400" />
                <textarea
                  {...register('address')}
                  className="min-h-[110px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 pl-11 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="Postal address, office location, or billing address"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClassName}>Notes</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-4 text-slate-400" />
                <textarea
                  {...register('notes')}
                  className="min-h-[140px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 pl-11 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                  placeholder="Important context for booking, finance, or account handling"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-[#cfe7c8] bg-[linear-gradient(180deg,#eff9ec_0%,#def2d7_100%)] p-6 text-[#234126] shadow-[0_18px_50px_-30px_rgba(86,135,72,0.35)]">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6b8f65]">What Happens Next</p>
            <h2 className="mt-2 text-2xl font-black text-[#234126]">Ready for Operations</h2>
            <div className="mt-5 space-y-4 text-sm font-medium leading-6 text-[#4f6a50]">
              <p>Once saved, this client becomes selectable from the booking screen immediately.</p>
              <p>Payments and expenses linked to the client’s booking will continue to reflect through the backend API.</p>
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
            {isSubmitting ? 'Saving Client...' : 'Save Client'}
          </button>
        </div>
      </form>
    </div>
  );
};
