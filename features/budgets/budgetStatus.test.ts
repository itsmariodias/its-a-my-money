import { BUDGET_OK_COLOR, BUDGET_OVER_COLOR, BUDGET_WARNING_COLOR, budgetStatusColor } from './budgetStatus';

describe('budgetStatusColor', () => {
  it('is green under 80%', () => {
    // Given a budget mostly unused
    // Then it reads as fine
    expect(budgetStatusColor(0)).toBe(BUDGET_OK_COLOR);
    expect(budgetStatusColor(79.9)).toBe(BUDGET_OK_COLOR);
  });

  it('turns amber from 80% up to the limit', () => {
    // Given a budget nearly used
    // Then it warns
    expect(budgetStatusColor(80)).toBe(BUDGET_WARNING_COLOR);
    expect(budgetStatusColor(99.9)).toBe(BUDGET_WARNING_COLOR);
  });

  it('turns red at and over the limit', () => {
    // Given a budget used up or overspent
    // Then it reads as over
    expect(budgetStatusColor(100)).toBe(BUDGET_OVER_COLOR);
    expect(budgetStatusColor(140)).toBe(BUDGET_OVER_COLOR);
  });
});
