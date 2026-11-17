export interface Dish {
  id: string;
  name: string;
  price: number;
  cookSeconds: number;
  unlockLevel: number;
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

export const dishPrice = (level: number): number => 5 + 2 * (level - 1);
export const recipeCost = (level: number): number => level === 1 ? 0 : 50 * Math.round(3.45 * Math.pow(level, 1.35));

export const DISHES: Dish[] = DISH_NAMES.map(([id, name], index) => ({
  id,
  name,
  price: dishPrice(index + 1),
  cookSeconds: 6 + index % 10,
  unlockLevel: index + 1,
}));
