import { api } from './api';

const FALLBACK_FILE_EXTENSION_BY_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

const sanitizeFilename = (value: string): string => value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();

const extractFilename = (contentDisposition?: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return sanitizeFilename(decodeURIComponent(utfMatch[1]));
  }

  const asciiMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (asciiMatch?.[1]) {
    return sanitizeFilename(asciiMatch[1]);
  }

  return null;
};

const ensureFileExtension = (filename: string, contentType?: string): string => {
  if (/\.[a-z0-9]+$/i.test(filename)) {
    return filename;
  }

  const normalizedType = contentType?.split(';')[0].trim().toLowerCase() || '';
  const extension = FALLBACK_FILE_EXTENSION_BY_TYPE[normalizedType];
  return extension ? `${filename}.${extension}` : filename;
};

const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
};

export const downloadApiFile = async (path: string, fallbackFilename: string) => {
  const response = await api.get(path, {
    responseType: 'blob',
  });

  const contentType = response.headers['content-type'];
  const contentDisposition = response.headers['content-disposition'];
  const filename = ensureFileExtension(
    extractFilename(contentDisposition) || sanitizeFilename(fallbackFilename),
    contentType
  );

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType || 'application/octet-stream' });
  triggerBrowserDownload(blob, filename);
};

const escapeCsvCell = (value: string | number | null | undefined): string => {
  const normalized = value == null ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

export const downloadCsvFile = (
  filename: string,
  columns: string[],
  rows: Array<Array<string | number | null | undefined>>
) => {
  const csvContent = [
    columns.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' });
  triggerBrowserDownload(blob, ensureFileExtension(sanitizeFilename(filename), 'text/csv'));
};
