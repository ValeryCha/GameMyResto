export interface Dish {
  id: string;
  name: string;
  price: number;
  cookSeconds: number;
  unlockLevel: number;
  emoji: string;
}

const DISH_NAMES: [string, string][] = [
  ['soup', 'Суп'],
  ['pasta', 'Паста'],
  ['salad', 'Салат'],
  ['cutlet', 'Котлета'],
  ['fish', 'Рыбное блюдо'],
  ['signature', 'Фирменный ужин'],
  ['omelet', 'Омлет'],
  ['pizza', 'Пицца'],
  ['burger', 'Бургер'],
  ['dumplings', 'Пельмени'],
  ['risotto', 'Ризотто'],
  ['tacos', 'Тако'],
  ['sushi', 'Суши'],
  ['borscht', 'Борщ'],
  ['steak', 'Стейк'],
  ['paella', 'Паэлья'],
  ['lasagna', 'Лазанья'],
  ['khinkali', 'Хинкали'],
  ['tomYam', 'Том-ям'],
  ['pekingDuck', 'Утка по-пекински'],
  ['ramen', 'Рамен'],
  ['moussaka', 'Муссака'],
  ['ravioli', 'Равиоли'],
  ['chakhokhbili', 'Чахохбили'],
  ['ratatouille', 'Рататуй'],
  ['meatballs', 'Тефтели'],
  ['kebab', 'Шашлык'],
  ['pilaf', 'Плов'],
  ['fondue', 'Фондю'],
  ['salmon', 'Лосось в соусе'],
  ['veal', 'Телячье филе'],
  ['tastingSet', 'Дегустационный сет'],
  ['royalBanquet', 'Королевский банкет'],
];

const DISH_EMOJI: Record<string, string> = {
  soup: '🍲', pasta: '🍝', salad: '🥗', cutlet: '🍖', fish: '🐟', signature: '🍽️',
  omelet: '🍳', pizza: '🍕', burger: '🍔', dumplings: '🥟', risotto: '🍚', tacos: '🌮',
  sushi: '🍣', borscht: '🥣', steak: '🥩', paella: '🥘', lasagna: '🍝', khinkali: '🥟',
  tomYam: '🍜', pekingDuck: '🦆', ramen: '🍜', moussaka: '🍆', ravioli: '🥟',
  chakhokhbili: '🍗', ratatouille: '🍆', meatballs: '🧆', kebab: '🍢', pilaf: '🍚',
  fondue: '🫕', salmon: '🐟', veal: '🥩', tastingSet: '🍱', royalBanquet: '🍽️',
};

export const dishPrice = (level: number): number => 5 + 2 * (level - 1);
export const recipeCost = (level: number): number => level === 1 ? 0 : 50 * Math.round(3.45 * Math.pow(level, 1.35));

export const DISHES: Dish[] = DISH_NAMES.map(([id, name], index) => ({
  id,
  name,
  price: dishPrice(index + 1),
  cookSeconds: 6 + index % 10,
  unlockLevel: index + 1,
  emoji: DISH_EMOJI[id] ?? '🍽',
}));
