import { describe, expect, it } from 'vitest';
import { formatDate, parseFrenchDate } from './utils';

describe('dates françaises', () => {
  it('affiche les dates stockées au format jour/mois/année', () => {
    expect(formatDate('2026-11-07')).toBe('07/11/2026');
    expect(parseFrenchDate('07/11/2026')).toBe('2026-11-07');
  });

  it('refuse les dates incomplètes ou inexistantes', () => {
    for (const value of ['', '7/11/2026', '11/31/2026', '29/02/2025', '00/01/2026', '01/13/2026']) {
      expect(parseFrenchDate(value)).toBeNull();
    }
    expect(parseFrenchDate('29/02/2024')).toBe('2024-02-29');
  });
});
