import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  Calendar,
  Wallet,
  ShoppingCart,
  ArrowRight,
  Plus,
  Clock3,
  TrendingUp,
  Briefcase,
  Sparkles,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface DashboardStats {
  total_quotations: number;
  active_bookings: number;
  pending_payments: number;
  expenses_this_month: string | number;
}

interface ActivityItem {
  type: 'QUOTATION' | 'BOOKING' | 'PAYMENT';
  id: string;
  title: string;
  subtitle: string;
  date: string;
  status: string;
  amount: number | string;
}

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get('/api/dashboard/summary/');
        setStats(res.data.stats);
        setActivity(res.data.recent_activity);
      } catch (error) {
        console.error('Failed to fetch dashboard summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Team';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const kpis = [
    {
      label: 'Quotations',
      value: stats?.total_quotations || 0,
      icon: Calculator,
      accent: 'text-sky-700',
      panel: 'from-sky-50 to-white',
      ring: 'ring-sky-100',
      iconBg: 'bg-sky-100',
    },
    {
      label: 'Active Bookings',
      value: stats?.active_bookings || 0,
      icon: Calendar,
      accent: 'text-emerald-700',
      panel: 'from-emerald-50 to-white',
      ring: 'ring-emerald-100',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Pending Payments',
      value: stats?.pending_payments || 0,
      icon: Wallet,
      accent: 'text-amber-700',
      panel: 'from-amber-50 to-white',
      ring: 'ring-amber-100',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Monthly Expenses',
      value: `KES ${Number(stats?.expenses_this_month || 0).toLocaleString()}`,
      icon: ShoppingCart,
      accent: 'text-rose-700',
      panel: 'from-rose-50 to-white',
      ring: 'ring-rose-100',
      iconBg: 'bg-rose-100',
    },
  ];

  const quickActions = [
    { label: 'New Quotation', icon: Plus, path: '/quotations/new', tone: 'bg-primary-700 hover:bg-primary-800' },
    { label: 'View Bookings', icon: Briefcase, path: '/bookings', tone: 'bg-slate-800 hover:bg-slate-900' },
    { label: 'Record Payment', icon: Wallet, path: '/finance/payments/new', tone: 'bg-emerald-700 hover:bg-emerald-800' },
    { label: 'Analytics', icon: TrendingUp, path: '/analytics', tone: 'bg-accent-700 hover:bg-accent-800' },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-primary-700" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary-100 bg-[linear-gradient(135deg,#153d15_0%,#1c4f1c_45%,#244d2d_100%)] p-8 text-white shadow-[0_20px_60px_-30px_rgba(21,61,21,0.65)]"
        >
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                `url("data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M21 0h2v44h-2zM0 21h44v2H0z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-primary-100">
                  <Sparkles size={12} />
                  Executive Overview
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-tight">
                  Welcome back, {firstName}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-primary-100">
                  Keep bookings moving, monitor cashflow, and stay on top of operations from one central workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary-200">
                  Today
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{todayLabel}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-primary-200">Role</p>
                <p className="mt-2 text-lg font-bold text-white">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-primary-200">Workspace</p>
                <p className="mt-2 text-lg font-bold text-white">Managerial Portal</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-primary-200">Status</p>
                <div className="mt-2 flex items-center gap-2 text-lg font-bold text-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent-300" />
                  Operational
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                System Health
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">All core services are stable</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <ShieldCheck size={22} />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Session Access</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                  Active
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Authenticated workspace access is available for operational tasks.</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Finance Visibility</span>
                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary-700">
                  Live
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Dashboard summaries and transaction monitoring are connected.</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={clsx(
              'rounded-[1.8rem] border bg-gradient-to-br p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
              kpi.panel,
              kpi.ring
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={clsx('flex h-14 w-14 items-center justify-center rounded-2xl', kpi.iconBg, kpi.accent)}>
                <kpi.icon size={24} />
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Snapshot
              </span>
            </div>

            <div className="mt-8">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{kpi.label}</p>
              <h3 className="mt-3 text-3xl font-black text-slate-900">{kpi.value}</h3>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.7fr_0.95fr]">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Operations Feed</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Recent Activity</h3>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-2 text-sm font-bold text-primary-700 shadow-sm transition-colors hover:bg-primary-50">
              View All
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {activity.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {activity.map((item, idx) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + (idx * 0.05) }}
                    className="flex items-center gap-4 px-6 py-5 transition-colors hover:bg-slate-50"
                  >
                    <div className={clsx(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      item.type === 'QUOTATION' && 'bg-sky-100 text-sky-700',
                      item.type === 'BOOKING' && 'bg-emerald-100 text-emerald-700',
                      item.type === 'PAYMENT' && 'bg-accent-100 text-accent-700'
                    )}>
                      {item.type === 'QUOTATION' ? <Calculator size={20} /> : item.type === 'BOOKING' ? <Calendar size={20} /> : <Wallet size={20} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-slate-900">{item.title}</p>
                      <p className="truncate text-sm font-medium text-slate-500">{item.subtitle}</p>
                    </div>

                    <div className="hidden text-right md:block">
                      <p className="text-sm font-black text-slate-900">KES {Number(item.amount).toLocaleString()}</p>
                      <p className="text-xs font-semibold text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-8 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                  <Clock3 size={30} />
                </div>
                <h4 className="mt-5 text-xl font-black text-slate-900">No recent activity yet</h4>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                  Start by creating a quotation, confirming a booking, or recording a payment to populate your live activity feed.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Action Center</p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">Quick Actions</h3>
          </div>

          <div className="space-y-4">
            {quickActions.map((action, idx) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + (idx * 0.06) }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(action.path)}
                className={clsx(
                  'group flex w-full items-center gap-4 rounded-[1.8rem] px-5 py-5 text-left text-white shadow-lg shadow-black/5 transition-all duration-200',
                  action.tone
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <action.icon size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-black">{action.label}</p>
                  <p className="text-sm font-medium text-white/75">Open module and continue workflow</p>
                </div>
                <ArrowRight size={18} className="opacity-60 transition-transform group-hover:translate-x-1" />
              </motion.button>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-[1.9rem] border border-primary-100 bg-[linear-gradient(135deg,#f5fbf5_0%,#eef7ef_48%,#fff8ef_100%)] p-6 shadow-sm">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  `url("data:image/svg+xml,%3Csvg width='26' height='26' viewBox='0 0 26 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23153d15' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='13' cy='13' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                  <Activity size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary-500">Operational Note</p>
                  <h4 className="mt-1 text-xl font-black text-slate-900">Daily visibility is set</h4>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-600">
                This dashboard is ready for daily office monitoring, with finance, bookings, and sales actions kept one click away.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
