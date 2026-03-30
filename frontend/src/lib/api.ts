import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const toNumber = (value: number | string | null | undefined): number => Number(value || 0);

export const formatMoney = (currency: string | undefined, value: number | string | null | undefined): string =>
  `${currency || 'KES'} ${toNumber(value).toLocaleString()}`;
