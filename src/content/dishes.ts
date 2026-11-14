export interface Dish {
  id: string;
  name: string;
  price: number;
  cookSeconds: number;
}

export const DISHES: Dish[] = [
  { id: 'soup', name: 'Суп', price: 35, cookSeconds: 6 },
  { id: 'pasta', name: 'Паста', price: 50, cookSeconds: 9 },
  { id: 'cutlet', name: 'Котлета', price: 70, cookSeconds: 12 },
];
