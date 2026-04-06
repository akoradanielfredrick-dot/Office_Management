import React from 'react';
import { Activity, AlertCircle, CheckCircle2, ChevronDown, Circle, Clock3, ExternalLink, Info, RefreshCcw, Sparkles } from 'lucide-react';
import { api, backendAdminUrl } from '../../lib/api';
import type { PaginatedResponse } from './listTypes';

interface ExternalProductMappingRecord { id: string; provider?: string; product_name?: string; external_product_id?: string; }
interface InboundBookingPayloadRecord { id: string; external_booking_reference?: string; booking_reference?: string; product_name?: string; processing_status?: string; received_at?: string; }
interface ApiIdempotencyRecord { id: string; processing_status?: string; hit_count?: number; }
interface GetYourGuideProductSummary { product_id: string; internal_product_id: string; name?: string; destination?: string; category?: string; default_currency?: string; has_default_mapping?: boolean; available_schedule_count?: number; }
interface GetYourGuideRate { rate_id?: string; category_code?: string; category_label?: string; currency?: string; amount?: string | number; }
interface GetYourGuideOption { option_id?: string; title?: string; rates?: GetYourGuideRate[]; }
interface GetYourGuideSchedule { schedule_id?: string; schedule_code?: string; start_at?: string | null; status?: string; }
interface GetYourGuideProductDetail { product_id?: string; name?: string; description?: string; destination?: string; default_currency?: string; options?: GetYourGuideOption[]; schedules?: GetYourGuideSchedule[]; }
interface GetYourGuideProductListResponse { results?: GetYourGuideProductSummary[]; }
interface GetYourGuideIngestResponse { status?: string; booking_reference?: string | null; payload_id?: string; payload_status?: string; message?: string; }
type GetYourGuideSandboxEndpoint = 'notify-availability-update' | 'notify-availability-update-with-price' | 'deals' | 'suppliers';
interface GetYourGuideSandboxResponse { method?: string; request_url?: string; status_code?: number; response_body?: unknown; response_text?: string; }

const sandboxEndpointTemplates: Record<GetYourGuideSandboxEndpoint, { method: 'GET' | 'POST' | 'DELETE'; payload: string }> = {
  'notify-availability-update': { method: 'POST', payload: JSON.stringify({ productId: 'gyg-product-100', availability: [{ optionId: 'gyg-option-1', date: '2026-04-10', available: true, vacancies: 8 }] }, null, 2) },
  'notify-availability-update-with-price': { method: 'POST', payload: JSON.stringify({ productId: 'gyg-product-100', availability: [{ optionId: 'gyg-option-1', date: '2026-04-10', available: true, vacancies: 8, prices: [{ categoryCode: 'ADULT', amount: 5000, currency: 'KES' }] }] }, null, 2) },
  deals: { method: 'POST', payload: JSON.stringify({ dealId: 'MRANGA-DEAL-001', productId: 'gyg-product-100', title: 'Test Promotion', discountPercentage: 10 }, null, 2) },
  suppliers: { method: 'POST', payload: JSON.stringify({ supplierId: 'mranga-supplier-001', name: 'Mranga Tours and Safaris Limited', email: 'supplier-api@getyourguide.com' }, null, 2) },
};

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const safeText = (value: unknown, fallback = 'Not available') => (typeof value === 'string' && value.trim() ? value : fallback);
const safeNumber = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const safeDateTime = (value: unknown, fallback = '') => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleString();
};
const prettifySlug = (value: string) => value.replace(/-/g, ' ');
const getStatusTone = (status: unknown) => status === 'COMPLETED' || status === 'PROCESSED'
  ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  : status === 'FAILED'
    ? 'bg-rose-100 text-rose-700 ring-rose-200'
    : 'bg-slate-100 text-slate-700 ring-slate-200';

export const IntegrationOpsDashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [productsLoading, setProductsLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [bootstrapProductId, setBootstrapProductId] = React.useState<string | null>(null);
  const [mappings, setMappings] = React.useState<ExternalProductMappingRecord[]>([]);
  const [payloads, setPayloads] = React.useState<InboundBookingPayloadRecord[]>([]);
  const [keys, setKeys] = React.useState<ApiIdempotencyRecord[]>([]);
  const [products, setProducts] = React.useState<GetYourGuideProductSummary[]>([]);
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [selectedProductDetail, setSelectedProductDetail] = React.useState<GetYourGuideProductDetail | null>(null);
  const [pageError, setPageError] = React.useState('');
  const [pageMessage, setPageMessage] = React.useState('');
  const [ingestLoading, setIngestLoading] = React.useState(false);
  const [ingestResult, setIngestResult] = React.useState<GetYourGuideIngestResponse | null>(null);
  const [bookingReference, setBookingReference] = React.useState('');
  const [selectedScheduleId, setSelectedScheduleId] = React.useState('');
  const [selectedOptionId, setSelectedOptionId] = React.useState('');
  const [selectedRateId, setSelectedRateId] = React.useState('');
  const [selectedSandboxEndpoint, setSelectedSandboxEndpoint] = React.useState<GetYourGuideSandboxEndpoint>('notify-availability-update');
  const [sandboxLoading, setSandboxLoading] = React.useState(false);
  const [sandboxPayloadText, setSandboxPayloadText] = React.useState(sandboxEndpointTemplates['notify-availability-update'].payload);
  const [sandboxMethod, setSandboxMethod] = React.useState<'GET' | 'POST' | 'DELETE'>(sandboxEndpointTemplates['notify-availability-update'].method);
  const [sandboxResult, setSandboxResult] = React.useState<GetYourGuideSandboxResponse | null>(null);
  const [timeAvailabilityMode, setTimeAvailabilityMode] = React.useState<'time-period' | 'time-point'>('time-point');
  const [priceSetupMode, setPriceSetupMode] = React.useState<'per-individual' | 'per-group'>('per-individual');
  const [automationMode, setAutomationMode] = React.useState<'availability-price' | 'availability-only'>('availability-only');
  const [productTimezone, setProductTimezone] = React.useState('Africa/Nairobi');
  const [availableFrom, setAvailableFrom] = React.useState('');
  const [availableTo, setAvailableTo] = React.useState('');
  const [unavailableFrom, setUnavailableFrom] = React.useState('');
  const [unavailableTo, setUnavailableTo] = React.useState('');
  const [testingHistoryOpen, setTestingHistoryOpen] = React.useState(false);
  const [testStartedAt, setTestStartedAt] = React.useState('');
  const [testCompletedAt, setTestCompletedAt] = React.useState('');

  const loadDashboardData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [mappingResponse, payloadResponse, keyResponse] = await Promise.all([
        api.get<PaginatedResponse<ExternalProductMappingRecord>>('/operations/product-mappings/', { params: { page: 1, page_size: 5 } }),
        api.get<PaginatedResponse<InboundBookingPayloadRecord>>('/operations/inbound-booking-payloads/', { params: { page: 1, page_size: 5 } }),
        api.get<PaginatedResponse<ApiIdempotencyRecord>>('/operations/idempotency-keys/', { params: { page: 1, page_size: 5 } }),
      ]);
      setMappings(asArray(mappingResponse.data?.results));
      setPayloads(asArray(payloadResponse.data?.results));
      setKeys(asArray(keyResponse.data?.results));
    } catch (error) {
      console.error(error);
      setPageError('Integration activity could not be loaded from the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = React.useCallback(async () => {
    setProductsLoading(true);
    try {
      const response = await api.get<GetYourGuideProductListResponse>('/operations/integrations/get-your-guide/products/');
      const nextProducts = asArray<GetYourGuideProductSummary>(response.data?.results);
      setProducts(nextProducts);
      setSelectedProductId((current) => (current && nextProducts.some((p) => p.product_id === current) ? current : nextProducts[0]?.product_id ?? ''));
    } catch (error) {
      console.error(error);
      setPageError('GetYourGuide product feed could not be loaded.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadProductDetail = React.useCallback(async (productId: string) => {
    if (!productId) return setSelectedProductDetail(null);
    setDetailLoading(true);
    try {
      const response = await api.get<GetYourGuideProductDetail>(`/operations/integrations/get-your-guide/products/${productId}/`);
      setSelectedProductDetail(response.data ?? null);
    } catch (error) {
      console.error(error);
      setSelectedProductDetail(null);
      setPageError('The selected product detail could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  React.useEffect(() => { setPageError(''); setPageMessage(''); void Promise.all([loadDashboardData(), loadProducts()]); }, [loadDashboardData, loadProducts, refreshNonce]);
  React.useEffect(() => { void loadProductDetail(selectedProductId); }, [loadProductDetail, selectedProductId]);
  React.useEffect(() => { if (!bookingReference) setBookingReference(`GYG-TEST-${Date.now().toString().slice(-8)}`); }, [bookingReference]);
  React.useEffect(() => { const template = sandboxEndpointTemplates[selectedSandboxEndpoint]; setSandboxMethod(template.method); setSandboxPayloadText(template.payload); setSandboxResult(null); }, [selectedSandboxEndpoint]);

  const productOptions = asArray<GetYourGuideOption>(selectedProductDetail?.options);
  const productSchedules = asArray<GetYourGuideSchedule>(selectedProductDetail?.schedules);
  const selectedOption = productOptions.find((option) => option.option_id === selectedOptionId) ?? productOptions[0] ?? null;
  const selectedRates = asArray<GetYourGuideRate>(selectedOption?.rates);
  const selectedRate = selectedRates.find((rate) => rate.rate_id === selectedRateId) ?? selectedRates[0] ?? null;
  const selectedSchedule = productSchedules.find((schedule) => schedule.schedule_id === selectedScheduleId) ?? productSchedules[0] ?? null;

  React.useEffect(() => setSelectedScheduleId((current) => (current && productSchedules.some((s) => s.schedule_id === current) ? current : productSchedules[0]?.schedule_id ?? '')), [productSchedules]);
  React.useEffect(() => setSelectedOptionId((current) => (current && productOptions.some((o) => o.option_id === current) ? current : productOptions[0]?.option_id ?? '')), [productOptions]);
  React.useEffect(() => setSelectedRateId((current) => (current && selectedRates.some((r) => r.rate_id === current) ? current : selectedRates[0]?.rate_id ?? '')), [selectedRates]);

  const handleBootstrap = async (product: GetYourGuideProductSummary) => {
    setBootstrapProductId(product.internal_product_id);
    setPageError('');
    setPageMessage('');
    try {
      await api.post('/operations/integrations/get-your-guide/mappings/bootstrap/', { product_id: product.internal_product_id, external_product_id: product.product_id });
      setPageMessage(`Mappings bootstrapped for ${safeText(product.name, 'selected product')}.`);
      setRefreshNonce((value) => value + 1);
    } catch (error) {
      console.error(error);
      setPageError('Could not bootstrap mappings for the selected product.');
    } finally {
      setBootstrapProductId(null);
    }
  };

  const handleTestIngest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProductDetail?.product_id || !selectedOption?.option_id || !selectedRate?.rate_id || !selectedSchedule?.schedule_id) {
      setPageError('Select a product with a valid schedule, option, and rate before testing.');
      return;
    }
    setIngestLoading(true);
    setIngestResult(null);
    setPageError('');
    setPageMessage('');
    setTestStartedAt(new Date().toISOString());
    setTestCompletedAt('');
    try {
      const response = await api.post<GetYourGuideIngestResponse>('/operations/integrations/get-your-guide/bookings/ingest/', {
        event_type: 'BOOKING_CREATE',
        booking_reference: bookingReference,
        product_id: selectedProductDetail.product_id,
        option_id: selectedOption.option_id,
        rate_id: selectedRate.rate_id,
        schedule_id: selectedSchedule.schedule_id,
        travel_date: typeof selectedSchedule.start_at === 'string' && selectedSchedule.start_at ? new Date(selectedSchedule.start_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        customer: { full_name: 'Test Traveller', email: 'test.traveller@example.com', phone: '+254700000111' },
        participants: [{ category_code: selectedRate.category_code, category_label: selectedRate.category_label, quantity: 2, unit_price: selectedRate.amount }],
      });
      setIngestResult(response.data ?? null);
      setTestCompletedAt(new Date().toISOString());
      setPageMessage(`Integration test sent. Backend response: ${safeText(response.data?.status, 'processed')}.`);
      setRefreshNonce((value) => value + 1);
    } catch (error) {
      console.error(error);
      setPageError('The GetYourGuide booking test could not be processed.');
    } finally {
      setIngestLoading(false);
    }
  };

  const handleSandboxRun = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSandboxLoading(true);
    setSandboxResult(null);
    setPageError('');
    setPageMessage('');
    try {
      const response = await api.post<GetYourGuideSandboxResponse>('/operations/integrations/get-your-guide/sandbox/run/', {
        endpoint: selectedSandboxEndpoint,
        method: sandboxMethod,
        payload: sandboxPayloadText.trim() ? JSON.parse(sandboxPayloadText) : {},
      });
      setSandboxResult(response.data ?? null);
      setPageMessage(`Sandbox request completed with status ${safeNumber(response.data?.status_code)}.`);
    } catch (error) {
      console.error(error);
      setPageError('The GetYourGuide sandbox request could not be completed. Check your JSON payload and credentials.');
    } finally {
      setSandboxLoading(false);
    }
  };

  const selectedProductSummary = products.find((product) => product.product_id === selectedProductId) ?? null;
  const allProductsNeedMapping = products.length > 0 && products.every((product) => !product.has_default_mapping);
  const certificationRows = [
    { key: 'time-point-individuals', label: 'Time point for Individuals', active: timeAvailabilityMode === 'time-point' && priceSetupMode === 'per-individual' },
    { key: 'time-point-groups', label: 'Time point for Groups', active: timeAvailabilityMode === 'time-point' && priceSetupMode === 'per-group' },
    { key: 'time-period-individuals', label: 'Time period for Individuals', active: timeAvailabilityMode === 'time-period' && priceSetupMode === 'per-individual' },
    { key: 'time-period-groups', label: 'Time period for Groups', active: timeAvailabilityMode === 'time-period' && priceSetupMode === 'per-group' },
  ];
  const workflowSteps = [
    { label: 'Set up your testing configuration', state: 'complete' },
    { label: 'Test your integration', state: 'active' },
    { label: 'Set up your production configuration', state: 'upcoming' },
    { label: 'Test your integration on production', state: 'upcoming' },
    { label: 'Test GetYourGuide endpoints', state: sandboxResult ? 'warning' : 'upcoming' },
    { label: 'Test additional features', state: 'upcoming' },
    { label: 'Live testing', state: 'upcoming' },
  ] as const;
  const timezoneOptions = ['Africa/Nairobi', 'UTC', 'Europe/Berlin', 'Europe/London', 'America/New_York', 'Asia/Dubai'];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/80 px-6 py-7 lg:border-b-0 lg:border-r">
          <p className="text-sm font-black tracking-tight text-slate-800">Mranga Tours and Safaris Limited</p>
          <nav className="mt-8 space-y-2">
            {workflowSteps.map((step) => (
              <button key={step.label} type="button" className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${step.state === 'active' ? 'border-l-4 border-[#1d6fe8] bg-white shadow-sm' : 'text-slate-500'}`}>
                <span className="flex-1 text-sm font-semibold">{step.label}</span>
                {step.state === 'complete' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : step.state === 'warning' ? <AlertCircle className="h-4 w-4 text-amber-500" /> : step.state === 'active' ? <Circle className="h-4 w-4 fill-[#1d6fe8] text-[#1d6fe8]" /> : <Circle className="h-4 w-4 text-slate-300" />}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-black tracking-tight text-slate-900">Self-testing tool</h1>
              <p className="mt-5 text-[15px] leading-8 text-slate-700">Use this self-testing tool to make sure your system correctly implements our supplier API. Once your tests are successful, you&apos;ll get credentials to integrate and move to production.</p>
              <p className="mt-6 text-[15px] leading-8 text-slate-700">We&apos;ll use the testing configuration details you entered earlier for this workspace. You can edit these values at any time.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setRefreshNonce((value) => value + 1)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"><RefreshCcw size={16} />Refresh</button>
              <a href={`${backendAdminUrl}operations/externalproductmapping/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#1d6fe8] px-4 py-2.5 text-sm font-bold text-white"><ExternalLink size={16} />Manage mappings</a>
            </div>
          </div>

          {pageMessage ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{pageMessage}</div> : null}
          {pageError ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{pageError}</div> : null}
          {allProductsNeedMapping ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">All products currently require integration setup before certification tests can run successfully.</div> : null}

          <section className="mt-8 rounded-sm bg-slate-50 px-5 py-5 ring-1 ring-slate-200">
            <div className="flex items-start gap-3">
              <Info className="mt-1 h-5 w-5 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">Test run status</p>
                <p className="mt-2 text-[15px] leading-7 text-slate-700">These are the availability and pricing combinations you need to test. When all are completed, you can move on to the production configuration step.</p>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead><tr className="bg-white"><th className="border border-slate-300 px-4 py-3 font-black text-slate-900">Product/Availability Type</th><th className="border border-slate-300 px-4 py-3 font-black text-slate-900">Status</th><th className="border border-slate-300 px-4 py-3 font-black text-slate-900">Started at</th><th className="border border-slate-300 px-4 py-3 font-black text-slate-900">Completed at</th></tr></thead>
                    <tbody>{certificationRows.map((row) => <tr key={row.key} className={row.active ? 'bg-[#f8fbff]' : 'bg-white'}><td className="border border-slate-300 px-4 py-3 font-semibold text-slate-900">{row.label}</td><td className="border border-slate-300 px-4 py-3">{row.active ? <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${ingestResult ? 'bg-emerald-100 text-emerald-700' : ingestLoading ? 'bg-sky-100 text-sky-700' : selectedProductId ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{ingestResult ? 'Completed' : ingestLoading ? 'Running' : selectedProductId ? 'Ready' : 'Not started'}</span> : null}</td><td className="border border-slate-300 px-4 py-3 text-slate-600">{row.active ? safeDateTime(testStartedAt) : ''}</td><td className="border border-slate-300 px-4 py-3 text-slate-600">{row.active ? safeDateTime(testCompletedAt) : ''}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-7 text-[15px] leading-8 text-slate-700">If you have any questions regarding this tool or any endpoint, please consult the documentation or feel free to contact us via <a href="mailto:supplier-api@getyourguide.com" className="font-semibold text-slate-900 underline underline-offset-4">supplier-api@getyourguide.com</a>.</div>

          <section className="mt-7 overflow-hidden rounded-sm bg-slate-50 ring-1 ring-slate-200">
            <button type="button" onClick={() => setTestingHistoryOpen((value) => !value)} className="flex w-full items-center justify-between px-5 py-5 text-left"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-slate-500" /><p className="text-sm font-black text-slate-900">Testing history (New!)</p></div><ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${testingHistoryOpen ? 'rotate-180' : ''}`} /></button>
            {testingHistoryOpen ? <div className="border-t border-slate-200 bg-white px-5 py-5">{payloads.length ? payloads.map((payload) => <div key={payload.id} className="mb-3 rounded-2xl border border-slate-200 px-4 py-4 last:mb-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-900">{safeText(payload.product_name || payload.booking_reference, 'Unmatched payload')}</p><p className="mt-1 text-xs font-medium text-slate-500">{safeText(payload.external_booking_reference, 'No external reference')}</p></div><span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ring-1 ${getStatusTone(payload.processing_status)}`}>{safeText(payload.processing_status, 'UNKNOWN')}</span></div></div>) : <p className="text-sm font-medium text-slate-500">No testing events have been captured yet.</p>}</div> : null}
          </section>

          <section className="mt-7">
            <h2 className="text-4xl font-black tracking-tight text-slate-900">Setup your product details</h2>
            <p className="mt-4 max-w-4xl text-[15px] leading-7 text-slate-700">Enter the product ID from your system and choose if the product is available during operation hours or only at fixed times. Then choose how you set up the price.</p>
            <form onSubmit={handleTestIngest} className="mt-5 max-w-3xl space-y-8">
              <div className="border-t-4 border-[#1d6fe8] bg-sky-50 px-4 py-4 text-[15px] leading-7 text-slate-700">You&apos;ll need to run separate tests if your product is bookable for both individuals and groups and if it&apos;s available at fixed starting times and during opening hours.</div>
              <div className="space-y-3"><label htmlFor="valid-product-id" className="block text-[15px] font-black text-slate-900">Valid product ID</label><input id="valid-product-id" list="integration-product-options" value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} placeholder={products[0]?.product_id || 'gyg-product-100'} className="w-full max-w-[360px] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1d6fe8]" /><datalist id="integration-product-options">{products.map((product) => <option key={product.product_id} value={product.product_id}>{safeText(product.name, 'Unnamed product')}</option>)}</datalist><p className="max-w-xl text-sm leading-6 text-slate-500">Use a product ID from your connected backend catalog. {selectedProductSummary ? `Current suggestion: ${selectedProductSummary.product_id}.` : 'Example format: gyg-product-100.'}</p></div>
              <fieldset className="space-y-3"><legend className="text-[15px] font-black text-slate-900">Time available</legend><label className="flex items-center gap-3 text-[15px] text-slate-900"><input type="radio" checked={timeAvailabilityMode === 'time-period'} onChange={() => setTimeAvailabilityMode('time-period')} className="h-4 w-4 text-[#1d6fe8]" />During operation hours (Time period)</label><label className="flex items-center gap-3 text-[15px] text-slate-900"><input type="radio" checked={timeAvailabilityMode === 'time-point'} onChange={() => setTimeAvailabilityMode('time-point')} className="h-4 w-4 text-[#1d6fe8]" />At fixed starting times (Time point)</label></fieldset>
              <fieldset className="space-y-3"><legend className="text-[15px] font-black text-slate-900">Price set up</legend><label className="flex items-center gap-3 text-[15px] text-slate-900"><input type="radio" checked={priceSetupMode === 'per-individual'} onChange={() => setPriceSetupMode('per-individual')} className="h-4 w-4 text-[#1d6fe8]" />Price per individual</label><label className="flex items-center gap-3 text-[15px] text-slate-900"><input type="radio" checked={priceSetupMode === 'per-group'} onChange={() => setPriceSetupMode('per-group')} className="h-4 w-4 text-[#1d6fe8]" />Price per group</label></fieldset>
              <fieldset className="space-y-3"><legend className="text-[15px] font-black text-slate-900">What do you want to configure automatically?</legend><label className="flex items-center gap-3 text-[15px] text-slate-900"><input type="radio" checked={automationMode === 'availability-price'} onChange={() => setAutomationMode('availability-price')} className="h-4 w-4 text-[#1d6fe8]" />Availability and price</label><label className="flex items-center gap-3 text-[15px] text-slate-900"><input type="radio" checked={automationMode === 'availability-only'} onChange={() => setAutomationMode('availability-only')} className="h-4 w-4 text-[#1d6fe8]" />Availability only</label></fieldset>
              <div className="space-y-3"><label htmlFor="product-timezone" className="block text-[15px] font-black text-slate-900">Product timezone</label><select id="product-timezone" value={productTimezone} onChange={(event) => setProductTimezone(event.target.value)} className="w-full max-w-[400px] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1d6fe8]">{timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select></div>
              <div className="space-y-4"><h3 className="text-[15px] font-black text-slate-900">Dates your product is available</h3><div className="border-t-4 border-[#1d6fe8] bg-sky-50 px-4 py-4 text-[15px] leading-7 text-slate-700">Please select a date range where you have availability for at least 2 different time slots or time periods.</div><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><label className="flex items-center gap-3 text-[15px] font-black text-slate-900"><span>From</span><input type="date" value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1d6fe8]" /></label><label className="flex items-center gap-3 text-[15px] font-black text-slate-900"><span>To</span><input type="date" value={availableTo} onChange={(event) => setAvailableTo(event.target.value)} className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1d6fe8]" /></label></div></div>
              <div className="space-y-4"><h3 className="text-[15px] font-black text-slate-900">Dates your product is NOT available</h3><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><label className="flex items-center gap-3 text-[15px] font-black text-slate-900"><span>From</span><input type="date" value={unavailableFrom} onChange={(event) => setUnavailableFrom(event.target.value)} className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1d6fe8]" /></label><label className="flex items-center gap-3 text-[15px] font-black text-slate-900"><span>To</span><input type="date" value={unavailableTo} onChange={(event) => setUnavailableTo(event.target.value)} className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#1d6fe8]" /></label></div></div>
              <div className="flex flex-wrap gap-3 pt-2"><button type="submit" disabled={ingestLoading || !selectedProductDetail || !selectedSchedule || !selectedOption || !selectedRate} className="inline-flex items-center gap-2 rounded-full bg-[#1d6fe8] px-6 py-3 text-sm font-black text-white disabled:opacity-60"><Activity size={16} />{ingestLoading ? 'Testing your integration...' : 'Test your integration'}</button><button type="button" onClick={() => { setSelectedProductId(products[0]?.product_id ?? ''); setAvailableFrom(''); setAvailableTo(''); setUnavailableFrom(''); setUnavailableTo(''); setIngestResult(null); setSandboxResult(null); }} className="rounded-full border-2 border-[#1d6fe8] px-6 py-3 text-sm font-black text-[#1d6fe8]">Reset</button></div>
            </form>
          </section>

          <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Integration context</p><h3 className="mt-2 text-2xl font-black text-slate-900">Selected product setup</h3></div>{selectedProductSummary ? <button type="button" onClick={() => void handleBootstrap(selectedProductSummary)} disabled={bootstrapProductId === selectedProductSummary.internal_product_id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700 disabled:opacity-60"><Sparkles size={14} />{bootstrapProductId === selectedProductSummary.internal_product_id ? 'Bootstrapping...' : 'Bootstrap mapping'}</button> : null}</div>
              {productsLoading || detailLoading ? <p className="mt-5 text-sm font-medium text-slate-500">Loading product detail...</p> : selectedProductDetail ? <div className="mt-5 space-y-5">{selectedProductSummary && !selectedProductSummary.has_default_mapping ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">This product still requires integration setup. Use <span className="font-black">Bootstrap mapping</span> before running production-ready tests.</div> : null}<div><h4 className="text-xl font-black text-slate-900">{safeText(selectedProductDetail.name, 'Unnamed product')}</h4><p className="mt-2 text-sm leading-6 text-slate-600">{safeText(selectedProductDetail.description, 'No product description has been set yet.')}</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Destination</p><p className="mt-2 text-sm font-bold text-slate-900">{safeText(selectedProductDetail.destination, 'Not set')}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Currency</p><p className="mt-2 text-sm font-bold text-slate-900">{safeText(selectedProductDetail.default_currency, 'KES')}</p></div></div><div className="grid gap-4 md:grid-cols-3"><label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Schedule</span><select value={selectedScheduleId} onChange={(event) => setSelectedScheduleId(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{productSchedules.map((schedule, index) => <option key={schedule.schedule_id || `schedule-${index}`} value={schedule.schedule_id}>{safeText(schedule.schedule_code, 'No schedule code')}</option>)}</select></label><label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Option</span><select value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{productOptions.map((option, index) => <option key={option.option_id || `option-${index}`} value={option.option_id}>{safeText(option.title, 'Unnamed option')}</option>)}</select></label><label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Rate</span><select value={selectedRateId} onChange={(event) => setSelectedRateId(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{selectedRates.map((rate, index) => <option key={rate.rate_id || `rate-${index}`} value={rate.rate_id}>{safeText(rate.category_label, 'Uncategorised')} | {safeText(rate.currency, 'KES')} {safeNumber(rate.amount).toLocaleString()}</option>)}</select></label></div></div> : <p className="mt-5 text-sm font-medium text-slate-500">Select a valid product ID to preview the backend feed payload.</p>}
            </section>
            <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5"><p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Backend response</p><h3 className="mt-2 text-2xl font-black text-slate-900">Latest test outcome</h3><div className="mt-5 space-y-4">{ingestResult ? <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p><p className="mt-2 text-sm font-black text-slate-900">{safeText(ingestResult.status, 'UNKNOWN')}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Payload status</p><p className="mt-2 text-sm font-black text-slate-900">{safeText(ingestResult.payload_status, 'UNKNOWN')}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Booking ref</p><p className="mt-2 text-sm font-black text-slate-900">{safeText(ingestResult.booking_reference, 'Not created')}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Payload id</p><p className="mt-2 break-all text-sm font-black text-slate-900">{safeText(ingestResult.payload_id, 'Not available')}</p></div></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Message</p><p className="mt-2 text-sm leading-6 text-slate-600">{safeText(ingestResult.message, 'No response message returned.')}</p></div></> : <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-500">Run the self-test above to inspect the backend response here.</div>}</div></section>
          </section>

          <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Sandbox relay</p><h3 className="mt-2 text-2xl font-black text-slate-900">Run GetYourGuide certification calls</h3>
              <form onSubmit={handleSandboxRun} className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(['notify-availability-update', 'notify-availability-update-with-price', 'deals', 'suppliers'] as GetYourGuideSandboxEndpoint[]).map((endpoint) => <button key={endpoint} type="button" onClick={() => setSelectedSandboxEndpoint(endpoint)} className={`rounded-2xl border px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] ${selectedSandboxEndpoint === endpoint ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{prettifySlug(endpoint)}</button>)}</div>
                <textarea value={sandboxPayloadText} onChange={(event) => setSandboxPayloadText(event.target.value)} rows={10} className="w-full rounded-[1.6rem] border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-sm text-slate-100" />
                <button type="submit" disabled={sandboxLoading} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-60"><Activity size={16} />{sandboxLoading ? 'Running sandbox call...' : 'Run sandbox call'}</button>
              </form>
            </section>
            <section className="space-y-6"><section className="rounded-[1.6rem] border border-slate-200 bg-white p-5"><p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Sandbox result</p><h3 className="mt-2 text-2xl font-black text-slate-900">GetYourGuide response</h3><div className="mt-5 space-y-4">{sandboxResult ? <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Status code</p><p className="mt-2 text-sm font-black text-slate-900">{safeNumber(sandboxResult.status_code)}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Method</p><p className="mt-2 text-sm font-black text-slate-900">{safeText(sandboxResult.method, 'UNKNOWN')}</p></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Request URL</p><p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900">{safeText(sandboxResult.request_url, 'Not available')}</p></div></> : <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-500">Run a sandbox call to inspect the exact GetYourGuide response here.</div>}</div></section><section className="rounded-[1.6rem] border border-slate-200 bg-white p-5"><p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Operations snapshot</p><h3 className="mt-2 text-2xl font-black text-slate-900">Live backend health</h3><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Mappings</p><p className="mt-2 text-2xl font-black text-slate-900">{mappings.length}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Payloads</p><p className="mt-2 text-2xl font-black text-slate-900">{payloads.length}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Idempotency</p><p className="mt-2 text-2xl font-black text-slate-900">{keys.length}</p></div></div></section></section>
          </section>
        </main>
      </div>
    </div>
  );
};
