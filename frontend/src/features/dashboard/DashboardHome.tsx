import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CirclePlus,
  Wallet,
  ShoppingCart,
  ChevronRight,
  Clock3,
  ShieldCheck,
  CreditCard,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { api, formatMoney } from '../../lib/api';
import type { PortalModuleKey } from '../../lib/portalAccess';

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
    iconWrap: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
    destination: (item) => `/bookings/${item.id}`,
  },
  PAYMENT: {
    icon: Wallet,
    iconWrap: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]',
    destination: (item) => item.booking_id ? `/bookings/${item.booking_id}` : '/finance/payments',
  },
};

const statusToneMap: Record<string, string> = {
  CONFIRMED: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]',
  PENDING: 'bg-[var(--color-accent-soft)] text-[var(--color-warning)]',
  ONGOING: 'bg-[var(--color-primary-tint)] text-[var(--color-primary)]',
  COMPLETED: 'bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)]',
  CANCELLED: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  FAILED: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  AMENDED: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]',
  RECEIVED: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]',
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
  const canAccessModule = (moduleKey: PortalModuleKey) => Boolean(user?.is_management || user?.portal_permissions.includes(`${moduleKey}.view`));
  const canAccessBookings = canAccessModule('bookings');
  const canAccessPayments = canAccessModule('payments');
  const canAccessClients = canAccessModule('clients');
  const monthlyExpenseBreakdown = operatingCurrencies.map((currency) => ({
    currency,
    value: Number(stats?.expenses_this_month_by_currency?.[currency]) || 0,
  }));
  const bookingActivity = canAccessBookings ? activity.filter((item) => item.type === 'BOOKING') : [];
  const paymentActivity = canAccessPayments ? activity.filter((item) => item.type === 'PAYMENT') : [];
  const bookingStatusSummary = [
    {
      label: 'Confirmed',
      value: stats?.active_bookings ?? 0,
      tone: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]',
    },
    {
      label: 'Awaiting payment',
      value: stats?.pending_payments ?? 0,
      tone: 'bg-[var(--color-accent-soft)] text-[var(--color-warning)]',
    },
    {
      label: 'Recently created',
      value: bookingActivity.length,
      tone: 'bg-[var(--color-primary-tint)] text-[var(--color-primary)]',
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
      value: canAccessClients ? stats?.total_clients ?? 0 : 'Hidden',
      icon: Users,
      iconWrap: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
    },
    {
      label: 'Active Bookings',
      value: canAccessBookings ? stats?.active_bookings ?? 0 : 'Hidden',
      icon: Calendar,
      iconWrap: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
    },
    {
      label: 'Pending Payments',
      value: canAccessPayments ? stats?.pending_payments ?? 0 : 'Hidden',
      icon: CreditCard,
      iconWrap: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]',
    },
    {
      label: 'Monthly Expenses',
      value: monthlyExpenseBreakdown.map(({ currency, value }) => `${currency} ${value.toLocaleString()}`).join(' | '),
      icon: ShoppingCart,
      iconWrap: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[90rem] space-y-8 pb-12">
      <section className="grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.45rem] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-hover)_58%,var(--color-primary-strong)_100%)] px-8 py-8 text-white shadow-[0_24px_40px_-28px_rgba(111,130,5,0.62)]"
        >
          <div className="max-w-4xl">
            <h1 className="text-[2.85rem] font-semibold tracking-tight text-white">
              Welcome back, {firstName}
            </h1>
            <p className="mt-3 text-[1.02rem] font-medium text-white/92">
              Keep bookings moving, monitor cashflow, and stay on top of operations from one central safari-branded workspace.
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
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="brand-panel p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.78rem] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">SYSTEM HEALTH</p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-tight text-[var(--color-primary-strong)]">
                All core services are stable
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <ShieldCheck size={22} />
            </div>
          </div>

          <div className="mt-7 space-y-4">
            <div className="rounded-[1rem] bg-[var(--color-surface-soft)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[1rem] font-medium text-[var(--color-text-primary)]">Session Access</p>
                <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[0.78rem] font-medium uppercase tracking-[0.05em] text-[var(--color-primary)]">
                  ACTIVE
                </span>
              </div>
              <p className="mt-3 text-[0.98rem] leading-8 text-[var(--color-text-secondary)]">
                Authenticated workspace access is available for operational tasks.
              </p>
            </div>

            <div className="rounded-[1rem] bg-[var(--color-surface-soft)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[1rem] font-medium text-[var(--color-text-primary)]">Finance Visibility</p>
                <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-[0.78rem] font-medium uppercase tracking-[0.05em] text-[var(--color-accent-hover)]">
                  LIVE
                </span>
              </div>
              <p className="mt-3 text-[0.98rem] leading-8 text-[var(--color-text-secondary)]">
                Dashboard summaries and transaction monitoring are connected.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 + idx * 0.05 }}
              className="brand-panel p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className={clsx('flex h-12 w-12 items-center justify-center rounded-xl', kpi.iconWrap)}>
                  <kpi.icon size={22} />
                </div>
                <span className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">SNAPSHOT</span>
              </div>

              <div className="mt-5">
                <p className="text-[0.86rem] uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">{kpi.label}</p>
                <h3
                  className={clsx(
                    'mt-3 font-semibold text-[var(--color-primary-strong)]',
                    kpi.label === 'Monthly Expenses'
                      ? 'text-[1.2rem] leading-8 tracking-tight md:text-[1.35rem]'
                      : 'text-[1.95rem]'
                  )}
                >
                  {kpi.value}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        {canAccessBookings || canAccessPayments ? (
          <div className="brand-panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.78rem] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">BOOKING DESK</p>
                <h3 className="mt-2 text-[1.95rem] font-semibold text-[var(--color-primary-strong)]">Bookings at a glance</h3>
              </div>

              <div className="flex flex-wrap gap-3">
                {canAccessBookings ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/bookings/new')}
                      className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.95rem] font-medium"
                    >
                      <CirclePlus size={18} />
                      New Booking
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/bookings')}
                      className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.95rem] font-medium"
                    >
                      View All
                      <ChevronRight size={18} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {canAccessBookings ? (
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {bookingStatusSummary.map((item) => (
                  <div key={item.label} className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-4">
                    <span className={clsx('inline-flex rounded-full px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.08em]', item.tone)}>
                      {item.label}
                    </span>
                    <p className="mt-4 text-[2rem] font-semibold leading-none text-[var(--color-primary-strong)]">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={clsx('mt-6 grid gap-4', canAccessBookings && canAccessPayments ? 'xl:grid-cols-[1.2fr_0.9fr]' : 'xl:grid-cols-1')}>
              {canAccessBookings ? (
                <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">RECENT BOOKINGS</p>
                      <p className="mt-2 text-[1.2rem] font-semibold text-[var(--color-primary-strong)]">Newest reservations</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-[0.78rem] font-medium text-[var(--color-primary)]">
                      {bookingActivity.length} items
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {bookingActivity.length > 0 ? bookingActivity.map((item) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => navigate(`/bookings/${item.id}`)}
                        className="flex w-full items-start gap-4 rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-4 text-left transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-primary-tint)]"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                          <Calendar size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[1rem] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                            <span className={clsx(
                              'rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em]',
                              statusToneMap[item.status] || 'bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)]'
                            )}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-[0.96rem] text-[var(--color-text-secondary)]">{item.subtitle}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.88rem] text-[var(--color-text-secondary)]">
                            <span>{formatMoney(item.currency || 'USD', item.amount)}</span>
                            <span>{formatActivityDate(item.date)}</span>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <div className="rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                          <Clock3 size={22} />
                        </div>
                        <p className="mt-4 text-[1.1rem] font-medium text-[var(--color-text-primary)]">No recent bookings yet</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {canAccessPayments ? (
                <div className="rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">FOLLOW-UP</p>
                      <p className="mt-2 text-[1.2rem] font-semibold text-[var(--color-primary-strong)]">Payments tied to bookings</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/finance/payments')}
                      className="text-[0.92rem] font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
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
                          className="flex w-full items-center gap-4 rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-4 text-left transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-accent-soft)]"
                        >
                          <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', presentation.iconWrap)}>
                            {React.createElement(presentation.icon, { size: 20 })}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.98rem] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                            <p className="mt-1 truncate text-[0.92rem] text-[var(--color-text-secondary)]">{item.subtitle}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-[0.95rem] font-semibold text-[var(--color-text-primary)]">{formatMoney(item.currency || 'USD', item.amount)}</p>
                            <p className="mt-1 text-[0.82rem] text-[var(--color-text-secondary)]">{formatActivityDate(item.date)}</p>
                          </div>
                        </button>
                      );
                    }) : (
                      <div className="rounded-[1rem] border border-dashed border-[var(--color-border-strong)] bg-white px-4 py-10 text-center">
                        <p className="text-[1rem] font-medium text-[var(--color-text-primary)]">No booking payments have landed yet</p>
                        <p className="mt-2 text-[0.92rem] text-[var(--color-text-secondary)]">
                          Payment activity will appear here as soon as receipts start coming in.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="brand-panel p-6">
            <p className="text-[0.78rem] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">WORKSPACE</p>
            <h3 className="mt-2 text-[1.95rem] font-semibold text-[var(--color-primary-strong)]">Dashboard overview</h3>
            <p className="mt-3 max-w-2xl text-[0.98rem] leading-7 text-[var(--color-text-secondary)]">
              Your account is active, but booking and finance modules have not been assigned yet. Contact your administrator if you need those work areas added to your portal.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
