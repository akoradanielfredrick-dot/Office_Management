import axios from 'axios';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const normalizedBaseUrl = envBaseUrl
  ? (envBaseUrl.startsWith('http://') || envBaseUrl.startsWith('https://') ? envBaseUrl : `https://${envBaseUrl}`)
  : '/api';
const backendOrigin = normalizedBaseUrl === '/api'
  ? window.location.origin
  : normalizedBaseUrl.replace(/\/api\/?$/, '');

export const api = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
});

export const backendAdminUrl = `${backendOrigin}/admin/`;

export const toNumber = (value: number | string | null | undefined): number => Number(value || 0);

export const formatMoney = (currency: string | undefined, value: number | string | null | undefined): string =>
  `${currency || 'KES'} ${toNumber(value).toLocaleString()}`;
