import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortalModuleKey } from '../lib/portalAccess';

export type UserRole = 'SUPER_ADMIN' | 'DIRECTOR' | 'OPERATIONS' | 'ACCOUNTS' | 'SALES' | 'STAFF';
export type UserStatus = 'active' | 'blocked' | 'revoked';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
   phone?: string;
   status: UserStatus;
   portal_permissions: string[];
   portal_modules: PortalModuleKey[];
   is_management: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  syncUser: (user: User) => void;
  logout: () => void;
}

const STORAGE_KEY = 'oms-auth-storage';

const normalizeUser = (value: unknown): User | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id : '';
  const email = typeof candidate.email === 'string' ? candidate.email : '';
  const fullName = typeof candidate.full_name === 'string' ? candidate.full_name : '';
  const phone = typeof candidate.phone === 'string' ? candidate.phone : undefined;
  const rawRole = typeof candidate.role === 'string'
    ? candidate.role
    : candidate.role && typeof candidate.role === 'object' && 'name' in candidate.role
      ? String((candidate.role as { name?: unknown }).name ?? '')
      : '';
  const status = candidate.status === 'blocked' || candidate.status === 'revoked' ? candidate.status : 'active';
  const portalPermissions = Array.isArray(candidate.portal_permissions)
    ? candidate.portal_permissions.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const portalModules = Array.isArray(candidate.portal_modules)
    ? candidate.portal_modules.filter((entry): entry is PortalModuleKey => typeof entry === 'string')
    : [];
  const isManagement = candidate.is_management === true;

  if (!id || !email || !fullName) {
    return null;
  }

  return {
    id,
    email,
    full_name: fullName,
    phone,
    role: (rawRole || 'STAFF') as UserRole,
    status,
    portal_permissions: portalPermissions,
    portal_modules: portalModules,
    is_management: isManagement,
  };
};

const readPersistedAuth = (): Pick<AuthState, 'user' | 'isAuthenticated'> | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { state?: { user?: unknown; isAuthenticated?: unknown } };
    const user = normalizeUser(parsed?.state?.user);
    const isAuthenticated = parsed?.state?.isAuthenticated === true && !!user;

    if (!user || !isAuthenticated) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return { user, isAuthenticated };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      syncUser: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: STORAGE_KEY,
      merge: (persistedState, currentState) => {
        const safeState = readPersistedAuth();
        if (!safeState) {
          return currentState;
        }

        return {
          ...currentState,
          ...safeState,
        };
      },
    }
  )
);
