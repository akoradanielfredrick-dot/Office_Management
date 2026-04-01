import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

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

export const ensureCsrfCookie = async (): Promise<void> => {
  await api.get('/auth/csrf/');
};

export const backendAdminUrl = `${resolveBackendOrigin()}/admin/`;
export const backendAdminConfirmUrl = `${resolveBackendOrigin()}/admin/confirm-access/?next=/admin/`;

export const toNumber = (value: number | string | null | undefined): number => Number(value || 0);

export const formatMoney = (currency: string | undefined, value: number | string | null | undefined): string =>
  `${currency || 'KES'} ${toNumber(value).toLocaleString()}`;
