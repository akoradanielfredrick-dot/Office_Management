import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  BarChart3,
  ShoppingCart,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  UserRound,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api, backendAdminUrl } from '../../lib/api';

const mrangaLogo = '/mranga-brand.jpeg';

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

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Bookings', path: '/bookings', icon: Calendar },
    { label: 'Payments', path: '/finance/payments', icon: Wallet },
    { label: 'Expenses', path: '/finance/expenses', icon: ShoppingCart },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Clients', path: '/clients', icon: Users },
  ];

  const firstName = user?.full_name?.split(' ')[0] ?? 'User';
  const roleLabel = normalizeRoleLabel(user?.role);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await api.post('/auth/logout/');
    } catch {
      // Keep local sign-out reliable even if the backend session already expired.
    } finally {
      logout();
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900 lg:flex lg:h-screen lg:overflow-hidden">
      <aside className="hidden h-screen w-[16.1rem] shrink-0 border-r border-[#d8dee7] bg-white lg:flex lg:flex-col lg:overflow-hidden">
        <div className="flex min-h-[11.9rem] items-center justify-center border-b border-[#d8dee7] px-6 py-6">
          <img
            src={mrangaLogo}
            alt="Mranga Tours & Safaris Ltd."
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-2xl px-4 py-3 text-[1rem] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-[#fbf6df] text-[#4a5f2f]'
                        : 'text-slate-700 hover:bg-slate-50'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={clsx(
                          'flex h-9 w-9 items-center justify-center rounded-xl',
                          isActive ? 'text-[#6a8240]' : 'text-slate-500'
                        )}
                      >
                        <item.icon size={20} strokeWidth={1.8} />
                      </div>
                      <span className="flex-1">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="border-t border-[#d8dee7] p-4">
            <div className="rounded-[1.55rem] border border-[#d8dee7] bg-white p-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.3)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#627c3a] text-sm font-bold text-white">
                  {firstName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.02rem] font-semibold text-slate-900">{user?.full_name}</p>
                  <p className="mt-0.5 text-sm uppercase tracking-[0.08em] text-slate-500">{roleLabel}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={isSigningOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-base font-medium text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-70"
              >
                <LogOut size={18} />
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col lg:h-screen lg:min-h-0 lg:overflow-y-auto">
        <header className="sticky top-0 z-40 border-b border-[#d8dee7] bg-white">
          <div className="flex min-h-[5.7rem] items-center justify-between gap-4 px-8">
            <div>
              <div className="flex items-center gap-2 text-[0.95rem] font-medium text-slate-500">
                <span>Workspace</span>
                <ChevronRight size={14} />
                <span>Managerial Portal</span>
              </div>
              <h2 className="mt-1 text-[2.05rem] font-semibold tracking-tight text-slate-950">
                Welcome, {firstName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl px-3 py-2 text-right">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Active Role
                </p>
                <p className="mt-1 text-[1.02rem] font-semibold text-slate-950">{roleLabel}</p>
              </div>

              <a
                href={backendAdminUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[0.95rem] border border-[#cfd6e0] bg-white px-5 py-3 text-[1rem] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <ShieldCheck size={17} className="text-[#6a8240]" />
                <span>Admin</span>
                <ExternalLink size={15} className="text-slate-400" />
              </a>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <UserRound size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
