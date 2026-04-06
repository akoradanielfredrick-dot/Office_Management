import {
  Activity,
  BarChart3,
  Boxes,
  Calendar,
  Clock3,
  Compass,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type PortalModuleKey =
  | 'dashboard'
  | 'bookings'
  | 'catalog'
  | 'products'
  | 'excursions'
  | 'schedules'
  | 'availability'
  | 'integrations'
  | 'reservations'
  | 'payments'
  | 'expenses'
  | 'analytics'
  | 'clients';

export const PORTAL_MODULES: Array<{
  key: PortalModuleKey;
  label: string;
  path: string;
  icon: LucideIcon;
}> = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'bookings', label: 'Bookings', path: '/bookings', icon: Calendar },
  { key: 'catalog', label: 'Catalog', path: '/catalog', icon: Boxes },
  { key: 'products', label: 'Products', path: '/products', icon: Boxes },
  { key: 'excursions', label: 'Excursions', path: '/excursions', icon: Compass },
  { key: 'schedules', label: 'Schedules', path: '/schedules', icon: Clock3 },
  { key: 'availability', label: 'Availability', path: '/availability', icon: ShieldCheck },
  { key: 'integrations', label: 'Integrations', path: '/integrations', icon: Activity },
  { key: 'reservations', label: 'Reservations', path: '/reservations', icon: ShieldAlert },
  { key: 'payments', label: 'Payments', path: '/finance/payments', icon: Wallet },
  { key: 'expenses', label: 'Expenses', path: '/finance/expenses', icon: ShoppingCart },
  { key: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { key: 'clients', label: 'Clients', path: '/clients', icon: Users },
];

export const MODULE_PERMISSION_MAP = Object.fromEntries(
  PORTAL_MODULES.map((module) => [module.key, `${module.key}.view`]),
) as Record<PortalModuleKey, string>;

export const HOME_MODULE_ORDER: PortalModuleKey[] = PORTAL_MODULES.map((module) => module.key);
