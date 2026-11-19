import { describe, expect, it } from 'vitest';
import { formatGuestsStat } from '../src/ui/hudFormat';

describe('formatGuestsStat', () => {
  it('показывает занято / свободно / лимит', () => {
    expect(formatGuestsStat(2, 5)).toBe('2 занято · свободно 3 · лимит 5');
  });

  it('клампит свободные места в 0 при переполнении', () => {
    expect(formatGuestsStat(6, 5)).toBe('6 занято · свободно 0 · лимит 5');
  });

  it('работает на старте (0 гостей)', () => {
    expect(formatGuestsStat(0, 5)).toBe('0 занято · свободно 5 · лимит 5');
  });
});