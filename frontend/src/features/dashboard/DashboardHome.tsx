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
  ShieldCheck,
  MapPinned,
  TentTree,
  ReceiptText,
  SunMedium,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { api, formatMoney } from '../../lib/api';

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

const activityLabels: Record<ActivityItem['type'], string> = {
  QUOTATION: 'Quotation Created',
  BOOKING: 'Booking Created',
  PAYMENT: 'Payment Received',
};

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/dashboard/summary/');
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
  const roleLabel = user?.role?.replace(/_/g, ' ') ?? 'STAFF';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const kpis = [
    {
      label: 'Quotations',
      value: stats?.total_quotations ?? 0,
      note: 'Ready for follow-up and conversion',
      icon: Calculator,
      accent: 'text-sky-700',
      panel: 'from-sky-50 via-white to-sky-100/60',
      ring: 'ring-sky-100',
      iconBg: 'bg-sky-100',
    },
    {
      label: 'Active Bookings',
      value: stats?.active_bookings ?? 0,
      note: 'Current safari operations in motion',
      icon: Calendar,
      accent: 'text-emerald-700',
      panel: 'from-emerald-50 via-white to-emerald-100/60',
      ring: 'ring-emerald-100',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Pending Payments',
      value: stats?.pending_payments ?? 0,
      note: 'Awaiting finance confirmation',
      icon: Wallet,
      accent: 'text-amber-700',
      panel: 'from-amber-50 via-white to-amber-100/60',
      ring: 'ring-amber-100',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Monthly Expenses',
      value: formatMoney('KES', stats?.expenses_this_month ?? 0),
      note: 'Tracked spend for this month',
      icon: ShoppingCart,
      accent: 'text-rose-700',
      panel: 'from-rose-50 via-white to-rose-100/60',
      ring: 'ring-rose-100',
      iconBg: 'bg-rose-100',
    },
  ];

  const quickActions = [
    {
      label: 'New Quotation',
      description: 'Prepare a polished safari proposal for a client.',
      icon: Plus,
      path: '/quotations/new',
      tone: 'bg-[#f4e6bf] text-[#6b4a06] group-hover:bg-[#ecd79f]',
    },
    {
      label: 'New Booking',
      description: 'Confirm itinerary details and lodge logistics.',
      icon: TentTree,
      path: '/bookings',
      tone: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200',
    },
    {
      label: 'Record Payment',
      description: 'Capture incoming transfers and clear balances.',
      icon: ReceiptText,
      path: '/finance/payments/new',
      tone: 'bg-sky-100 text-sky-700 group-hover:bg-sky-200',
    },
    {
      label: 'Review Analytics',
      description: 'Inspect trends across sales, bookings, and cashflow.',
      icon: TrendingUp,
      path: '/analytics',
      tone: 'bg-primary-100 text-primary-700 group-hover:bg-primary-200',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-700" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[92rem] space-y-8 pb-12">
      <section className="grid gap-6 2xl:grid-cols-[1.55fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="dashboard-panel overflow-hidden rounded-[1.9rem] border-[#dde3d8] bg-white p-7"
        >
          <div className="flex h-full flex-col gap-8">
            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr] xl:items-start">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.32em] text-primary-700">
                  <SunMedium size={12} />
                  Executive Overview
                </div>

                <h1 className="mt-5 max-w-3xl text-[2.6rem] font-semibold leading-[1.02] text-slate-950 md:text-[3.1rem]">
                  Welcome back, {firstName}
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 md:text-base">
                  Monitor bookings, quotations, cashflow, and daily activity from one clear operations dashboard for Mranga Tours &amp; Safaris.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                    {todayLabel}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#ecd9a4] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-primary-950">
                    <ShieldCheck size={12} />
                    Operations Live
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="eyebrow text-slate-400">Workspace</p>
                <p className="mt-3 text-[1.8rem] font-semibold leading-tight text-slate-950">Managerial Portal</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Daily control for safari sales, finance tracking, booking oversight, and team coordination.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="eyebrow text-[10px] text-slate-400">Role</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">{roleLabel}</p>
                    </div>
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary-700">
                      Active
                    </span>
                  </div>

                  <div className="flex items-start gap-3 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                      <MapPinned size={18} />
                    </div>
                    <div>
                      <p className="eyebrow text-[10px] text-slate-400">Region</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">Kenya</p>
                      <p className="text-sm text-slate-500">Safari planning desk</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5">
                <p className="eyebrow text-slate-400">Priority</p>
                <p className="mt-3 text-xl font-semibold leading-tight text-slate-950">Client Response</p>
                <p className="mt-2 text-sm text-slate-500">Keep quotation follow-ups and confirmations moving.</p>
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5">
                <p className="eyebrow text-slate-400">Finance</p>
                <p className="mt-3 text-xl font-semibold leading-tight text-slate-950">Daily Visibility</p>
                <p className="mt-2 text-sm text-slate-500">Payments and expenses stay visible from first glance.</p>
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5">
                <p className="eyebrow text-slate-400">Field Status</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    <MapPinned size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-semibold leading-tight text-slate-950">Operational</p>
                    <p className="text-sm text-slate-500">Systems and workflows are ready.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="dashboard-panel overflow-hidden rounded-[1.9rem] border-[#dde3d8] bg-white p-7"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-slate-400">
                System Health
              </p>
              <h2 className="mt-2 text-[2.25rem] font-semibold leading-tight tracking-tight text-slate-950">
                All core services are stable
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Dashboard reporting, session access, and finance visibility are ready for the day.
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-primary-50 text-primary-700 shadow-sm">
              <ShieldCheck size={24} />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">Session Access</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
                  Active
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Staff authentication is healthy and secure workspace entry is available.
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">Finance Visibility</span>
                <span className="rounded-full bg-[#f4e6bf] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-[#6f500d]">
                  Live
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Quotations, bookings, payments, and expenses are connected to the live summary view.
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-primary-100 bg-primary-50/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm">
                  <TentTree size={20} />
                </div>
                <div>
                  <p className="eyebrow text-[10px] text-primary-500">Field Focus</p>
                  <p className="mt-1 text-xl font-semibold leading-tight text-slate-900">Daily office control is centralized.</p>
                </div>
              </div>
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
              'dashboard-panel rounded-[1.4rem] border bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
              kpi.panel,
              kpi.ring
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={clsx('flex h-14 w-14 items-center justify-center rounded-2xl', kpi.iconBg, kpi.accent)}>
                <kpi.icon size={24} />
              </div>
              <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                Snapshot
              </span>
            </div>

            <div className="mt-8">
              <p className="eyebrow text-slate-400">{kpi.label}</p>
              <h3 className="mt-3 text-[2.2rem] font-semibold leading-tight text-slate-950">{kpi.value}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{kpi.note}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-8 2xl:grid-cols-[1.65fr_0.95fr]">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-slate-400">Operations Feed</p>
              <h3 className="mt-2 text-[2rem] font-semibold leading-tight text-slate-950">Recent Activity</h3>
            </div>
            <div className="hidden rounded-full border border-primary-100 bg-white px-4 py-2 text-sm font-bold text-primary-700 shadow-sm md:inline-flex md:items-center md:gap-2">
              Live Updates
              <ArrowRight size={15} />
            </div>
          </div>

          <div className="dashboard-panel overflow-hidden rounded-[1.4rem] border-slate-200/90 bg-white">
            {activity.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {activity.map((item, idx) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + idx * 0.05 }}
                    className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-[#f8faf7] md:flex-row md:items-center"
                  >
                    <div
                      className={clsx(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                        item.type === 'QUOTATION' && 'bg-sky-100 text-sky-700',
                        item.type === 'BOOKING' && 'bg-emerald-100 text-emerald-700',
                        item.type === 'PAYMENT' && 'bg-[#f4e6bf] text-[#77550a]'
                      )}
                    >
                      {item.type === 'QUOTATION' ? <Calculator size={20} /> : item.type === 'BOOKING' ? <Calendar size={20} /> : <Wallet size={20} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="truncate text-lg font-semibold leading-tight text-slate-950">{item.title}</p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                          {activityLabels[item.type]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-slate-500">{item.subtitle}</p>
                    </div>

                    <div className="flex items-center justify-between gap-4 md:block md:text-right">
                      <div>
                        <p className="text-lg font-bold text-slate-950">{formatMoney('KES', item.amount)}</p>
                        <p className="text-xs font-semibold text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-primary-700">
                        {item.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-8 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                  <Clock3 size={30} />
                </div>
                <h4 className="mt-5 text-2xl font-semibold leading-tight text-slate-950">No recent activity yet</h4>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                  Start with a new quotation, booking, or payment entry and the operations feed will begin to populate automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="eyebrow text-slate-400">Action Center</p>
            <h3 className="mt-2 text-[2rem] font-semibold leading-tight text-slate-950">Quick Actions</h3>
          </div>

          <div className="space-y-4">
            {quickActions.map((action, idx) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.06 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(action.path)}
                className="dashboard-panel group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.4rem] border-slate-200 bg-white px-5 py-5 text-left transition-all duration-300 hover:border-slate-300 hover:shadow-md"
              >
                <div
                  className={clsx(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300',
                    action.tone
                  )}
                >
                  <action.icon size={22} />
                </div>

                <div className="flex-1">
                  <p className="text-lg font-semibold leading-tight text-slate-950">{action.label}</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{action.description}</p>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-slate-200 group-hover:text-slate-700">
                  <ArrowRight size={16} />
                </div>
              </motion.button>
            ))}
          </div>

          <div className="dashboard-panel rounded-[1.4rem] border-[#d9cfb7] bg-[linear-gradient(135deg,#fffaf0_0%,#f6f0de_45%,#eef7ef_100%)] p-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                  <TentTree size={22} />
                </div>
                <div>
                  <p className="eyebrow text-primary-500">Operations Note</p>
                  <h4 className="mt-1 text-2xl font-semibold leading-tight text-slate-950">The desk is ready for today</h4>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-600">
                Use this space as the executive summary before diving into quotations, field bookings, client records, and finance workflows.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
