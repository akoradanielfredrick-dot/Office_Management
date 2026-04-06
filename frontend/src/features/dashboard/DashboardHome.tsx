import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CirclePlus,
  Wallet,
  ShoppingCart,
  ChevronRight,
  Clock3,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Users,
  Activity,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { api, formatMoney } from '../../lib/api';

interface DashboardStats {
  total_clients: number;
  active_bookings: number;
  pending_payments: number;
  expenses_this_month: string | number;
  expenses_this_month_by_currency?: Record<string, string | number>;
}

interface ActivityItem {
  type: 'BOOKING' | 'PAYMENT';
  id: string;
  booking_id?: string | null;
  title: string;
  subtitle: string;
  date: string;
  status: string;
  amount: number | string;
  currency?: string;
}

const operatingCurrencies = ['KES', 'USD', 'EUR', 'GBP'] as const;

const normalizeRoleLabel = (role: unknown): string => {
  if (typeof role === 'string' && role.trim()) {
    return role.replace(/_/g, ' ');
  }

  if (role && typeof role === 'object' && 'name' in role) {
    const roleName = (role as { name?: unknown }).name;
    if (typeof roleName === 'string' && roleName.trim()) {
      return roleName.replace(/_/g, ' ');
    }
  }

  return 'STAFF';
};

const activityPresentation: Record<ActivityItem['type'], {
  icon: LucideIcon;
  iconWrap: string;
  destination: (item: ActivityItem) => string;
}> = {
  BOOKING: {
    icon: Calendar,
    iconWrap: 'bg-[#e9fbf2] text-[#17a86b]',
    destination: (item) => `/bookings/${item.id}`,
  },
  PAYMENT: {
    icon: Wallet,
    iconWrap: 'bg-[#fff1e8] text-[#ff6224]',
    destination: (item) => item.booking_id ? `/bookings/${item.booking_id}` : '/finance/payments',
  },
};

const statusToneMap: Record<string, string> = {
  CONFIRMED: 'bg-[#e9fbf2] text-[#148454]',
  PENDING: 'bg-[#fff5db] text-[#a56a00]',
  ONGOING: 'bg-[#e8f1ff] text-[#295ed8]',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-[#ffecef] text-[#c53b5a]',
  FAILED: 'bg-[#ffecef] text-[#c53b5a]',
  AMENDED: 'bg-[#f1ebff] text-[#6f49c6]',
  RECEIVED: 'bg-[#fff1e8] text-[#cc541c]',
};

const formatActivityDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

  const firstName = user?.full_name?.split(' ')[0] ?? 'User';
  const roleLabel = normalizeRoleLabel(user?.role);
  const monthlyExpenseBreakdown = operatingCurrencies.map((currency) => ({
    currency,
    value: Number(stats?.expenses_this_month_by_currency?.[currency]) || 0,
  }));
  const bookingActivity = activity.filter((item) => item.type === 'BOOKING');
  const paymentActivity = activity.filter((item) => item.type === 'PAYMENT');
  const bookingStatusSummary = [
    {
      label: 'Confirmed',
      value: stats?.active_bookings ?? 0,
      tone: 'bg-[#e9fbf2] text-[#148454]',
    },
    {
      label: 'Awaiting payment',
      value: stats?.pending_payments ?? 0,
      tone: 'bg-[#fff5db] text-[#a56a00]',
    },
    {
      label: 'Recently created',
      value: bookingActivity.length,
      tone: 'bg-[#e8f1ff] text-[#295ed8]',
    },
  ];
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const kpis = [
    {
      label: 'Clients',
      value: stats?.total_clients ?? 0,
      icon: Users,
      iconWrap: 'bg-[#eef4ff] text-[#2964ff]',
    },
    {
      label: 'Active Bookings',
      value: stats?.active_bookings ?? 0,
      icon: Calendar,
      iconWrap: 'bg-[#e9fbf2] text-[#17a86b]',
    },
    {
      label: 'Pending Payments',
      value: stats?.pending_payments ?? 0,
      icon: CreditCard,
      iconWrap: 'bg-[#fff1e8] text-[#ff6224]',
    },
    {
      label: 'Monthly Expenses',
      value: monthlyExpenseBreakdown.map(({ currency, value }) => `${currency} ${value.toLocaleString()}`).join(' | '),
      icon: ShoppingCart,
      iconWrap: 'bg-[#ffecef] text-[#f33a5f]',
    },
  ];

  const quickActions = [
    {
      label: 'View Bookings',
      description: 'Open module and continue workflow',
      icon: Calendar,
      path: '/bookings',
      tone: 'bg-[#384a66]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'Manage Products',
      description: 'Update tours, rates, and catalog data',
      icon: Boxes,
      path: '/products',
      tone: 'bg-[#4c5b85]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'Catalog View',
      description: 'See clients, products, and excursions together',
      icon: Boxes,
      path: '/catalog',
      tone: 'bg-[#4d6a58]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'Create Schedule',
      description: 'Publish departures and live capacity',
      icon: Clock3,
      path: '/schedules/new',
      tone: 'bg-[#7a5f42]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'View Availability',
      description: 'See remaining, reserved, and confirmed space',
      icon: Activity,
      path: '/availability',
      tone: 'bg-[#255b7a]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'Integration Ops',
      description: 'Review mappings, payloads, and idempotency keys',
      icon: ShieldCheck,
      path: '/integrations',
      tone: 'bg-[#5a4f84]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'Create Reservation',
      description: 'Place temporary inventory holds',
      icon: ShieldCheck,
      path: '/reservations/new',
      tone: 'bg-[#2c6b63]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'Record Payment',
      description: 'Open module and continue workflow',
      icon: Wallet,
      path: '/finance/payments/new',
      tone: 'bg-[#6d8141]',
      iconBg: 'bg-white/15',
    },
    {
      label: 'Analytics',
      description: 'Open module and continue workflow',
      icon: TrendingUp,
      path: '/analytics',
      tone: 'bg-[#ffb120]',
      iconBg: 'bg-white/15',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#6d8141]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[90rem] space-y-8 pb-12">
      <section className="grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.45rem] bg-[#667a3d] px-8 py-8 text-white shadow-[0_16px_34px_-24px_rgba(66,82,39,0.5)]"
        >
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffb120] px-4 py-2 text-[0.9rem] font-medium text-[#334012]">
              <Activity size={14} />
              EXECUTIVE OVERVIEW
            </div>

            <h1 className="mt-6 text-[2.85rem] font-semibold tracking-tight text-white">
              Welcome back, {firstName}
            </h1>
            <p className="mt-3 text-[1.02rem] font-medium text-white/92">
              Keep bookings moving, monitor cashflow, and stay on top of operations from one central workspace.
            </p>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1rem] border border-white/18 bg-white/10 px-5 py-4">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-white/80">TODAY</p>
                <p className="mt-2 text-[1.05rem] font-semibold text-white">{todayLabel}</p>
              </div>
              <div className="rounded-[1rem] border border-white/18 bg-white/10 px-5 py-4">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-white/80">ROLE</p>
                <p className="mt-2 text-[1.05rem] font-semibold text-white">{roleLabel}</p>
              </div>
              <div className="rounded-[1rem] border border-white/18 bg-white/10 px-5 py-4">
                <p className="text-[0.85rem] uppercase tracking-[0.05em] text-white/80">WORKSPACE</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-[1.05rem] font-semibold text-white">Managerial Portal</p>
                  <span className="h-2 w-2 rounded-full bg-[#ffb120]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[1.2rem] border border-[#d8dee7] bg-white p-6 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.78rem] uppercase tracking-[0.14em] text-slate-400">SYSTEM HEALTH</p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-tight text-slate-950">
                All core services are stable
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eff8ef] text-[#11a960]">
              <ShieldCheck size={22} />
            </div>
          </div>

          <div className="mt-7 space-y-4">
            <div className="rounded-[1rem] bg-[#f8fafc] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[1rem] font-medium text-slate-900">Session Access</p>
                <span className="rounded-full bg-[#c9f7d8] px-3 py-1 text-[0.78rem] font-medium uppercase tracking-[0.05em] text-[#15a05a]">
                  ACTIVE
                </span>
              </div>
              <p className="mt-3 text-[0.98rem] leading-8 text-slate-600">
                Authenticated workspace access is available for operational tasks.
              </p>
            </div>

            <div className="rounded-[1rem] bg-[#f8fafc] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[1rem] font-medium text-slate-900">Finance Visibility</p>
                <span className="rounded-full bg-[#c9f7d8] px-3 py-1 text-[0.78rem] font-medium uppercase tracking-[0.05em] text-[#15a05a]">
                  LIVE
                </span>
              </div>
              <p className="mt-3 text-[0.98rem] leading-8 text-slate-600">
                Dashboard summaries and transaction monitoring are connected.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[1.7fr_0.95fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {kpis.map((kpi, idx) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 + idx * 0.05 }}
                className="rounded-[1.15rem] border border-[#d8dee7] bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={clsx('flex h-12 w-12 items-center justify-center rounded-xl', kpi.iconWrap)}>
                    <kpi.icon size={22} />
                  </div>
                  <span className="text-[0.76rem] uppercase tracking-[0.12em] text-slate-400">SNAPSHOT</span>
                </div>

                <div className="mt-5">
                  <p className="text-[0.86rem] uppercase tracking-[0.06em] text-slate-500">{kpi.label}</p>
                  <h3 className="mt-3 text-[1.95rem] font-semibold text-slate-950">{kpi.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-[1.2rem] border border-[#d8dee7] bg-white p-6 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.78rem] uppercase tracking-[0.14em] text-slate-400">BOOKING DESK</p>
                <h3 className="mt-2 text-[1.95rem] font-semibold text-slate-950">Bookings at a glance</h3>
                <p className="mt-3 max-w-2xl text-[0.98rem] leading-7 text-slate-500">
                  Keep the office team focused on fresh reservations, payment follow-up, and the next booking action without leaving the dashboard.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/bookings/new')}
                  className="inline-flex items-center gap-2 rounded-full bg-[#6d8141] px-4 py-2.5 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#566633]"
                >
                  <CirclePlus size={18} />
                  New Booking
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/bookings')}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d8dee7] px-4 py-2.5 text-[0.95rem] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  View All
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {bookingStatusSummary.map((item) => (
                <div key={item.label} className="rounded-[1rem] border border-[#e7ebf0] bg-[#fbfcfd] px-4 py-4">
                  <span className={clsx('inline-flex rounded-full px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.08em]', item.tone)}>
                    {item.label}
                  </span>
                  <p className="mt-4 text-[2rem] font-semibold leading-none text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
              <div className="rounded-[1rem] border border-[#e7ebf0] bg-[#fcfdfc] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.76rem] uppercase tracking-[0.12em] text-slate-400">RECENT BOOKINGS</p>
                    <p className="mt-2 text-[1.2rem] font-semibold text-slate-950">Newest reservations</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.78rem] font-medium text-slate-500">
                    {bookingActivity.length} items
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {bookingActivity.length > 0 ? bookingActivity.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => navigate(`/bookings/${item.id}`)}
                      className="flex w-full items-start gap-4 rounded-[1rem] border border-[#e7ebf0] bg-white px-4 py-4 text-left transition-all hover:border-[#cfd9e6] hover:bg-slate-50"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9fbf2] text-[#17a86b]">
                        <Calendar size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[1rem] font-semibold text-slate-950">{item.title}</p>
                          <span className={clsx(
                            'rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em]',
                            statusToneMap[item.status] || 'bg-slate-100 text-slate-600'
                          )}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-[0.96rem] text-slate-500">{item.subtitle}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.88rem] text-slate-500">
                          <span>{formatMoney(item.currency || 'USD', item.amount)}</span>
                          <span>{formatActivityDate(item.date)}</span>
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-[1rem] border border-[#e7ebf0] bg-white px-4 py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Clock3 size={22} />
                      </div>
                      <p className="mt-4 text-[1.1rem] font-medium text-slate-700">No recent bookings yet</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1rem] border border-[#e7ebf0] bg-[#fbfcfd] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.76rem] uppercase tracking-[0.12em] text-slate-400">FOLLOW-UP</p>
                    <p className="mt-2 text-[1.2rem] font-semibold text-slate-950">Payments tied to bookings</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/finance/payments')}
                    className="text-[0.92rem] font-medium text-[#6d8141] transition-colors hover:text-[#52632f]"
                  >
                    Open payments
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {paymentActivity.length > 0 ? paymentActivity.map((item) => {
                    const presentation = activityPresentation[item.type];
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => navigate(presentation.destination(item))}
                        className="flex w-full items-center gap-4 rounded-[1rem] border border-[#e7ebf0] bg-white px-4 py-4 text-left transition-all hover:border-[#cfd9e6] hover:bg-slate-50"
                      >
                        <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', presentation.iconWrap)}>
                          {React.createElement(presentation.icon, { size: 20 })}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.98rem] font-semibold text-slate-950">{item.title}</p>
                          <p className="mt-1 truncate text-[0.92rem] text-slate-500">{item.subtitle}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-[0.95rem] font-semibold text-slate-950">{formatMoney(item.currency || 'USD', item.amount)}</p>
                          <p className="mt-1 text-[0.82rem] text-slate-500">{formatActivityDate(item.date)}</p>
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="rounded-[1rem] border border-dashed border-[#d8dee7] bg-white px-4 py-10 text-center">
                      <p className="text-[1rem] font-medium text-slate-700">No booking payments have landed yet</p>
                      <p className="mt-2 text-[0.92rem] text-slate-500">
                        Payment activity will appear here as soon as receipts start coming in.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.2rem] border border-[#d8dee7] bg-white p-6 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
            <p className="text-[0.78rem] uppercase tracking-[0.14em] text-slate-400">ACTION CENTER</p>
            <h3 className="mt-3 text-[1.8rem] font-semibold text-slate-950">Quick Actions</h3>

            <div className="mt-5 space-y-3">
              {quickActions.map((action, idx) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + idx * 0.05 }}
                  onClick={() => navigate(action.path)}
                  className={clsx(
                    'flex w-full items-center gap-4 rounded-[0.95rem] px-4 py-4 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5',
                    action.tone
                  )}
                >
                  <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', action.iconBg)}>
                    <action.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[1rem] font-semibold">{action.label}</p>
                    <p className="text-[0.92rem] text-white/90">{action.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-[#b7edd7] bg-[#eefcf4] p-6">
            <div className="flex items-center gap-2 text-[0.78rem] uppercase tracking-[0.14em] text-[#0f9f69]">
              <Activity size={14} />
              OPERATIONAL NOTE
            </div>
            <h4 className="mt-3 text-[1.75rem] font-semibold text-slate-950">Daily visibility is set</h4>
            <p className="mt-4 text-[1rem] leading-8 text-slate-600">
              This dashboard is ready for daily office monitoring, with finance, bookings, and client actions kept one click away.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
