import type { Account } from '@/types';
import type { Statement } from './statementData';
import { escapeHtml, renderStatementHtml, type StatementHtmlOptions } from './statementHtml';

const OPTS: StatementHtmlOptions = {
  accentColor: '#FFB300',
  numberFormat: 'en-US',
  dateFormat: 'DD MMM YYYY',
  generatedOn: '2026-10-30',
};

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: 1, name: 'Main Checking', initial_balance: 0, currency: 'EUR',
    color: '#1E88E5', icon: null, account_type: 'cash', current_value: null, created_at: '2025-01-01',
    ...overrides,
  };
}

function statement(overrides: Partial<Statement> = {}): Statement {
  return {
    start: '2026-05-01',
    end: '2026-05-31',
    accountId: null,
    sections: [{
      account: account(),
      currency: 'EUR',
      opening: 1000,
      rows: [{
        date: '2026-05-02', kind: 'expense', description: 'Groceries', detail: null,
        color: '#F44336', moneyIn: 0, moneyOut: 1234.5, balance: -234.5,
      }],
      totalIn: 0,
      totalOut: 1234.5,
      closing: -234.5,
    }],
    summary: [{
      currency: 'EUR', income: 0, expenses: 1234.5, net: -1234.5,
      incomeByCategory: [],
      expensesByCategory: [{ name: 'Groceries', color: '#F44336', total: 1234.5 }],
    }],
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    // Given text with every special character
    // When escaped
    // Then none of them survive as markup
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
  });
});

describe('renderStatementHtml', () => {
  it('escapes user text in row descriptions', () => {
    // Given a transaction note containing a script tag
    const base = statement();
    const s = statement({
      sections: [{ ...base.sections[0], rows: [{ ...base.sections[0].rows[0], description: '<script>alert(1)</script>' }] }],
    });

    // When rendered
    const html = renderStatementHtml(s, OPTS);

    // Then it shows as text, not markup
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('formats amounts and dates with the user preferences', () => {
    // Given a European number format
    // When rendered
    const html = renderStatementHtml(statement(), { ...OPTS, numberFormat: 'de-DE' });

    // Then amounts and dates follow the settings
    expect(html).toContain('Main Checking');
    expect(html).toContain('1.234,50');
    expect(html).toContain('02 May 2026');
    expect(html).toContain('01 May 2026 – 31 May 2026');
    expect(html).toContain('All accounts');
  });

  it('names the account in the header for a single-account statement', () => {
    // Given a statement for one account
    // When rendered
    const html = renderStatementHtml(statement({ accountId: 1 }), OPTS);

    // Then the header names it rather than "All accounts"
    expect(html).not.toContain('All accounts');
    expect(html).toContain('Main Checking · Generated 30 Oct 2026');
  });

  it('shows empty states when the period has nothing in it', () => {
    // Given no activity
    const base = statement();
    const s = statement({ summary: [], sections: [{ ...base.sections[0], rows: [], totalOut: 0, closing: 1000 }] });

    // When rendered
    const html = renderStatementHtml(s, OPTS);

    // Then both the summary and the account say so
    expect(html).toContain('No income or expenses in this period.');
    expect(html).toContain('No activity in this period.');
  });

  it('only embeds the font and logo when they are given', () => {
    // Given no assets, then both assets
    const without = renderStatementHtml(statement(), OPTS);
    const withAssets = renderStatementHtml(statement(), { ...OPTS, fontBase64: 'Rk9OVA==', logoBase64: 'TE9HTw==' });

    // Then each appears only when supplied
    expect(without).not.toContain('@font-face');
    expect(without).not.toContain('<img');
    expect(withAssets).toContain('data:font/ttf;base64,Rk9OVA==');
    expect(withAssets).toContain('data:image/png;base64,TE9HTw==');
  });

  it('drops colours that are not plain hex', () => {
    // Given an account colour that tries to break out of the style attribute
    const base = statement();
    const s = statement({ sections: [{ ...base.sections[0], account: account({ color: 'red;}</style><script>' }) }] });

    // When rendered
    const html = renderStatementHtml(s, OPTS);

    // Then the fallback colour is used instead
    expect(html).not.toContain('</style><script>');
    expect(html).toContain('background:#9E9E9E');
  });

  it('notes the market value on investment accounts', () => {
    // Given an investment account with a market value
    const base = statement();
    const s = statement({ sections: [{ ...base.sections[0], account: account({ account_type: 'investment', current_value: 5000 }) }] });

    // When rendered
    const html = renderStatementHtml(s, OPTS);

    // Then the footnote explains the balances and gives the market value
    expect(html).toContain('Current market value: €5,000.00');
  });
});
