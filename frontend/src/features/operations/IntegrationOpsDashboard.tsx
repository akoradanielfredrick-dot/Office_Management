import React from 'react';
import { Activity, Boxes, ExternalLink, RefreshCcw, ShieldCheck } from 'lucide-react';
import { api, backendAdminUrl } from '../../lib/api';
import type { PaginatedResponse } from './listTypes';

interface ExternalProductMappingRecord {
  id: string;
  provider: string;
  product_name: string;
  participant_category_label?: string;
  external_product_id: string;
  external_option_id?: string;
  external_rate_id?: string;
  is_active: boolean;
  is_default: boolean;
  default_currency?: string;
}

interface InboundBookingPayloadRecord {
  id: string;
  provider: string;
  event_type: string;
  external_booking_reference?: string;
  booking_reference?: string;
  product_name?: string;
  processing_status: string;
  processing_notes?: string;
  error_message?: string;
  received_at: string;
}

interface ApiIdempotencyRecord {
  id: string;
  provider: string;
  event_type: string;
  idempotency_key: string;
  processing_status: string;
  hit_count: number;
  last_seen_at: string;
  last_error?: string;
}

export const IntegrationOpsDashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [mappings, setMappings] = React.useState<ExternalProductMappingRecord[]>([]);
  const [payloads, setPayloads] = React.useState<InboundBookingPayloadRecord[]>([]);
  const [keys, setKeys] = React.useState<ApiIdempotencyRecord[]>([]);
  const [mappingCount, setMappingCount] = React.useState(0);
  const [payloadCount, setPayloadCount] = React.useState(0);
  const [keyCount, setKeyCount] = React.useState(0);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [mappingResponse, payloadResponse, keyResponse] = await Promise.all([
        api.get<PaginatedResponse<ExternalProductMappingRecord>>('/operations/product-mappings/', { params: { page: 1, page_size: 8 } }),
        api.get<PaginatedResponse<InboundBookingPayloadRecord>>('/operations/inbound-booking-payloads/', { params: { page: 1, page_size: 8 } }),
        api.get<PaginatedResponse<ApiIdempotencyRecord>>('/operations/idempotency-keys/', { params: { page: 1, page_size: 8 } }),
      ]);

      setMappings(mappingResponse.data.results);
      setPayloads(payloadResponse.data.results);
      setKeys(keyResponse.data.results);
      setMappingCount(mappingResponse.data.count);
      setPayloadCount(payloadResponse.data.count);
      setKeyCount(keyResponse.data.count);
    } catch (error) {
      console.error('Failed to load integration operations dashboard:', error);
      setMappings([]);
      setPayloads([]);
      setKeys([]);
      setMappingCount(0);
      setPayloadCount(0);
      setKeyCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const duplicateHits = keys.filter((item) => item.hit_count > 1).length;
  const failedPayloads = payloads.filter((item) => item.processing_status === 'FAILED').length;

  const getProcessingTone = (status: string) => {
    switch (status) {
      case 'PROCESSED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
      case 'FAILED':
        return 'bg-rose-100 text-rose-700 ring-rose-200';
      case 'DUPLICATE':
        return 'bg-amber-100 text-amber-700 ring-amber-200';
      default:
        return 'bg-sky-100 text-sky-700 ring-sky-200';
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Integration Workspace</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">OTA & API Prep</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Review external product mappings, inbound booking traffic, and idempotency protection before partner adapters go live.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
          <a
            href={`${backendAdminUrl}operations/externalproductmapping/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <ExternalLink size={17} />
            Manage In Admin
          </a>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.8rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Boxes size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Mappings</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{mappingCount}</p>
        </div>

        <div className="rounded-[1.8rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Activity size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Inbound Payloads</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{payloadCount}</p>
        </div>

        <div className="rounded-[1.8rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldCheck size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Idempotency Keys</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{keyCount}</p>
        </div>

        <div className="rounded-[1.8rem] border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <RefreshCcw size={22} />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Attention Needed</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{duplicateHits + failedPayloads}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            {duplicateHits} duplicate hits | {failedPayloads} failed payloads
          </p>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">
          Loading integration activity...
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-3">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">External Product Mapping</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Current Mapping Rows</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {mappings.length ? mappings.map((mapping) => (
                <div key={mapping.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{mapping.external_product_id}</p>
                      <p className="mt-1 text-sm font-medium text-slate-600">{mapping.product_name}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {mapping.provider} {mapping.external_option_id ? `| ${mapping.external_option_id}` : ''} {mapping.external_rate_id ? `| ${mapping.external_rate_id}` : ''}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${mapping.is_active ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                      {mapping.is_default ? 'Default' : 'Mapped'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-6 text-sm font-medium text-slate-500">No external mappings yet.</div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Inbound Traffic</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Latest Payloads</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {payloads.length ? payloads.map((payload) => (
                <div key={payload.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{payload.external_booking_reference || 'No external ref'}</p>
                      <p className="mt-1 text-sm font-medium text-slate-600">{payload.product_name || payload.booking_reference || 'Unmatched payload'}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{payload.provider} | {payload.event_type}</p>
                      {payload.processing_notes || payload.error_message ? (
                        <p className="mt-2 text-xs font-medium text-slate-500">{payload.error_message || payload.processing_notes}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getProcessingTone(payload.processing_status)}`}>
                        {payload.processing_status}
                      </span>
                      <p className="mt-2 text-xs font-medium text-slate-400">{new Date(payload.received_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-6 text-sm font-medium text-slate-500">No inbound payloads captured yet.</div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Idempotency Guard</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Recent Keys</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {keys.length ? keys.map((key) => (
                <div key={key.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{key.idempotency_key}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{key.provider} | {key.event_type}</p>
                      {key.last_error ? <p className="mt-2 text-xs font-medium text-rose-600">{key.last_error}</p> : null}
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1 ${getProcessingTone(key.processing_status)}`}>
                        {key.processing_status}
                      </span>
                      <p className="mt-2 text-xs font-medium text-slate-500">{key.hit_count} hit{key.hit_count === 1 ? '' : 's'}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{new Date(key.last_seen_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-6 text-sm font-medium text-slate-500">No idempotency keys recorded yet.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
