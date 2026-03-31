import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const resolveBackendOrigin = (): string => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }

  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

export const backendAdminUrl = `${resolveBackendOrigin()}/admin/`;
export const backendAdminConfirmUrl = `${resolveBackendOrigin()}/admin/confirm-access/?next=/admin/`;

export const toNumber = (value: number | string | null | undefined): number => Number(value || 0);

export const formatMoney = (currency: string | undefined, value: number | string | null | undefined): string =>
  `${currency || 'KES'} ${toNumber(value).toLocaleString()}`;
