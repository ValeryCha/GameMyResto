import type { CustomerAppearance, HairStyle } from '../simulation/types';

export const HAIR_STYLES: HairStyle[] = ['short', 'long', 'bun', 'ponytail', 'curly'];

const HAIR_COLORS = [0x30231e, 0x6b4226, 0xd6aa58, 0x823f32, 0x202126];
const SKIN_COLORS = [0xf2c39c, 0xdca47c, 0xb87552, 0x7d4c35];
const OUTFIT_COLORS = [0xd56b75, 0x527bb8, 0x6d9c59, 0xa76dad, 0xd08a45];

export function createAppearance(random: () => number): CustomerAppearance {
  const pick = <T,>(items: readonly T[]): T => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  return {
    bodyType: random() < 0.5 ? 'masculine' : 'feminine',
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    skinColor: pick(SKIN_COLORS),
    outfitColor: pick(OUTFIT_COLORS),
  };
}

export function appearanceForId(id: string): CustomerAppearance {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  let seed = hash >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return createAppearance(random);
}
