import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronDown, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';

const scheduleSchema = z.object({
  product: z.string().uuid('Please select a product'),
  title: z.string().optional(),
  schedule_type: z.enum(['FIXED_DATE', 'RECURRING', 'TIME_POINT', 'TIME_PERIOD']),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  timezone: z.string().min(2),
  recurrence_rule: z.string().optional(),
  notes: z.string().optional(),
  guide_assignment: z.string().optional(),
  vehicle_assignment: z.string().optional(),
  total_capacity: z.number().min(0),
  manual_blocked_count: z.number().min(0),
  status: z.enum(['AVAILABLE', 'SOLD_OUT', 'CANCELLED', 'PAUSED']),
});

type ScheduleValues = z.infer<typeof scheduleSchema>;

interface ProductCategory {
  id: string;
  code: string;
  label: string;
}

interface ProductRecord {
  id: string;
  name: string;
  category_display: string;
  participant_categories: ProductCategory[];
}

interface CategoryCapacityRow {
  participant_category_id: string;
  label: string;
  total_capacity: number;
  manual_blocked_count: number;
}

interface ScheduleResponse extends ScheduleValues {
  category_availability?: Array<{
    participant_category?: { id: string; label: string };
    total_capacity: number;
    manual_blocked_count: number;
  }>;
}

const inputClassName =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100';
const labelClassName = 'mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-slate-400';

const toDateTimeLocal = (value?: string | null) => (value ? value.slice(0, 16) : '');

export const ScheduleForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [categoryCapacities, setCategoryCapacities] = React.useState<CategoryCapacityRow[]>([]);
  const [submitError, setSubmitError] = React.useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      product: '',
      title: '',
      schedule_type: 'TIME_POINT',
      start_at: '',
      end_at: '',
      timezone: 'Africa/Nairobi',
      recurrence_rule: '',
      notes: '',
      guide_assignment: '',
      vehicle_assignment: '',
      total_capacity: 12,
      manual_blocked_count: 0,
      status: 'AVAILABLE',
    },
  });

  React.useEffect(() => {
    const fetchProducts = async () => {
      const response = await api.get('/operations/products/');
      setProducts(response.data);
    };

    fetchProducts().catch((error) => {
      console.error('Failed to load products:', error);
      setProducts([]);
    });
  }, []);

  React.useEffect(() => {
    if (!id) {
      return;
    }

    api.get(`/operations/schedules/${id}/`)
      .then((response) => {
        const schedule = response.data as ScheduleResponse;
        reset({
          product: schedule.product,
          title: schedule.title || '',
          schedule_type: schedule.schedule_type,
          start_at: toDateTimeLocal(schedule.start_at),
          end_at: toDateTimeLocal(schedule.end_at),
          timezone: schedule.timezone,
          recurrence_rule: schedule.recurrence_rule || '',
          notes: schedule.notes || '',
          guide_assignment: schedule.guide_assignment || '',
          vehicle_assignment: schedule.vehicle_assignment || '',
          total_capacity: Number(schedule.total_capacity || 0),
          manual_blocked_count: Number(schedule.manual_blocked_count || 0),
          status: schedule.status,
        });
        setCategoryCapacities(
          (schedule.category_availability || []).map((row) => ({
            participant_category_id: row.participant_category?.id || '',
            label: row.participant_category?.label || 'Category',
            total_capacity: Number(row.total_capacity || 0),
            manual_blocked_count: Number(row.manual_blocked_count || 0),
          }))
        );
      })
      .catch((error) => {
        console.error('Failed to load schedule:', error);
        setSubmitError('Unable to load this schedule right now.');
      });
  }, [id, reset]);

  const selectedProductId = watch('product');
  const totalCapacity = watch('total_capacity');
  const selectedProduct = products.find((product) => product.id === selectedProductId);

  React.useEffect(() => {
    if (!selectedProduct) {
      setCategoryCapacities([]);
      return;
    }

    if (categoryCapacities.length > 0) {
      return;
    }

    setCategoryCapacities(
      selectedProduct.participant_categories.map((category) => ({
        participant_category_id: category.id,
        label: category.label,
        total_capacity: Number(totalCapacity || 0),
        manual_blocked_count: 0,
      }))
    );
  }, [selectedProduct, totalCapacity, categoryCapacities.length]);

  const updateCategoryCapacity = (index: number, field: keyof CategoryCapacityRow, value: string | number) => {
    setCategoryCapacities((current) =>
      current.map((row, currentIndex) =>
        currentIndex === index
          ? {
              ...row,
              [field]: field === 'label' || field === 'participant_category_id' ? value : Number(value),
            }
          : row
      )
    );
  };

  const addCustomCapacityRow = () => {
    setCategoryCapacities((current) => [
      ...current,
      {
        participant_category_id: '',
        label: 'Custom',
        total_capacity: Number(totalCapacity || 0),
        manual_blocked_count: 0,
      },
    ]);
  };

  const removeCapacityRow = (index: number) => {
    setCategoryCapacities((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const onSubmit = async (data: ScheduleValues) => {
    setSubmitError('');

    const payload = {
      ...data,
      start_at: data.start_at ? new Date(data.start_at).toISOString() : null,
      end_at: data.end_at ? new Date(data.end_at).toISOString() : null,
      category_availability: categoryCapacities
        .filter((row) => row.participant_category_id)
        .map((row) => ({
          participant_category_id: row.participant_category_id,
          total_capacity: row.total_capacity,
          manual_blocked_count: row.manual_blocked_count,
        })),
    };

    try {
      if (isEditMode && id) {
        await api.put(`/operations/schedules/${id}/`, payload);
      } else {
        await api.post('/operations/schedules/', payload);
      }

      navigate('/schedules');
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} schedule:`, error);
      setSubmitError(`Unable to ${isEditMode ? 'update' : 'save'} this schedule right now. Please check the date/time fields and category capacities.`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{isEditMode ? 'Edit Schedule' : 'Create Schedule'}</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              {isEditMode
                ? 'Update a departure or operating window while keeping inventory configuration aligned.'
                : 'Add a departure or operating window for a product, with initial inventory and optional category-specific capacity.'}
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
              <label className={labelClassName}>Schedule Title</label>
              <input {...register('title')} className={inputClassName} placeholder="Optional departure label" />
            </div>

            <div>
              <label className={labelClassName}>Schedule Type</label>
              <div className="relative">
                <select {...register('schedule_type')} className={`${inputClassName} appearance-none pr-12`}>
                  <option value="FIXED_DATE">Fixed Date</option>
                  <option value="RECURRING">Recurring</option>
                  <option value="TIME_POINT">Time Point</option>
                  <option value="TIME_PERIOD">Time Period</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <div>
              <label className={labelClassName}>Timezone</label>
              <input {...register('timezone')} className={inputClassName} />
            </div>

            <div>
              <label className={labelClassName}>Start Date & Time</label>
              <input type="datetime-local" {...register('start_at')} className={inputClassName} />
            </div>

            <div>
              <label className={labelClassName}>End Date & Time</label>
              <input type="datetime-local" {...register('end_at')} className={inputClassName} />
            </div>

            <div>
              <label className={labelClassName}>Total Capacity</label>
              <input type="number" min="0" {...register('total_capacity', { valueAsNumber: true })} className={inputClassName} />
            </div>

            <div>
              <label className={labelClassName}>Manual Blocked Count</label>
              <input type="number" min="0" {...register('manual_blocked_count', { valueAsNumber: true })} className={inputClassName} />
            </div>

            <div>
              <label className={labelClassName}>Status</label>
              <div className="relative">
                <select {...register('status')} className={`${inputClassName} appearance-none pr-12`}>
                  <option value="AVAILABLE">Available</option>
                  <option value="SOLD_OUT">Sold Out</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <div>
              <label className={labelClassName}>Recurrence Rule</label>
              <input {...register('recurrence_rule')} className={inputClassName} placeholder="Optional RRULE or recurrence note" />
            </div>

            <div>
              <label className={labelClassName}>Guide Assignment</label>
              <input {...register('guide_assignment')} className={inputClassName} />
            </div>

            <div>
              <label className={labelClassName}>Vehicle Assignment</label>
              <input {...register('vehicle_assignment')} className={inputClassName} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClassName}>Notes</label>
              <textarea {...register('notes')} className="min-h-[120px] w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={labelClassName}>Category Inventory</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Participant Capacity Rows</h2>
            </div>
            <button type="button" onClick={addCustomCapacityRow} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Plus size={16} />
              Add Row
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {categoryCapacities.map((row, index) => (
              <div key={`${row.participant_category_id || 'custom'}-${index}`} className="grid gap-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                <div>
                  <label className={labelClassName}>Participant Category</label>
                  <select
                    value={row.participant_category_id}
                    onChange={(event) => {
                      const selectedCategory = selectedProduct?.participant_categories.find((category) => category.id === event.target.value);
                      updateCategoryCapacity(index, 'participant_category_id', event.target.value);
                      updateCategoryCapacity(index, 'label', selectedCategory?.label || 'Custom');
                    }}
                    className={inputClassName}
                  >
                    <option value="">-- Choose Category --</option>
                    {selectedProduct?.participant_categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Total Capacity</label>
                  <input type="number" min="0" value={row.total_capacity} onChange={(event) => updateCategoryCapacity(index, 'total_capacity', event.target.value)} className={inputClassName} />
                </div>
                <div>
                  <label className={labelClassName}>Blocked Count</label>
                  <input type="number" min="0" value={row.manual_blocked_count} onChange={(event) => updateCategoryCapacity(index, 'manual_blocked_count', event.target.value)} className={inputClassName} />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => removeCapacityRow(index)} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
                    <Trash2 size={18} />
                  </button>
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
          {isSubmitting ? (isEditMode ? 'Updating Schedule...' : 'Saving Schedule...') : (isEditMode ? 'Update Schedule' : 'Create Schedule')}
        </button>
      </form>
    </div>
  );
};
