import axios from 'axios';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const resolveBackendOrigin = (): string => {
  const configuredOrigin = import.meta.env.VITE_BACKEND_ORIGIN;
  if (configuredOrigin) {
    return trimTrailingSlash(configuredOrigin);
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }

  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const resolveApiBaseUrl = (): string => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl) {
    return trimTrailingSlash(configuredApiBaseUrl);
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000/api';
  }

  return '/api';
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

export const backendAdminUrl = `${resolveBackendOrigin()}/admin/`;
export const backendAdminConfirmUrl = `${resolveBackendOrigin()}/admin/confirm-access/?next=/admin/`;

export const toNumber = (value: number | string | null | undefined): number => Number(value || 0);

export const formatMoney = (currency: string | undefined, value: number | string | null | undefined): string =>
  `${currency || 'KES'} ${toNumber(value).toLocaleString()}`;
