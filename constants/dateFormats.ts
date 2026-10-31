import { format, isValid, parse } from 'date-fns';

export type DateFormatId =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'DD MMM YYYY'
  | 'MMM DD, YYYY';

export const DATE_FORMATS: { id: DateFormatId; label: string; example: string }[] = [
  { id: 'DD/MM/YYYY',   label: 'DD/MM/YYYY',   example: '28/03/2026' },
  { id: 'MM/DD/YYYY',   label: 'MM/DD/YYYY',   example: '03/28/2026' },
  { id: 'YYYY-MM-DD',   label: 'YYYY-MM-DD',   example: '2026-03-28' },
  { id: 'DD MMM YYYY',  label: 'DD MMM YYYY',  example: '28 Mar 2026' },
  { id: 'MMM DD, YYYY', label: 'MMM DD, YYYY', example: 'Mar 28, 2026' },
];

export const DEFAULT_DATE_FORMAT: DateFormatId = 'DD/MM/YYYY';

/** The date-fns pattern behind each display format. */
const PATTERNS: Record<DateFormatId, string> = {
  'DD/MM/YYYY':   'dd/MM/yyyy',
  'MM/DD/YYYY':   'MM/dd/yyyy',
  'YYYY-MM-DD':   'yyyy-MM-dd',
  'DD MMM YYYY':  'dd MMM yyyy',
  'MMM DD, YYYY': 'MMM dd, yyyy',
};

export function formatDate(dateString: string, dateFormat: DateFormatId = DEFAULT_DATE_FORMAT): string {
  // Strict parse: anything that is not a real YYYY-MM-DD day is shown as it came.
  const date = parse(dateString, 'yyyy-MM-dd', new Date());
  return isValid(date) ? format(date, PATTERNS[dateFormat]) : dateString;
}

export function isValidDateFormat(value: string): value is DateFormatId {
  return DATE_FORMATS.some((f) => f.id === value);
}
