import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Briefcase,
  AlertCircle,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { ReportToolbar } from './ReportToolbar';
import { downloadCsvFile } from '../../lib/download';

interface Stats {
  total_revenue: string | number;
  total_expenses: string | number;
  direct_costs: string | number;
  net_cashflow: string | number;
  total_outstanding: string | number;
  revenue_by_currency?: Record<string, string | number>;
  expenses_by_currency?: Record<string, string | number>;
  direct_costs_by_currency?: Record<string, string | number>;
  net_cashflow_by_currency?: Record<string, string | number>;
  outstanding_by_currency?: Record<string, string | number>;
}

const fallbackStats: Stats = {
  total_revenue: 1240000,
  total_expenses: 485000,
  direct_costs: 310000,
  net_cashflow: 755000,
  total_outstanding: 1150000,
  revenue_by_currency: { KES: 0, USD: 0, EUR: 0, GBP: 0 },
  expenses_by_currency: { KES: 0, USD: 0, EUR: 0, GBP: 0 },
  direct_costs_by_currency: { KES: 0, USD: 0, EUR: 0, GBP: 0 },
  net_cashflow_by_currency: { KES: 0, USD: 0, EUR: 0, GBP: 0 },
  outstanding_by_currency: { KES: 0, USD: 0, EUR: 0, GBP: 0 },
};

const operatingCurrencies = ['KES', 'USD', 'EUR', 'GBP'] as const;

const getCurrencyBreakdown = (values?: Record<string, string | number>) =>
  operatingCurrencies.map((currency) => ({
    currency,
    value: Number(values?.[currency]) || 0,
  }));

export const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/finance/analytics/dashboard_summary/');
        if (!response.ok) {
          throw new Error(`Analytics request failed with status ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
        setStats(fallbackStats);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-text-muted)]">Synchronizing financial intelligence...</div>;
  }

  const revenueBreakdown = getCurrencyBreakdown(stats?.revenue_by_currency);
  const expenseBreakdown = getCurrencyBreakdown(stats?.expenses_by_currency);
  const directCostBreakdown = getCurrencyBreakdown(stats?.direct_costs_by_currency);
  const netCashflowBreakdown = getCurrencyBreakdown(stats?.net_cashflow_by_currency);
  const outstandingBreakdown = getCurrencyBreakdown(stats?.outstanding_by_currency);
  const totalRevenue = revenueBreakdown.reduce((sum, item) => sum + item.value, 0);
  const totalExpenses = expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
  const totalDirectCosts = directCostBreakdown.reduce((sum, item) => sum + item.value, 0);
  const indirectCostBreakdown = operatingCurrencies.map((currency, index) => ({
    currency,
    value: Math.max(expenseBreakdown[index].value - directCostBreakdown[index].value, 0),
  }));
  const totalIndirectCosts = indirectCostBreakdown.reduce((sum, item) => sum + item.value, 0);

  const handleExport = () => {
    downloadCsvFile(
      'analytics-dashboard-summary.csv',
      ['Metric', 'KES', 'USD', 'EUR', 'GBP'],
      [
        ['Revenue', ...revenueBreakdown.map((item) => item.value)],
        ['Expenses', ...expenseBreakdown.map((item) => item.value)],
        ['Direct Costs', ...directCostBreakdown.map((item) => item.value)],
        ['Indirect Costs', ...indirectCostBreakdown.map((item) => item.value)],
        ['Net Cashflow', ...netCashflowBreakdown.map((item) => item.value)],
        ['Outstanding', ...outstandingBreakdown.map((item) => item.value)],
      ]
    );
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[1.45rem] border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-primary-soft)_0%,#f3f6e8_45%,var(--color-accent-soft)_100%)] px-8 py-8 text-[var(--color-text-primary)] shadow-[0_20px_38px_-28px_rgba(111,130,5,0.36)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.24),transparent_58%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <h1 className="text-[2.85rem] font-semibold tracking-tight text-[var(--color-primary-strong)]">Executive Analytics</h1>
              <p className="mt-3 max-w-2xl text-[1.02rem] font-medium leading-8 text-[var(--color-text-secondary)]">
                Review performance, cash position, risk exposure, and profitability across the office in one decision-ready workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <OverviewCard label="Revenue" items={revenueBreakdown} />
              <OverviewCard label="Net Cashflow" items={netCashflowBreakdown} />
              <OverviewCard label="Collections Risk" items={outstandingBreakdown} />
            </div>
          </div>
        </motion.div>

        <div className="brand-panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Analysis Paths</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--color-primary-strong)]">Open Detailed Reports</h2>

          <div className="mt-6 space-y-3">
            <ReportLink
              label="Booking Profitability"
              description="Gross margins and tour performance"
              icon={PieChart}
              onClick={() => navigate('/analytics/profitability')}
            />
            <ReportLink
              label="Supplier Spend"
              description="Vendor concentration and spend patterns"
              icon={Briefcase}
              onClick={() => navigate('/analytics/suppliers')}
            />
            <ReportLink
              label="Debt Aging Tracker"
              description="Outstanding balances and collection risk"
              icon={AlertCircle}
              onClick={() => navigate('/analytics/outstanding')}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" items={revenueBreakdown} trend="KES/USD/EUR/GBP mix" icon={TrendingUp} tone="primary" />
        <StatCard label="Total Expenses" items={expenseBreakdown} trend="KES/USD/EUR/GBP mix" icon={TrendingDown} tone="danger" />
        <StatCard label="Net Cashflow" items={netCashflowBreakdown} trend="KES/USD/EUR/GBP mix" icon={DollarSign} tone="accent" />
        <StatCard label="Pending Collections" items={outstandingBreakdown} trend="KES/USD/EUR/GBP mix" icon={AlertCircle} tone="accent-soft" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-white shadow-[0_16px_36px_-30px_rgba(111,130,5,0.28)]">
          <ReportToolbar
            placeholder="Search financial summaries..."
            onSearch={() => {}}
            onDateChange={() => {}}
            onExport={handleExport}
          />

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Relative Performance</p>
                <h3 className="mt-2 text-2xl font-black text-[var(--color-primary-strong)]">Revenue vs Expense Pattern</h3>
              </div>
              <div className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                Dynamic Scale
              </div>
            </div>

            <div className="mt-8 flex h-72 items-end justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              {[0.58, 0.74, 0.66, 0.92, 0.78, 1.0].map((scale, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-full w-full items-end justify-center gap-2">
                    <div
                      className="w-5 rounded-t-2xl bg-[var(--color-primary)] shadow-lg shadow-[rgba(111,130,5,0.15)]"
                      style={{ height: `${(totalRevenue / (totalRevenue + totalExpenses || 1)) * 100 * scale}%` }}
                    />
                    <div
                      className="w-5 rounded-t-2xl bg-[var(--color-accent)] shadow-lg shadow-[rgba(255,162,3,0.18)]"
                      style={{ height: `${(totalExpenses / (totalRevenue + totalExpenses || 1)) * 100 * scale}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    M-{5 - i}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-5">
              <Legend label="Realized Revenue" color="bg-[var(--color-primary)]" />
              <Legend label="Operating Expenses" color="bg-[var(--color-accent)]" />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <InsightCard
            label="Direct Variable Costs"
            items={directCostBreakdown}
            barColor="bg-[var(--color-accent)]"
            percentage={(totalDirectCosts / (totalExpenses || 1)) * 100}
          />

          <InsightCard
            label="Indirect & Fixed Costs"
            items={indirectCostBreakdown}
            barColor="bg-[var(--color-primary)]"
            percentage={(totalIndirectCosts / (totalExpenses || 1)) * 100}
          />

          <div className="brand-panel p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Recent Financial Actions</p>
            <div className="mt-5 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex gap-3">
                  <div className="w-1.5 rounded-full bg-[var(--color-primary)]" />
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">Financial record synchronized</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Automated audit log | now</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const OverviewCard: React.FC<{
  label: string;
  items: Array<{ currency: string; value: number }>;
}> = ({ label, items }) => (
  <div className="rounded-[1rem] border border-white/70 bg-white/72 px-5 py-4 shadow-[0_14px_28px_-22px_rgba(111,130,5,0.22)] backdrop-blur-sm">
    <p className="text-[0.85rem] uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">{label}</p>
    <MetricBreakdown items={items} />
  </div>
);

const StatCard: React.FC<{
  label: string;
  items: Array<{ currency: string; value: number }>;
  trend: string;
  icon: LucideIcon;
  tone: 'primary' | 'danger' | 'accent' | 'accent-soft';
}> = ({ label, items, trend, icon: Icon, tone }) => (
  <div className="brand-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_-30px_rgba(111,130,5,0.3)]">
    <div className="flex items-center justify-between">
      <div
        className={clsx(
          'flex h-12 w-12 items-center justify-center rounded-2xl',
          tone === 'primary' && 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
          tone === 'danger' && 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
          tone === 'accent' && 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]',
          tone === 'accent-soft' && 'bg-[var(--color-primary-tint)] text-[var(--color-primary-hover)]'
        )}
      >
        <Icon size={22} />
      </div>
      <span
        className={clsx(
          'text-[11px] font-black uppercase tracking-[0.24em]',
          tone === 'primary' && 'text-[var(--color-primary)]',
          tone === 'danger' && 'text-[var(--color-danger)]',
          tone === 'accent' && 'text-[var(--color-accent-hover)]',
          tone === 'accent-soft' && 'text-[var(--color-primary-hover)]'
        )}
      >
        {trend}
      </span>
    </div>
    <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{label}</p>
    <MetricBreakdown items={items} compact />
  </div>
);

const InsightCard: React.FC<{
  label: string;
  items: Array<{ currency: string; value: number }>;
  barColor: string;
  percentage: number;
}> = ({ label, items, barColor, percentage }) => (
  <div className="rounded-[1.8rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-surface)_0%,var(--color-surface-soft)_100%)] p-5 shadow-[0_16px_32px_-28px_rgba(111,130,5,0.22)]">
    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-text-muted)]">{label}</p>
    <MetricBreakdown items={items} compact />
    <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary-soft)]">
      <div className={clsx('h-full rounded-full', barColor)} style={{ width: `${percentage}%` }} />
    </div>
    <p className="mt-3 text-xs font-semibold text-[var(--color-text-secondary)]">
      {percentage.toFixed(1)}% of total outflows
    </p>
  </div>
);

const MetricBreakdown: React.FC<{
  items: Array<{ currency: string; value: number }>;
  compact?: boolean;
}> = ({ items, compact = false }) => (
  <div className={clsx('mt-3 space-y-2', compact && 'space-y-1.5')}>
    {items.map((item) => (
      <div key={item.currency} className="flex items-center justify-between text-sm">
        <span className={clsx('font-semibold text-[var(--color-text-secondary)]', compact && 'text-xs uppercase tracking-[0.18em]')}>{item.currency}</span>
        <span className={clsx('font-black text-[var(--color-text-primary)]', compact ? 'text-sm' : 'text-lg')}>{item.value.toLocaleString()}</span>
      </div>
    ))}
  </div>
);

const ReportLink: React.FC<{ label: string; description: string; icon: LucideIcon; onClick: () => void }> = ({ label, description, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-[1.4rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-4 text-left transition-colors hover:bg-[var(--color-primary-soft)]"
  >
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-black text-[var(--color-text-primary)]">{label}</p>
        <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
  </button>
);

const Legend: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center gap-2">
    <div className={clsx('h-3 w-3 rounded-full', color)} />
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">{label}</span>
  </div>
);
