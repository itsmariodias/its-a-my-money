import { formatAmount } from '@/constants/currencies';
import { formatDate, type DateFormatId } from '@/constants/dateFormats';
import { THEMES } from '@/constants/theme';
import type { AccountStatement, CategoryTotal, CurrencySummary, Statement } from './statementData';

export interface StatementHtmlOptions {
  accentColor: string;
  numberFormat: string;
  dateFormat: DateFormatId;
  /** YYYY-MM-DD the statement was generated on. */
  generatedOn: string;
  /** LilitaOne TTF, for the wordmark. Without it the wordmark falls back to bold sans. */
  fontBase64?: string | null;
  /** App icon PNG, shown beside the wordmark. */
  logoBase64?: string | null;
}

// Always the light palette: the PDF is meant to be printed.
const { textColor, subColor, borderColor, inputBg } = THEMES.white.colors;
const INCOME_COLOR = '#4CAF50';
const EXPENSE_COLOR = '#F44336';
const FALLBACK_DOT = '#9E9E9E';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Colours come from user data and go into style attributes, so only plain hex is let through. */
function safeColor(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : FALLBACK_DOT;
}

function renderStyles(opts: StatementHtmlOptions): string {
  const accent = safeColor(opts.accentColor);
  const fontFace = opts.fontBase64
    ? `@font-face { font-family: 'LilitaOne'; src: url(data:font/ttf;base64,${opts.fontBase64}) format('truetype'); }`
    : '';
  return `
    ${fontFace}
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: ${textColor}; font-family: -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 10.5px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .sub { color: ${subColor}; }
    .in { color: ${INCOME_COLOR}; }
    .out { color: ${EXPENSE_COLOR}; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 6px; vertical-align: middle; }
    .dot.transfer { border: 1.5px solid ${subColor}; }

    .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px; border-bottom: 3px solid ${accent}; margin-bottom: 18px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand img { width: 40px; height: 40px; border-radius: 10px; }
    .wordmark { font-family: 'LilitaOne', -apple-system, Roboto, sans-serif; font-size: 22px; ${opts.fontBase64 ? '' : 'font-weight: 800;'} }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 18px; font-weight: 700; }
    .title div { font-size: 11px; }

    h2 { font-size: 13px; margin: 22px 0 8px; padding-left: 8px; border-left: 3px solid ${accent}; break-after: avoid; page-break-after: avoid; }
    .card { border: 1px solid ${borderColor}; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
    .stats { display: flex; gap: 8px; }
    .stat { flex: 1; background: ${inputBg}; border-radius: 8px; padding: 8px 10px; }
    .stat .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: ${subColor}; font-weight: 600; }
    .stat .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
    .breakdowns { display: flex; gap: 16px; margin-top: 12px; }
    .breakdown { flex: 1; }
    .breakdown h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: ${subColor}; margin: 0 0 6px; }
    .cat { display: flex; justify-content: space-between; padding: 3px 0; }
    .bar { height: 3px; border-radius: 2px; background: ${inputBg}; margin-bottom: 3px; }
    .bar div { height: 3px; border-radius: 2px; }

    .account-head { display: flex; justify-content: space-between; align-items: baseline; margin: 24px 0 8px; break-after: avoid; page-break-after: avoid; }
    .account-head .name { font-size: 14px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    thead { display: table-header-group; }
    th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: ${subColor}; font-weight: 600; padding: 6px 6px; border-bottom: 1px solid ${borderColor}; }
    th.num { text-align: right; }
    td { padding: 6px 6px; border-bottom: 1px solid ${borderColor}; vertical-align: top; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    td.date { white-space: nowrap; width: 1%; }
    .detail { font-size: 9.5px; color: ${subColor}; padding-left: 14px; }
    tr.balance-row td { background: ${inputBg}; font-weight: 600; }
    .empty { text-align: center; color: ${subColor}; padding: 16px 0; }
    .note { font-size: 9.5px; color: ${subColor}; margin-top: 6px; }
    .footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid ${borderColor}; font-size: 9px; color: ${subColor}; text-align: center; }
  `;
}

function renderBreakdown(title: string, items: CategoryTotal[], currency: string, opts: StatementHtmlOptions): string {
  if (items.length === 0) {
    return `<div class="breakdown"><h3>${title}</h3><div class="sub">None</div></div>`;
  }
  const max = items[0].total;
  const rows = items.map((c) => {
    const color = safeColor(c.color);
    const width = max > 0 ? Math.max(2, (c.total / max) * 100) : 0;
    return `
      <div class="cat"><span><span class="dot" style="background:${color}"></span>${escapeHtml(c.name)}</span><span class="num">${formatAmount(c.total, currency, undefined, opts.numberFormat)}</span></div>
      <div class="bar"><div style="width:${width.toFixed(1)}%;background:${color}"></div></div>`;
  }).join('');
  return `<div class="breakdown"><h3>${title}</h3>${rows}</div>`;
}

function renderSummary(summary: CurrencySummary, opts: StatementHtmlOptions): string {
  const fmt = (n: number) => formatAmount(n, summary.currency, undefined, opts.numberFormat);
  const netClass = summary.net >= 0 ? 'in' : 'out';
  return `
    <div class="card">
      <div class="stats">
        <div class="stat"><div class="label">Income · ${summary.currency}</div><div class="value in">${fmt(summary.income)}</div></div>
        <div class="stat"><div class="label">Expenses · ${summary.currency}</div><div class="value out">${fmt(summary.expenses)}</div></div>
        <div class="stat"><div class="label">Net · ${summary.currency}</div><div class="value ${netClass}">${fmt(summary.net)}</div></div>
      </div>
      <div class="breakdowns">
        ${renderBreakdown('Income received', summary.incomeByCategory, summary.currency, opts)}
        ${renderBreakdown('Spending', summary.expensesByCategory, summary.currency, opts)}
      </div>
    </div>`;
}

function renderAccount(section: AccountStatement, statement: Statement, opts: StatementHtmlOptions): string {
  const { account, currency } = section;
  const fmt = (n: number) => formatAmount(n, currency, undefined, opts.numberFormat);
  const date = (d: string) => formatDate(d, opts.dateFormat);
  const isInvestment = account.account_type === 'investment';

  const rows = section.rows.map((r) => {
    const dot = r.kind === 'transfer'
      ? '<span class="dot transfer"></span>'
      : `<span class="dot" style="background:${safeColor(r.color)}"></span>`;
    const detail = r.detail ? `<div class="detail">${escapeHtml(r.detail)}</div>` : '';
    return `
      <tr>
        <td class="date">${date(r.date)}</td>
        <td>${dot}${escapeHtml(r.description)}${detail}</td>
        <td class="num in">${r.moneyIn ? formatAmount(r.moneyIn, currency, 'income', opts.numberFormat) : ''}</td>
        <td class="num out">${r.moneyOut ? formatAmount(r.moneyOut, currency, 'expense', opts.numberFormat) : ''}</td>
        <td class="num">${fmt(r.balance)}</td>
      </tr>`;
  }).join('');

  const body = section.rows.length === 0
    ? '<tr><td colspan="5" class="empty">No activity in this period.</td></tr>'
    : rows;

  const marketNote = isInvestment && account.current_value !== null
    ? `<div class="note">Balances show the amount invested. Current market value: ${fmt(account.current_value)}.</div>`
    : '';

  return `
    <div class="account-head">
      <span class="name"><span class="dot" style="background:${safeColor(account.color)}"></span>${escapeHtml(account.name)}</span>
      <span class="sub">${isInvestment ? 'Investment' : 'Cash'} · ${currency}</span>
    </div>
    <div class="card">
      <div class="stats">
        <div class="stat"><div class="label">Opening · ${date(statement.start)}</div><div class="value">${fmt(section.opening)}</div></div>
        <div class="stat"><div class="label">Money in</div><div class="value in">${fmt(section.totalIn)}</div></div>
        <div class="stat"><div class="label">Money out</div><div class="value out">${fmt(section.totalOut)}</div></div>
        <div class="stat"><div class="label">Closing · ${date(statement.end)}</div><div class="value">${fmt(section.closing)}</div></div>
      </div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th class="num">In</th><th class="num">Out</th><th class="num">Balance</th></tr></thead>
      <tbody>
        <tr class="balance-row"><td class="date">${date(statement.start)}</td><td>Opening balance</td><td></td><td></td><td class="num">${fmt(section.opening)}</td></tr>
        ${body}
        <tr class="balance-row"><td class="date">${date(statement.end)}</td><td>Closing balance</td><td class="num in">${fmt(section.totalIn)}</td><td class="num out">${fmt(section.totalOut)}</td><td class="num">${fmt(section.closing)}</td></tr>
      </tbody>
    </table>
    ${marketNote}`;
}

/** A self-contained, print-ready HTML page for `Print.printToFileAsync`. */
export function renderStatementHtml(statement: Statement, opts: StatementHtmlOptions): string {
  const date = (d: string) => formatDate(d, opts.dateFormat);
  const scope = statement.accountId === null
    ? 'All accounts'
    : escapeHtml(statement.sections[0]?.account.name ?? 'Account');
  const logo = opts.logoBase64 ? `<img src="data:image/png;base64,${opts.logoBase64}" alt="" />` : '';

  const summary = statement.summary.length > 0
    ? statement.summary.map((s) => renderSummary(s, opts)).join('')
    : '<div class="card empty">No income or expenses in this period.</div>';

  const accounts = statement.sections.length > 0
    ? statement.sections.map((s) => renderAccount(s, statement, opts)).join('')
    : '<div class="card empty">No accounts with activity in this period.</div>';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${renderStyles(opts)}</style>
</head>
<body>
  <div class="header">
    <div class="brand">${logo}<span class="wordmark">It's a My Money!</span></div>
    <div class="title">
      <h1>Statement</h1>
      <div>${date(statement.start)} – ${date(statement.end)}</div>
      <div class="sub">${scope} · Generated ${date(opts.generatedOn)}</div>
    </div>
  </div>

  <h2>Summary</h2>
  ${summary}

  <h2>Accounts</h2>
  ${accounts}

  <div class="footer">Generated by It's a My Money! · All data is stored locally on your device. Amounts are shown in each account's own currency; nothing is converted.</div>
</body>
</html>`;
}
