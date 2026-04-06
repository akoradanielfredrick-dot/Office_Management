import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const DEFAULT_BACKEND_ORIGIN = 'https://office-management-drab.vercel.app';

const resolveBackendOrigin = (): string => {
  const configuredOrigin = import.meta.env.VITE_BACKEND_ORIGIN;
  if (configuredOrigin) {
    return trimTrailingSlash(configuredOrigin);
  }

  return DEFAULT_BACKEND_ORIGIN;
};

const resolveApiBaseUrl = (): string => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl) {
    return trimTrailingSlash(configuredApiBaseUrl);
  }

  return '/api';
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method || 'get').toLowerCase();
  const csrfUnsafeMethod = ['post', 'put', 'patch', 'delete'].includes(method);
  const csrfToken = getCookie('csrftoken');

  if (csrfUnsafeMethod && csrfToken) {
    config.headers.set('X-CSRFToken', csrfToken);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const detail = error?.response?.data?.detail;
    const shouldLogout =
      status === 401
      || code === 'account_blocked'
      || code === 'account_revoked';

    if (shouldLogout) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const redirectReason = typeof detail === 'string' && detail ? `?message=${encodeURIComponent(detail)}` : '';
        window.location.assign(`/login${redirectReason}`);
      }
    }

    return Promise.reject(error);
  },
);

export const ensureCsrfCookie = async (): Promise<void> => {
  await api.get('/auth/csrf/');
};

export const backendAdminUrl = `${resolveBackendOrigin()}/admin/`;
export const backendAdminConfirmUrl = `${resolveBackendOrigin()}/admin/confirm-access/?next=/admin/`;
export const buildBackendApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${resolveBackendOrigin()}/api${normalizedPath}`;
};

export const toNumber = (value: number | string | null | undefined): number => Number(value || 0);

export const formatMoney = (currency: string | undefined, value: number | string | null | undefined): string =>
  `${currency || 'USD'} ${toNumber(value).toLocaleString()}`;
