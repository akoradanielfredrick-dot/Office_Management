import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronDown, Save, X } from 'lucide-react';
import { api } from '../../lib/api';

const packageSchema = z.object({
  product: z.string().min(1, 'Select a product'),
  name: z.string().min(2, 'Package name is required'),
  package_type: z.enum(['AIR_SAFARI', 'ROAD_SAFARI']),
  price_usd: z.number().min(0, 'USD price must be zero or more'),
  price_eur: z.number().min(0, 'EUR price must be zero or more'),
  price_gbp: z.number().min(0, 'GBP price must be zero or more'),
  itinerary: z.string().optional(),
});

type PackageValues = z.infer<typeof packageSchema>;

interface ProductPrice {
  currency: string;
  amount: string | number;
}

interface ProductRecord {
  id: string;
  name: string;
  category: string;
  category_display: string;
  description: string;
  destination: string;
  metadata?: Record<string, string>;
  prices: ProductPrice[];
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

const getPackageTypeFromProduct = (product?: ProductRecord): 'AIR_SAFARI' | 'ROAD_SAFARI' => {
  const safariType = product?.metadata?.safari_type;
  return safariType === 'AIR_SAFARI' ? 'AIR_SAFARI' : 'ROAD_SAFARI';
};

const getPriceAmount = (product: ProductRecord | undefined, currency: string) => {
  if (!product) {
    return 0;
  }

  const price = product.prices.find((item) => item.currency === currency);
  return Number(price?.amount || 0);
};

export const PackageForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [submitError, setSubmitError] = React.useState('');
  const [products, setProducts] = React.useState<ProductRecord[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PackageValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      product: '',
      name: '',
      package_type: 'ROAD_SAFARI',
      price_usd: 0,
      price_eur: 0,
      price_gbp: 0,
      itinerary: '',
    },
  });

  React.useEffect(() => {
    api.get('/operations/products/?category=SAFARI')
      .then((response) => {
        setProducts(response.data);
      })
      .catch((error) => {
        console.error('Failed to load products:', error);
        setProducts([]);
      });
  }, []);

  React.useEffect(() => {
    if (!id) {
      return;
    }

    api.get(`/operations/packages/${id}/`)
      .then((response) => {
        reset({
          product: response.data.product || '',
          name: response.data.name,
          package_type: response.data.package_type,
          price_usd: Number(response.data.price_usd || response.data.price || 0),
          price_eur: Number(response.data.price_eur || 0),
          price_gbp: Number(response.data.price_gbp || 0),
          itinerary: response.data.itinerary || '',
        });
      })
      .catch((error) => {
        console.error('Failed to load package:', error);
        setSubmitError('Unable to load this package right now.');
      });
  }, [id, reset]);

  const selectedProductId = watch('product');

  React.useEffect(() => {
    if (!selectedProductId) {
      return;
    }

    const selectedProduct = products.find((item) => item.id === selectedProductId);
    if (!selectedProduct) {
      return;
    }

    setValue('name', selectedProduct.name, { shouldValidate: true });
    setValue('package_type', getPackageTypeFromProduct(selectedProduct), { shouldValidate: true });
    setValue('price_usd', getPriceAmount(selectedProduct, 'USD'));
    setValue('price_eur', getPriceAmount(selectedProduct, 'EUR'));
    setValue('price_gbp', getPriceAmount(selectedProduct, 'GBP'));
    setValue('itinerary', selectedProduct.description || '', { shouldValidate: true });
  }, [products, selectedProductId, setValue]);

  const onSubmit = async (data: PackageValues) => {
    setSubmitError('');

    const payload = {
      ...data,
      price: data.price_usd,
    };

    try {
      if (isEditMode && id) {
        await api.put(`/operations/packages/${id}/`, payload);
      } else {
        await api.post('/operations/packages/', payload);
      }
      navigate('/packages');
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'save'} package:`, error);
      setSubmitError(`Unable to ${isEditMode ? 'update' : 'save'} this package right now.`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Legacy Catalog</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{isEditMode ? 'Edit Package' : 'Create Package'}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Pick one of the seeded safari products from your catalog sheet, then review the USD, EUR, and GBP rates before saving.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-50"
        >
          <X size={22} />
        </button>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClassName}>Product</label>
              <div className="relative">
                <select {...register('product')} className={`${inputClassName} appearance-none pr-12`}>
                  <option value="">Select a safari product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
              {errors.product && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.product.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className={labelClassName}>Package Name</label>
              <input {...register('name')} className={inputClassName} readOnly />
              {errors.name && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>Package Type</label>
              <div className="relative">
                <select {...register('package_type')} className={`${inputClassName} appearance-none pr-12`}>
                  <option value="ROAD_SAFARI">Road Safari</option>
                  <option value="AIR_SAFARI">Air Safari</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Price Sheet</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Prices are stored per currency so booking staff can choose `USD`, `EUR`, or `GBP` without rewriting rates.
              </p>
            </div>

            <div>
              <label className={labelClassName}>USD Price</label>
              <input type="number" min="0" step="0.01" {...register('price_usd', { valueAsNumber: true })} className={inputClassName} />
              {errors.price_usd && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.price_usd.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>EUR Price</label>
              <input type="number" min="0" step="0.01" {...register('price_eur', { valueAsNumber: true })} className={inputClassName} />
              {errors.price_eur && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.price_eur.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>GBP Price</label>
              <input type="number" min="0" step="0.01" {...register('price_gbp', { valueAsNumber: true })} className={inputClassName} />
              {errors.price_gbp && <p className="mt-2 text-xs font-semibold text-rose-500">{errors.price_gbp.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className={labelClassName}>Itinerary</label>
              <textarea
                {...register('itinerary')}
                className="min-h-[180px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
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
          className="inline-flex items-center justify-center gap-3 rounded-[1.3rem] bg-primary-600 px-5 py-4 text-sm font-black text-white shadow-[0_16px_28px_-20px_rgba(70,111,42,0.85)] transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save size={18} />
          {isSubmitting ? (isEditMode ? 'Updating Package...' : 'Saving Package...') : (isEditMode ? 'Update Package' : 'Create Package')}
        </button>
      </form>
    </div>
  );
};
