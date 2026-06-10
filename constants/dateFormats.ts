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

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDate(dateString: string, format: DateFormatId = DEFAULT_DATE_FORMAT): string {
  const m = DATE_RE.exec(dateString);
  if (!m) return dateString;
  const [, yyyy, mm, dd] = m;
  const mIdx = parseInt(mm, 10) - 1;
  if (mIdx < 0 || mIdx > 11) return dateString;
  const mmm = MONTH_SHORT[mIdx];
  switch (format) {
    case 'DD/MM/YYYY':   return `${dd}/${mm}/${yyyy}`;
    case 'MM/DD/YYYY':   return `${mm}/${dd}/${yyyy}`;
    case 'YYYY-MM-DD':   return `${yyyy}-${mm}-${dd}`;
    case 'DD MMM YYYY':  return `${dd} ${mmm} ${yyyy}`;
    case 'MMM DD, YYYY': return `${mmm} ${dd}, ${yyyy}`;
  }
}

export function isValidDateFormat(value: string): value is DateFormatId {
  return DATE_FORMATS.some((f) => f.id === value);
}
