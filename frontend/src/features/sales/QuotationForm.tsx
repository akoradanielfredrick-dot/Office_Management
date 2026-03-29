import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Trash,
  Save,
  X,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, toNumber } from '../../lib/api';

const quotationSchema = z.object({
  client: z.string().uuid('Please select a client'),
  destination_package: z.string().min(3, 'Destination/Package is required'),
  num_adults: z.number().min(1, 'At least 1 adult is required'),
  num_children: z.number().min(0),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  currency: z.string(),
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  notes: z.string(),
  internal_notes: z.string(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
  })).min(1, 'At least one line item is required'),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

export const QuotationForm: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = React.useState<Array<{ id: string; full_name: string; email?: string }>>([]);
  const [submitError, setSubmitError] = React.useState('');
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      client: '',
      destination_package: '',
      num_adults: 1,
      num_children: 0,
      start_date: '',
      end_date: '',
      currency: 'KES',
      subtotal: 0,
      discount: 0,
      notes: '',
      internal_notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  React.useEffect(() => {
    const fetchClients = async () => {
      const response = await api.get('/clients/');
      setClients(response.data);
    };

    fetchClients().catch((error) => {
      console.error('Failed to load clients:', error);
      setClients([]);
    });
  }, []);

  const onSubmit = async (data: QuotationFormValues) => {
    setSubmitError('');

    try {
      const response = await api.post('/sales/quotations/', {
        ...data,
        subtotal: toNumber(data.subtotal),
        discount: toNumber(data.discount),
        items: data.items.map((item) => ({
          description: item.description,
          quantity: toNumber(item.quantity),
          unit_price: toNumber(item.unit_price),
        })),
      });
      navigate(`/quotations/${response.data.id}`);
    } catch (error) {
      console.error('Failed to save quotation:', error);
      setSubmitError('Unable to save quotation right now. Please confirm the client and line items, then try again.');
    }
  };

  const lineItems = watch('items');
  const discount = watch('discount');

  React.useEffect(() => {
    const newSubtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    setValue('subtotal', newSubtotal);
  }, [lineItems, setValue]);

  const subtotal = watch('subtotal');
  const total = subtotal - discount;

  const inputClassName = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
  const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Sales Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Create Quotation</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Build a polished travel proposal with trip details, pricing, and notes prepared for your client and internal team.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <X size={18} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/20 transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={18} />
            {isSubmitting ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.7fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <MapPin size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Primary Information</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Trip Details</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClassName}>Client</label>
                <div className="relative">
                  <select {...register('client')} className={`${inputClassName} appearance-none pr-12`}>
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name}{client.email ? ` (${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                {errors.client && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.client.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className={labelClassName}>Destination / Package Name</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input {...register('destination_package')} className={`${inputClassName} pl-11`} placeholder="e.g. 5 Days Maasai Mara Safari" />
                </div>
                {errors.destination_package && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.destination_package.message}</p>}
              </div>

              <div>
                <label className={labelClassName}>Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="date" {...register('start_date')} className={`${inputClassName} pl-11`} />
                </div>
              </div>

              <div>
                <label className={labelClassName}>End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="date" {...register('end_date')} className={`${inputClassName} pl-11`} />
                </div>
              </div>

              <div>
                <label className={labelClassName}>Adults</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="number" {...register('num_adults', { valueAsNumber: true })} className={`${inputClassName} pl-11`} />
                </div>
              </div>

              <div>
                <label className={labelClassName}>Children</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="number" {...register('num_children', { valueAsNumber: true })} className={`${inputClassName} pl-11`} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Quotation Build</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Line Items</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
                className="inline-flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-100"
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid gap-4 md:grid-cols-[1.7fr_0.45fr_0.7fr_auto] md:items-end">
                    <div>
                      <label className={labelClassName}>Description</label>
                      <input
                        {...register(`items.${index}.description`)}
                        className={inputClassName}
                        placeholder="e.g. Accommodation at Mara Sopa Lodge"
                      />
                    </div>

                    <div>
                      <label className={labelClassName}>Qty</label>
                      <input
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className={labelClassName}>Unit Price</label>
                      <input
                        type="number"
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                        className={inputClassName}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {errors.items && <p className="text-sm font-semibold text-rose-500">At least one item is required.</p>}
              {submitError && <p className="text-sm font-semibold text-rose-500">{submitError}</p>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.8)]">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Commercial View</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-white">
                <DollarSign size={22} />
                Pricing Summary
              </h2>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-400">Currency</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white">
                  {watch('currency')}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-400">Subtotal</span>
                <span className="text-lg font-bold text-white">
                  {watch('currency')} {subtotal.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Discount ({watch('currency')})
                </label>
                <input
                  type="number"
                  {...register('discount', { valueAsNumber: true })}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right text-sm font-semibold text-white outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-700/20"
                />
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total Amount</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Client-facing quotation value</p>
                  </div>
                  <div className="text-right text-3xl font-black text-primary-400">
                    {watch('currency')} {total.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Internal Collaboration</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Internal Notes</h2>
            <textarea
              {...register('internal_notes')}
              rows={6}
              className="mt-5 w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              placeholder="Notes for the team only..."
            />
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-700">Client Communication</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Client Notes</h2>
            <textarea
              {...register('notes')}
              rows={6}
              className="mt-5 w-full rounded-[1.6rem] border border-amber-200 bg-white/70 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              placeholder="Payment terms, inclusions, and special requests..."
            />
          </section>
        </div>
      </div>
    </form>
  );
};
