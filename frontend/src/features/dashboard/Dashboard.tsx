import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Users,
  Calculator,
  Calendar,
  Wallet,
  BarChart3,
  ShoppingCart,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Compass,
  Trees,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api, backendAdminConfirmUrl } from '../../lib/api';

const mrangaLogo = '/mranga-brand.jpeg';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Quotations', path: '/quotations', icon: Calculator },
    { label: 'Bookings', path: '/bookings', icon: Calendar },
    { label: 'Payments', path: '/finance/payments', icon: Wallet },
    { label: 'Expenses', path: '/finance/expenses', icon: ShoppingCart },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Clients', path: '/clients', icon: Users },
  ];

  const firstName = user?.full_name?.split(' ')[0] ?? 'Team';
  const roleLabel = user?.role?.replace(/_/g, ' ') ?? 'STAFF';

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await api.post('/auth/logout/');
    } catch {
      // Keep the local session cleanup predictable even if the backend already expired.
    } finally {
      logout();
      setIsSigningOut(false);
    }
  };

  return (
    <div className="dashboard-shell min-h-screen text-slate-900 lg:flex">
      <aside className="hidden h-screen w-[19rem] shrink-0 lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="relative flex h-full flex-col overflow-hidden border-r border-primary-950/30 bg-[linear-gradient(180deg,#0f2f14_0%,#14361a_100%)] text-white shadow-[18px_0_50px_-40px_rgba(8,36,13,0.65)]">
          <div className="relative z-10 border-b border-white/10 px-5 pb-6 pt-5">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-4 shadow-[0_24px_40px_-28px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center rounded-[1.1rem] bg-[#f6f0de] p-2 shadow-inner shadow-black/10 ring-1 ring-white/15">
                  <img
                    src={mrangaLogo}
                    alt="Mranga Tours & Safaris Ltd."
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <p className="eyebrow text-primary-200/90">
                    Portal
                  </p>
                  <h1 className="mt-1 text-[1.55rem] font-semibold leading-tight text-white">
                    Mranga Tours &amp; Safaris
                  </h1>
                  <p className="mt-1 text-sm font-medium text-primary-100/78">
                    Operations dashboard
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1.1rem] border border-white/10 bg-black/10 px-3 py-3">
                  <p className="eyebrow text-[0.58rem] text-primary-200/80">
                    Base
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">Kenya</p>
                </div>
                <div className="rounded-[1.1rem] border border-white/10 bg-black/10 px-3 py-3">
                  <p className="eyebrow text-[0.58rem] text-primary-200/80">
                    Access
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{roleLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex-1 px-4 py-5">
            <div className="mb-4 flex items-center gap-2 px-2 text-[0.65rem] font-extrabold uppercase tracking-[0.38em] text-primary-200/80">
              <Compass size={13} />
              Navigation
            </div>

            <nav className="space-y-2.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-[1.2rem] px-3 py-3 text-sm font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-[linear-gradient(90deg,rgba(243,225,174,0.18),rgba(255,255,255,0.08))] text-white shadow-[0_18px_30px_-24px_rgba(0,0,0,0.55)] ring-1 ring-[#d9c48d]/30'
                        : 'text-primary-50/82 hover:bg-white/8 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={clsx(
                          'flex h-10 w-10 items-center justify-center rounded-[0.95rem] transition-all duration-200',
                          isActive
                            ? 'bg-[#ecd9a4] text-primary-950 shadow-lg shadow-black/10'
                            : 'bg-white/10 text-primary-100 group-hover:bg-white/14'
                        )}
                      >
                        <item.icon size={18} />
                      </div>

                      <div className="flex-1">
                        <p className="text-[15px] font-extrabold">{item.label}</p>
                      </div>

                      <ChevronRight
                        size={16}
                        className={clsx(
                          'transition-all duration-200',
                          isActive ? 'translate-x-0 text-[#ecd9a4]' : 'translate-x-[-2px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="relative z-10 border-t border-white/10 p-4">
            <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ecd9a4] text-lg font-black text-primary-950 shadow-lg shadow-black/10">
                  {firstName.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">{user?.full_name}</p>
                  <p className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-primary-200/80">
                    {roleLabel}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-black/10 px-3 py-3">
                <div className="flex items-center gap-2 text-[0.62rem] font-extrabold uppercase tracking-[0.34em] text-primary-200/80">
                  <Trees size={12} />
                  Field Note
                </div>
                <p className="mt-2 text-sm font-medium leading-6 text-primary-50/85">
                  Keep quotations, bookings, finance, and client follow-ups in one guided workspace.
                </p>
              </div>

              <button
                onClick={handleLogout}
                disabled={isSigningOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1.1rem] border border-[#d9c48d]/40 bg-[#f3e1ae] px-4 py-3 text-sm font-black text-primary-950 transition-all duration-200 hover:bg-[#f0d894] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LogOut size={18} />
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-primary-900/6 bg-[linear-gradient(90deg,rgba(248,246,239,0.98),rgba(255,255,255,0.92),rgba(245,240,230,0.92))] px-6 backdrop-blur-xl lg:px-10">
          <div className="flex min-h-24 flex-col justify-center gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                <span>Workspace</span>
                <ChevronRight size={14} />
                <span className="font-semibold text-slate-500">Mranga Executive Desk</span>
              </div>
              <h2 className="mt-1 text-[2rem] font-semibold leading-tight text-slate-950">
                Welcome back, {firstName}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Safari operations, finance, and client activity in one workspace.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={backendAdminConfirmUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-primary-200 bg-white px-4 py-3 text-sm font-black text-primary-900 shadow-sm transition-all duration-200 hover:border-primary-300 hover:bg-primary-50"
              >
                <ShieldCheck size={16} />
                <span>Admin</span>
                <ExternalLink size={15} className="opacity-70" />
              </a>

              <div className="hidden rounded-[1.4rem] border border-slate-200 bg-white/90 px-4 py-2.5 text-right shadow-sm sm:block">
                <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.32em] text-slate-400">
                  Active Role
                </p>
                <p className="text-sm font-extrabold text-slate-900">{roleLabel}</p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-800 shadow-sm">
                <Users size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-6 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
