import { expect, it } from 'vitest';
import { classicSkin } from '../src/render3d/skins';

it('provides an independent classic skin', () => {
  expect(classicSkin.id).toBe('classic');
  expect(classicSkin.wall).not.toBe(classicSkin.floor);
});
