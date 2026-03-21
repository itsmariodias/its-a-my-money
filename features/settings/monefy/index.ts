/**
 * Monefy backup parser.
 *
 * Monefy exports a password-protected ZIP file containing a CSV.
 * Reference backup: monefy_backup_2026_03_15_16_59_05
 *
 * CSV columns (to be confirmed by inspecting the backup):
 * date, account, category, amount, currency, converted amount, currency, description
 *
 * TODO: implement full parsing once the CSV format is confirmed.
 */

export interface MonefyRecord {
  date: string;
  account: string;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
}

/**
 * Parse raw CSV text from a Monefy export into MonefyRecord[].
 * The CSV is expected to be unzipped before calling this function.
 */
export function parseMonefyCsv(csv: string): MonefyRecord[] {
  const lines = csv.trim().split('\n');
  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const cols = line.split(';');
    return {
      date: cols[0]?.trim() ?? '',
      account: cols[1]?.trim() ?? '',
      category: cols[2]?.trim() ?? '',
      amount: parseFloat(cols[3]?.replace(',', '.') ?? '0'),
      currency: cols[4]?.trim() ?? '',
      description: cols[7]?.trim() || null,
    };
  });
}
