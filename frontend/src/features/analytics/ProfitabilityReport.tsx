import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { ReportToolbar } from './ReportToolbar';
import { downloadCsvFile } from '../../lib/download';

interface ProfitData {
  id: string;
  ref: string;
  client: string;
  product?: string;
  currency?: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

const fallbackData: ProfitData[] = [
  { id: '1', ref: 'BKG-2026-0005', client: 'John Doe', product: 'Maasai Mara Safari', currency: 'USD', revenue: 150000, costs: 40000, profit: 110000, margin: 73.3 },
  { id: '2', ref: 'BKG-2026-0012', client: 'Acme Corp', product: 'Amboseli Executive Trip', currency: 'EUR', revenue: 320000, costs: 240000, profit: 80000, margin: 25 },
];

const operatingCurrencies = ['KES', 'USD', 'EUR', 'GBP'] as const;

export const ProfitabilityReport: React.FC = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ProfitData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch('/api/finance/analytics/profitability/');
        if (!response.ok) {
          throw new Error(`Profitability request failed with status ${response.status}`);
        }
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        console.error('Failed to fetch profitability', err);
        setReportData(fallbackData);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const avgMargin = reportData.length > 0 ? reportData.reduce((sum, d) => sum + Number(d.margin), 0) / reportData.length : 0;
  const totalsByCurrency = operatingCurrencies.map((currency) => ({
    currency,
    revenue: reportData.filter((item) => (item.currency || 'KES') === currency).reduce((sum, item) => sum + Number(item.revenue), 0),
    costs: reportData.filter((item) => (item.currency || 'KES') === currency).reduce((sum, item) => sum + Number(item.costs), 0),
  }));
  const handleExport = () => {
    downloadCsvFile(
      'booking-profitability-report.csv',
      ['Booking Ref', 'Client', 'Product', 'Currency', 'Revenue', 'Costs', 'Profit', 'Margin %'],
      reportData.map((item) => [
        item.ref,
        item.client,
        item.product || '',
        item.currency || 'KES',
        item.revenue,
        item.costs,
        item.profit,
        Number(item.margin).toFixed(1),
      ])
    );
  };

  if (loading) return <div className="p-8 text-center text-[var(--color-text-muted)]">Analyzing tour margins...</div>;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/analytics')}
            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] shadow-[0_12px_24px_-20px_rgba(111,130,5,0.24)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Detailed Analytics</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-primary-strong)]">Booking Profitability</h1>
            <p className="mt-2 text-sm font-medium text-[var(--color-text-secondary)]">Gross margin analysis and performance comparison across active tours.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard label="Avg. Portfolio Margin" value={`${avgMargin.toFixed(1)}%`} tone="primary" />
        <MetricCard label="Total Realized Revenue" value={totalsByCurrency.map((item) => `${item.currency} ${item.revenue.toLocaleString()}`).join(' | ')} tone="accent" />
        <MetricCard label="Total Direct Costs" value={totalsByCurrency.map((item) => `${item.currency} ${item.costs.toLocaleString()}`).join(' | ')} tone="danger" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-[0_16px_36px_-30px_rgba(111,130,5,0.28)]">
        <ReportToolbar placeholder="Filter by booking or client..." onSearch={() => {}} onDateChange={() => {}} onExport={handleExport} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-white">
              <tr className="border-b border-[var(--color-border)] text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                <th className="px-6 py-4">Booking Details</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4 text-right">Costs</th>
                <th className="px-6 py-4 text-right">Gross Profit</th>
                <th className="px-6 py-4 text-center">Margin Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {reportData.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-[var(--color-primary-tint)]">
                  <td className="px-6 py-5">
                    <p className="font-black text-[var(--color-text-primary)]">{p.ref}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">{p.client}</p>
                    {p.product && <p className="mt-1 text-xs font-medium text-[var(--color-primary)]">{p.product}</p>}
                  </td>
                  <td className="px-6 py-5 text-right text-sm font-black text-[var(--color-text-primary)]">{p.currency || 'KES'} {Number(p.revenue).toLocaleString()}</td>
                  <td className="px-6 py-5 text-right text-sm font-black text-rose-600">-{p.currency || 'KES'} {Number(p.costs).toLocaleString()}</td>
                  <td className="px-6 py-5 text-right text-sm font-black text-[var(--color-primary)]">+{p.currency || 'KES'} {Number(p.profit).toLocaleString()}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={clsx(
                      'inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ring-1',
                      p.margin >= 25 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)] ring-[var(--color-border-strong)]' :
                      p.margin >= 10 ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)] ring-[var(--color-accent)]/20' :
                      'bg-rose-100 text-rose-700 ring-rose-200'
                    )}>
                      {Number(p.margin).toFixed(1)}% {p.margin >= 25 ? 'High' : p.margin >= 10 ? 'Fair' : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; tone: 'primary' | 'accent' | 'danger' }> = ({ label, value, tone }) => (
  <div className={clsx(
    'rounded-[1.8rem] border bg-white p-5 shadow-[0_16px_32px_-28px_rgba(111,130,5,0.22)]',
    tone === 'primary' && 'border-[var(--color-border)]',
    tone === 'accent' && 'border-[var(--color-accent)]/25',
    tone === 'danger' && 'border-rose-100'
  )}>
    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{label}</p>
    <p className="mt-3 text-3xl font-black text-[var(--color-primary-strong)]">{value}</p>
  </div>
);
