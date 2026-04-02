import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Wallet,
  ShoppingCart,
  ChevronRight,
  Plus,
  Clock3,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Receipt,
  Activity,
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
}

interface ActivityItem {
  type: 'BOOKING' | 'PAYMENT';
  id: string;
  title: string;
  subtitle: string;
  date: string;
  status: string;
  amount: number | string;
}

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
  icon: React.ComponentType<{ size?: number; className?: string }>;
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
    destination: () => '/finance/payments',
  },
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
      value: formatMoney('KES', stats?.expenses_this_month ?? 0),
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.78rem] uppercase tracking-[0.14em] text-slate-400">OPERATIONS FEED</p>
                <h3 className="mt-2 text-[1.95rem] font-semibold text-slate-950">Recent Activity</h3>
              </div>
              <button
                onClick={() => navigate('/bookings')}
                className="inline-flex items-center gap-2 text-[1rem] font-medium text-[#6d8141] transition-colors hover:text-[#52632f]"
              >
                View All
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mt-6">
              {activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.map((item) => (
                    (() => {
                      const presentation = activityPresentation[item.type];
                      if (!presentation) {
                        return null;
                      }

                      return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => navigate(presentation.destination(item))}
                      className="flex w-full items-center gap-4 rounded-[1rem] border border-[#e7ebf0] bg-white px-4 py-4 text-left transition-all hover:border-[#d6dde8] hover:bg-slate-50"
                    >
                      <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', presentation.iconWrap)}>
                        {React.createElement(presentation.icon, { size: 20 })}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[1rem] font-semibold text-slate-950">{item.title}</p>
                        <p className="truncate text-[0.98rem] text-slate-500">{item.subtitle}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-[1rem] font-semibold text-slate-950">{formatMoney('KES', item.amount)}</p>
                        <p className="text-[0.92rem] text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                    </button>
                      );
                    })()
                  ))}
                </div>
              ) : (
                <div className="rounded-[1rem] border border-[#e7ebf0] bg-white px-4 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Clock3 size={22} />
                  </div>
                  <p className="mt-4 text-[1.1rem] font-medium text-slate-700">No recent activity yet</p>
                </div>
              )}
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
