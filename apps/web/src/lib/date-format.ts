export const UK_DATE_LOCALE = 'en-GB';

type DateInput = string | number | Date | null | undefined;

function parseDateInput(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number];
    return new Date(year, month - 1, day);
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions,
  fallback = '—',
): string {
  const date = parseDateInput(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(UK_DATE_LOCALE, options).format(date);
}

export function formatShortDate(value: DateInput, fallback = '—'): string {
  return formatDate(
    value,
    { day: '2-digit', month: '2-digit', year: 'numeric' },
    fallback,
  );
}

export function formatShortDateTime(value: DateInput, fallback = '—'): string {
  return formatDate(
    value,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    fallback,
  );
}
