import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LogOut,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  UserRound,
  Menu,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api, backendAdminConfirmUrl } from '../../lib/api';
import { PORTAL_MODULES } from '../../lib/portalAccess';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const firstName = user?.full_name?.split(' ')[0] ?? 'User';
  const roleLabel = normalizeRoleLabel(user?.role);
  const navItems = React.useMemo(() => {
    if (!user) {
      return [];
    }

    if (user.is_management) {
      return PORTAL_MODULES;
    }

    return PORTAL_MODULES.filter((item) => user.portal_permissions.includes(`${item.key}.view`));
  }, [user]);

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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="dashboard-shell min-h-screen text-[var(--color-text-primary)] lg:flex lg:h-screen lg:overflow-hidden">
      <div className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[0_10px_20px_-18px_rgba(111,130,5,0.45)]">
              <img
                src={mrangaLogo}
                alt="Mranga Tours & Safaris Ltd."
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Mranga Safari Portal</p>
              <p className="truncate text-base font-bold text-[var(--color-primary-strong)]">{firstName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[0_12px_20px_-18px_rgba(111,130,5,0.6)] transition-colors hover:bg-[var(--color-primary-soft)]"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div className="mt-4 space-y-4 rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_22px_40px_-28px_rgba(111,130,5,0.35)]">
            <div className="rounded-[1.2rem] bg-[var(--color-primary-tint)] px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Signed In As</p>
              <p className="mt-2 text-base font-bold text-[var(--color-primary-strong)]">{user?.full_name}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">{roleLabel}</p>
            </div>

            <nav className="grid gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all',
                      isActive
                        ? 'bg-[var(--color-accent)] text-[var(--color-primary-strong)] shadow-[0_16px_28px_-20px_rgba(255,162,3,0.7)]'
                        : 'bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-strong)]'
                    )
                  }
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="grid gap-2 sm:grid-cols-2">
              {user?.is_management ? (
                <a
                  href={backendAdminConfirmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold"
                >
                  <ShieldCheck size={16} className="text-[var(--color-primary)]" />
                  <span>Admin</span>
                </a>
              ) : null}

              <button
                onClick={handleLogout}
                disabled={isSigningOut}
                className={clsx(
                  'inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-70',
                  user?.is_management ? '' : 'sm:col-span-2',
                )}
              >
                <LogOut size={16} />
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="hidden h-screen w-[16.1rem] shrink-0 bg-[linear-gradient(180deg,var(--color-sidebar-bg)_0%,var(--color-primary-strong)_100%)] lg:flex lg:flex-col lg:overflow-hidden">
        <div className="flex min-h-[11.9rem] items-center justify-center border-b border-white/10 px-6 py-6">
          <img
            src={mrangaLogo}
            alt="Mranga Tours & Safaris Ltd."
            className="max-h-full max-w-full rounded-[1.8rem] bg-white/95 p-3 object-contain shadow-[0_18px_32px_-24px_rgba(0,0,0,0.45)]"
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
                        ? 'bg-[var(--color-accent)] text-[var(--color-primary-strong)] shadow-[0_18px_30px_-24px_rgba(255,162,3,0.82)]'
                        : 'text-[var(--color-sidebar-text)] hover:bg-white/10'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={clsx(
                          'flex h-9 w-9 items-center justify-center rounded-xl',
                          isActive ? 'text-[var(--color-primary-strong)]' : 'text-[var(--color-sidebar-muted)]'
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

          <div className="border-t border-white/10 p-4">
            <div className="rounded-[1.55rem] border border-white/10 bg-white/8 p-4 shadow-[0_18px_32px_-24px_rgba(0,0,0,0.4)] backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-[var(--color-primary-strong)]">
                  {firstName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.02rem] font-semibold text-[var(--color-sidebar-text)]">{user?.full_name}</p>
                  <p className="mt-0.5 text-sm uppercase tracking-[0.08em] text-[var(--color-sidebar-muted)]">{roleLabel}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={isSigningOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/6 px-3 py-2.5 text-base font-medium text-white transition-colors hover:bg-white/12 disabled:opacity-70"
              >
                <LogOut size={18} />
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col pb-24 lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:pb-0">
        <header className="sticky top-0 z-40 hidden border-b border-[var(--color-border)] bg-white/92 backdrop-blur lg:block">
          <div className="flex min-h-[5.7rem] items-center justify-between gap-4 px-8">
            <div>
              <div className="flex items-center gap-2 text-[0.95rem] font-medium text-[var(--color-text-secondary)]">
                <span>Workspace</span>
                <ChevronRight size={14} />
                <span>Mranga Operations</span>
              </div>
              <h2 className="mt-1 text-[2.05rem] font-semibold tracking-tight text-[var(--color-primary-strong)]">
                Welcome, {firstName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--color-surface-soft)] px-3 py-2 text-right">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Active Role
                </p>
                <p className="mt-1 text-[1.02rem] font-semibold text-[var(--color-text-primary)]">{roleLabel}</p>
              </div>

              {user?.is_management ? (
                <a
                  href={backendAdminConfirmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary inline-flex items-center gap-2 rounded-[0.95rem] px-5 py-3 text-[1rem] font-medium"
                >
                  <ShieldCheck size={17} className="text-[var(--color-primary)]" />
                  <span>Admin</span>
                  <ExternalLink size={15} className="text-[var(--color-text-muted)]" />
                </a>
              ) : null}

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <UserRound size={18} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      <nav className={clsx('fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white/95 px-2 py-2 backdrop-blur lg:hidden', !navItems.length ? 'hidden' : '')}>
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition-all',
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-primary-strong)]'
                    : 'text-[var(--color-text-muted)]'
                )
              }
            >
              <item.icon size={18} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
