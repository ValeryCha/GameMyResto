export interface Dish {
  id: string;
  name: string;
  price: number;
  cookSeconds: number;
  unlockLevel: number;
}

export const DISHES: Dish[] = [
  { id: 'soup', name: 'Суп', price: 5, cookSeconds: 6, unlockLevel: 1 },
  { id: 'pasta', name: 'Паста', price: 7, cookSeconds: 8, unlockLevel: 2 },
  { id: 'salad', name: 'Салат', price: 12, cookSeconds: 5, unlockLevel: 4 },
  { id: 'cutlet', name: 'Котлета', price: 20, cookSeconds: 10, unlockLevel: 6 },
  { id: 'fish', name: 'Рыбное блюдо', price: 35, cookSeconds: 12, unlockLevel: 8 },
  { id: 'signature', name: 'Фирменный ужин', price: 50, cookSeconds: 15, unlockLevel: 10 },
];
