import { describe, expect, it } from 'vitest';
import { fitZoom } from '../src/render3d/cameraMath';

describe('автоматический масштаб ресторана', () => {
  it('не уменьшает исходное поле на широком экране', () => {
    expect(fitZoom(8, 8, 16 / 10)).toBe(1);
  });

  it('уменьшает масштаб по мере роста границ', () => {
    expect(fitZoom(16, 16, 16 / 10)).toBeLessThan(1);
    expect(fitZoom(30, 30, 16 / 10)).toBeLessThan(fitZoom(16, 16, 16 / 10));
  });

  it('учитывает узкий экран', () => {
    expect(fitZoom(8, 8, 0.5)).toBeLessThan(1);
    expect(fitZoom(30, 30, 0.5)).toBeLessThan(fitZoom(16, 16, 0.5));
  });
});
