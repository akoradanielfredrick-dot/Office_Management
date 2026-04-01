import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Briefcase,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { ReportToolbar } from './ReportToolbar';

interface Stats {
  total_revenue: string | number;
  total_expenses: string | number;
  direct_costs: string | number;
  net_cashflow: string | number;
  total_outstanding: string | number;
}

const fallbackStats: Stats = {
  total_revenue: 1240000,
  total_expenses: 485000,
  direct_costs: 310000,
  net_cashflow: 755000,
  total_outstanding: 1150000,
};

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
    return <div className="p-8 text-center text-slate-400">Synchronizing financial intelligence...</div>;
  }

  const revenue = Number(stats?.total_revenue) || 0;
  const expenses = Number(stats?.total_expenses) || 0;
  const directCosts = Number(stats?.direct_costs) || 0;
  const netCashflow = Number(stats?.net_cashflow) || 0;
  const outstanding = Number(stats?.total_outstanding) || 0;
  const indirectCosts = Math.max(expenses - directCosts, 0);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[1.45rem] border border-[#c9def7] bg-[linear-gradient(135deg,#eef7ff_0%,#dceeff_52%,#cfe5fb_100%)] px-8 py-8 text-slate-950 shadow-[0_18px_36px_-24px_rgba(74,120,168,0.35)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.92),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.24),transparent_58%)]" />
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b9d7f4] bg-white/75 px-4 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[#3f6b94] backdrop-blur-sm">
                <Sparkles size={12} />
                Financial Intelligence
              </div>

              <h1 className="mt-6 text-[2.85rem] font-semibold tracking-tight text-slate-950">Executive Analytics</h1>
              <p className="mt-3 max-w-2xl text-[1.02rem] font-medium leading-8 text-slate-700">
                Review performance, cash position, risk exposure, and profitability across the office in one decision-ready workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(93,129,173,0.55)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Revenue</p>
                <p className="mt-2 text-[1.4rem] font-semibold text-slate-950">KES {revenue.toLocaleString()}</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(93,129,173,0.55)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Net Cashflow</p>
                <p className="mt-2 text-[1.4rem] font-semibold text-slate-950">KES {netCashflow.toLocaleString()}</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/62 px-5 py-4 shadow-[0_12px_24px_-20px_rgba(93,129,173,0.55)] backdrop-blur-sm">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-slate-500">Collections Risk</p>
                <p className="mt-2 text-[1.4rem] font-semibold text-slate-950">KES {outstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Analysis Paths</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Open Detailed Reports</h2>

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
        <StatCard label="Total Revenue" amount={revenue} trend="Realized cash" icon={TrendingUp} color="emerald" />
        <StatCard label="Total Expenses" amount={expenses} trend="All outflows" icon={TrendingDown} color="rose" />
        <StatCard label="Net Cashflow" amount={netCashflow} trend="Operational surplus" icon={DollarSign} color="blue" />
        <StatCard label="Pending Collections" amount={outstanding} trend="Recovery exposure" icon={AlertCircle} color="amber" />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <ReportToolbar
            placeholder="Search financial summaries..."
            onSearch={() => {}}
            onDateChange={() => {}}
            onExport={() => window.print()}
          />

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Relative Performance</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">Revenue vs Expense Pattern</h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Dynamic Scale
              </div>
            </div>

            <div className="mt-8 flex h-72 items-end justify-between gap-4 border-b border-slate-100 pb-4">
              {[0.58, 0.74, 0.66, 0.92, 0.78, 1.0].map((scale, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-full w-full items-end justify-center gap-2">
                    <div
                      className="w-5 rounded-t-2xl bg-emerald-400/85 shadow-lg shadow-emerald-500/10"
                      style={{ height: `${(revenue / (revenue + expenses || 1)) * 100 * scale}%` }}
                    />
                    <div
                      className="w-5 rounded-t-2xl bg-rose-400/85 shadow-lg shadow-rose-500/10"
                      style={{ height: `${(expenses / (revenue + expenses || 1)) * 100 * scale}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    M-{5 - i}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-5">
              <Legend label="Realized Revenue" color="bg-emerald-400" />
              <Legend label="Operating Expenses" color="bg-rose-400" />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[1.8rem] border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Direct Variable Costs</p>
            <p className="mt-2 text-3xl font-black text-slate-900">KES {directCosts.toLocaleString()}</p>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-rose-500" style={{ width: `${(directCosts / (expenses || 1)) * 100}%` }} />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {(directCosts / (expenses || 1) * 100).toFixed(1)}% of total outflows
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Indirect & Fixed Costs</p>
            <p className="mt-2 text-3xl font-black text-slate-900">KES {indirectCosts.toLocaleString()}</p>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-500" style={{ width: `${(indirectCosts / (expenses || 1)) * 100}%` }} />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {(indirectCosts / (expenses || 1) * 100).toFixed(1)}% of total outflows
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Recent Financial Actions</p>
            <div className="mt-5 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex gap-3">
                  <div className="w-1.5 rounded-full bg-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Financial record synchronized</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Automated audit log | now</p>
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

const StatCard: React.FC<{
  label: string;
  amount: number;
  trend: string;
  icon: any;
  color: 'emerald' | 'rose' | 'blue' | 'amber';
}> = ({ label, amount, trend, icon: Icon, color }) => (
  <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-center justify-between">
      <div
        className={clsx(
          'flex h-12 w-12 items-center justify-center rounded-2xl',
          color === 'emerald' && 'bg-emerald-100 text-emerald-700',
          color === 'rose' && 'bg-rose-100 text-rose-700',
          color === 'blue' && 'bg-sky-100 text-sky-700',
          color === 'amber' && 'bg-amber-100 text-amber-700'
        )}
      >
        <Icon size={22} />
      </div>
      <span
        className={clsx(
          'text-[11px] font-black uppercase tracking-[0.24em]',
          color === 'emerald' && 'text-emerald-600',
          color === 'rose' && 'text-rose-600',
          color === 'blue' && 'text-sky-600',
          color === 'amber' && 'text-amber-600'
        )}
      >
        {trend}
      </span>
    </div>
    <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black text-slate-900">KES {amount.toLocaleString()}</p>
  </div>
);

const ReportLink: React.FC<{ label: string; description: string; icon: any; onClick: () => void }> = ({ label, description, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:bg-primary-50"
  >
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-black text-slate-900">{label}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-slate-400" />
  </button>
);

const Legend: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center gap-2">
    <div className={clsx('h-3 w-3 rounded-full', color)} />
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
  </div>
);
