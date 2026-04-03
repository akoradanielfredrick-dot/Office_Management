import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronDown, Save, X } from 'lucide-react';
import { api } from '../../lib/api';

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.enum(['SAFARI', 'EXCURSION', 'TRANSFER', 'PACKAGE', 'HOTEL_ADD_ON', 'ACTIVITY', 'OTHER']),
  description: z.string().optional(),
  destination: z.string().optional(),
  duration_text: z.string().optional(),
  pricing_mode: z.enum(['PER_PERSON', 'PER_GROUP', 'COLLECTIVE_FIXED']),
  default_currency: z.enum(['USD', 'EUR', 'GBP']),
  is_active: z.boolean(),
});

type ProductValues = z.infer<typeof productSchema>;

interface PriceValues {
  id?: string;
  participant_category?: string | null;
  currency: 'USD' | 'EUR' | 'GBP';
  amount: number;
  rate_name: string;
}

interface ProductResponse extends ProductValues {
  prices: Array<{
    id: string;
    participant_category?: string | null;
    currency: PriceValues['currency'];
    amount: string | number;
    rate_name: string;
  }>;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';
const standardCurrencies: PriceValues['currency'][] = ['USD', 'EUR', 'GBP'];

const buildStandardPrices = (
  incomingPrices?: ProductResponse['prices']
): PriceValues[] =>
  standardCurrencies.map((currency) => {
    const matchedPrice = incomingPrices?.find(
      (price) => !price.participant_category && price.currency === currency && price.rate_name === 'STANDARD'
    ) ?? incomingPrices?.find((price) => !price.participant_category && price.currency === currency);

    return {
      id: matchedPrice?.id,
      participant_category: matchedPrice?.participant_category || null,
      currency,
      amount: matchedPrice ? Number(matchedPrice.amount) : 0,
      rate_name: 'STANDARD',
    };
  });

export const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [submitError, setSubmitError] = React.useState('');
  const [prices, setPrices] = React.useState<PriceValues[]>(buildStandardPrices());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      category: 'SAFARI',
      description: '',
      destination: '',
      duration_text: '',
      pricing_mode: 'PER_PERSON',
      default_currency: 'USD',
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (!id) {
      return;
    }

    api.get(`/operations/products/${id}/`)
      .then((response) => {
        const product = response.data as ProductResponse;
        reset({
          name: product.name,
          slug: product.slug,
          category: product.category,
          description: product.description || '',
          destination: product.destination || '',
          duration_text: product.duration_text || '',
          pricing_mode: product.pricing_mode,
          default_currency: product.default_currency,
          is_active: product.is_active,
        });
        setPrices(
          buildStandardPrices(product.prices)
        );
      })
      .catch((error) => {
        console.error('Failed to load product:', error);
        setSubmitError('Unable to load this product right now.');
      });
  }, [id, reset]);

  const updatePrice = (index: number, field: keyof PriceValues, value: string | number) => {
    setPrices((current) =>
      current.map((price, currentIndex) =>
        currentIndex === index
          ? {
              ...price,
              [field]: field === 'amount' ? Number(value) : value,
            }
          : price
      )
    );
  };

  const onSubmit = async (data: ProductValues) => {
    setSubmitError('');

    const payload = {
      ...data,
      participant_categories: [
        { code: 'ADULT', label: 'Adult', uses_inventory: true, is_active: true, metadata: {} },
        { code: 'CHILD', label: 'Child', uses_inventory: true, is_active: true, metadata: {} },
        { code: 'INFANT', label: 'Infant', uses_inventory: true, is_active: true, metadata: {} },
      ],
      prices: prices.filter((price) => price.amount > 0).map(({ participant_category, currency, amount, rate_name }) => ({
        participant_category: participant_category || null,
        currency,
        amount,
        rate_name,
        is_active: true,
        metadata: {},
      })),
    };

    try {
      if (isEditMode && id) {
        await api.put(`/operations/products/${id}/`, payload);
      } else {
        await api.post('/operations/products/', payload);
      }

      navigate('/products');
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} product:`, error);
      setSubmitError(`Unable to ${isEditMode ? 'update' : 'save'} this product right now. Please check the pricing rows and required product details.`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Catalog Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{isEditMode ? 'Edit Product' : 'Create Product'}</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              {isEditMode
                ? 'Update product details and rate rows so future schedules and bookings stay aligned.'
                : 'Add a sellable product with structured rates so it can be used in schedules, reservations, and bookings.'}
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
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelClassName}>Product Name</label>
              <input {...register('name')} className={inputClassName} />
              {errors.name && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelClassName}>Slug</label>
              <input {...register('slug')} className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Category</label>
              <div className="relative">
                <select {...register('category')} className={`${inputClassName} appearance-none pr-12`}>
                  <option value="SAFARI">Safari</option>
                  <option value="EXCURSION">Excursion</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="PACKAGE">Tour</option>
                  <option value="HOTEL_ADD_ON">Hotel Add-on</option>
                  <option value="ACTIVITY">Activity</option>
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
            <div>
              <label className={labelClassName}>Pricing Mode</label>
              <div className="relative">
                <select {...register('pricing_mode')} className={`${inputClassName} appearance-none pr-12`}>
                  <option value="PER_PERSON">Per Person</option>
                  <option value="PER_GROUP">Per Group</option>
                  <option value="COLLECTIVE_FIXED">Collective / Fixed</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
            <div>
              <label className={labelClassName}>Destination</label>
              <input {...register('destination')} className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Duration</label>
              <input {...register('duration_text')} className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Default Currency</label>
              <div className="relative">
                <select {...register('default_currency')} className={`${inputClassName} appearance-none pr-12`}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
            <div>
              <label className={labelClassName}>Status</label>
              <div className="relative">
                <select
                  {...register('is_active', {
                    setValueAs: (value) => value === true || value === 'true',
                  })}
                  className={`${inputClassName} appearance-none pr-12`}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClassName}>Description</label>
              <textarea {...register('description')} className="min-h-[140px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Product Rates</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Three-Currency Rates</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Record the standard selling rate in the three operating currencies only: `USD`, `EUR`, and `GBP`.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {prices.map((price, index) => (
              <div key={price.currency} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className={labelClassName}>Currency</label>
                  <input value={price.currency} readOnly className={`${inputClassName} bg-slate-100 text-slate-500`} />
                </div>
                <div className="mt-4">
                  <label className={labelClassName}>Amount</label>
                  <input type="number" min="0" step="0.01" value={price.amount} onChange={(event) => updatePrice(index, 'amount', event.target.value)} className={inputClassName} />
                </div>
                <div className="mt-4">
                  <label className={labelClassName}>Rate Name</label>
                  <input value={price.rate_name} readOnly className={`${inputClassName} bg-slate-100 text-slate-500`} />
                </div>
              </div>
            ))}
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
          className="inline-flex items-center justify-center gap-3 rounded-[1.3rem] bg-primary-600 px-5 py-4 text-sm font-black text-white shadow-[0_16px_28px_-20px_rgba(70,111,42,0.85)] transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save size={18} />
          {isSubmitting ? (isEditMode ? 'Updating Product...' : 'Saving Product...') : (isEditMode ? 'Update Product' : 'Create Product')}
        </button>
      </form>
    </div>
  );
};
