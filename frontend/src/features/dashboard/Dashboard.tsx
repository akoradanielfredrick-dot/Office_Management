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
} from 'lucide-react';
import { clsx } from 'clsx';
import mrangaLogo from '../../assets/mranga-logo.png';
import { backendAdminUrl } from '../../lib/api';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Quotations', path: '/quotations', icon: Calculator },
    { label: 'Bookings', path: '/bookings', icon: Calendar },
    { label: 'Payments', path: '/finance/payments', icon: Wallet },
    { label: 'Expenses', path: '/finance/expenses', icon: ShoppingCart },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Clients', path: '/clients', icon: Users },
  ];

  const firstName = user?.full_name?.split(' ')[0] ?? 'User';
  const roleLabel = user?.role?.replace('_', ' ') ?? 'STAFF';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f7f3_0%,#f8fafc_18%,#f8fafc_100%)] text-slate-900 lg:flex">
      <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="relative overflow-hidden border-b border-slate-200 bg-primary-950 px-5 py-4 text-white">
          <div className="absolute inset-0 opacity-[0.08]" style={{
            backgroundImage:
              `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M14 14h4v4h-4zm0-14h4v4h-4zM0 14h4v4H0zm28 0h4v4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2.5 shadow-xl shadow-black/20 ring-1 ring-white/25">
              <img
                src={mrangaLogo}
                alt="Mranga Tours & Safaris Ltd."
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.34em] text-primary-200">
                Portal
              </p>
              <h1 className="mt-1 truncate text-sm font-black text-white">
                Mranga Tours &amp; Safaris
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-[linear-gradient(90deg,rgba(21,61,21,0.08),rgba(212,131,26,0.08))] text-primary-800 shadow-sm ring-1 ring-primary-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                'bg-slate-100 text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-700',
                'group-[.active]:bg-primary-100'
              )}>
                <item.icon size={18} />
              </div>
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-700 text-base font-black text-white shadow-lg shadow-primary-900/20">
                {firstName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{user?.full_name}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.22em] text-primary-700">
                  {roleLabel}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-600 transition-all duration-200 hover:bg-rose-50"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-xl lg:px-10">
          <div className="flex h-20 items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                <span>Workspace</span>
                <ChevronRight size={14} />
                <span className="font-semibold text-slate-500">Managerial Portal</span>
              </div>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Welcome, {firstName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={backendAdminUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-800 shadow-sm transition-all duration-200 hover:border-primary-300 hover:bg-primary-100"
              >
                <ShieldCheck size={16} />
                <span className="hidden sm:inline">Backend Admin</span>
                <span className="sm:hidden">Admin</span>
                <ExternalLink size={15} className="opacity-70" />
              </a>
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm sm:block">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-slate-400">
                  Active Role
                </p>
                <p className="text-sm font-bold text-slate-800">{roleLabel}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
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
