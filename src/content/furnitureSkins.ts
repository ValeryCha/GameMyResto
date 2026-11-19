import type { FurnitureSkinKind } from '../simulation/types';

export interface FurnitureSkin {
  id: string; name: string; kind: FurnitureSkinKind; price: number; level: number;
  primary: string; secondary: string; accent: string; style: 'classic' | 'modern' | 'royal';
}
type Row = [string, string, number, number, string, string, string, 'classic' | 'modern' | 'royal'];
const rows: Record<FurnitureSkinKind, Row[]> = {
  table: [
    ['oakTable', 'Дубовый стол', 100, 1, '#8b5136', '#57392e', '#fff0cf', 'classic'],
    ['walnutTable', 'Ореховый стол', 300, 5, '#68402f', '#38271f', '#e9c46a', 'classic'],
    ['marbleTable', 'Мраморный стол', 800, 10, '#e8e4dc', '#6d7378', '#c6a658', 'modern'],
    ['bistroTable', 'Стол «Бистро»', 2000, 18, '#315b57', '#d5b56c', '#f4e7c3', 'modern'],
    ['royalTable', 'Королевский стол', 5000, 25, '#702f3d', '#d5a83f', '#fff1c7', 'royal'],
  ],
  tableDouble: [
    ['oakDouble', 'Дубовый двойной', 200, 1, '#8b5136', '#57392e', '#fff0cf', 'classic'],
    ['walnutDouble', 'Ореховый двойной', 500, 5, '#68402f', '#38271f', '#e9c46a', 'classic'],
    ['marbleDouble', 'Мраморный двойной', 1200, 10, '#e8e4dc', '#6d7378', '#c6a658', 'modern'],
    ['bistroDouble', 'Двойной «Бистро»', 3000, 18, '#315b57', '#d5b56c', '#f4e7c3', 'modern'],
    ['royalDouble', 'Королевский двойной', 7000, 25, '#702f3d', '#d5a83f', '#fff1c7', 'royal'],
  ],
  chair: [
    ['oakChair', 'Дубовый стул', 75, 1, '#8b5136', '#57392e', '#fff0cf', 'classic'],
    ['walnutChair', 'Ореховый стул', 250, 5, '#68402f', '#38271f', '#e9c46a', 'classic'],
    ['velvetChair', 'Бархатный стул', 700, 10, '#76465d', '#d4b05e', '#f0d9c8', 'modern'],
    ['bistroChair', 'Стул «Бистро»', 1800, 18, '#315b57', '#d5b56c', '#f4e7c3', 'modern'],
    ['royalChair', 'Королевский стул', 4500, 25, '#702f3d', '#d5a83f', '#fff1c7', 'royal'],
  ],
  stove: [
    ['gasStove', 'Газовая плита', 150, 1, '#7e8b91', '#30383b', '#f0a13b', 'classic'],
    ['electricStove', 'Электрическая плита', 600, 5, '#d7dde0', '#454c52', '#79b9d1', 'modern'],
    ['grillStove', 'Профессиональный гриль', 1600, 10, '#3f4749', '#171b1d', '#df7045', 'modern'],
    ['stoneOven', 'Каменная печь', 4000, 18, '#91877a', '#524c45', '#e8b85d', 'classic'],
    ['futureStove', 'Футуристическая плита', 9000, 25, '#304c62', '#182733', '#64e1dc', 'royal'],
    ['industrialStove', 'Индустриальная плита MEGA', 12000, 25, '#54656b', '#202a2e', '#f2b84b', 'modern'],
  ],
  counter: [
    ['woodCounter', 'Деревянная стойка', 150, 1, '#8b5136', '#57392e', '#fff0cf', 'classic'],
    ['marbleCounter', 'Мраморная стойка', 550, 5, '#e8e4dc', '#777d83', '#c6a658', 'classic'],
    ['metalCounter', 'Металлическая стойка', 1400, 10, '#89969d', '#39444a', '#d8e2e5', 'modern'],
    ['neonCounter', 'Стойка с подсветкой', 3500, 18, '#28515c', '#172c35', '#6ce0d5', 'modern'],
    ['vintageCounter', 'Винтажная стойка', 8000, 25, '#6e3541', '#d2a34d', '#f4dfb5', 'royal'],
  ],
  chef: [
    ['classicChef', 'Классический шеф', 250, 1, '#f5f2e9', '#30383b', '#ffffff', 'classic'],
    ['blackChef', 'Чёрный фартук', 700, 5, '#383d43', '#181b1f', '#c5ccd1', 'modern'],
    ['goldChef', 'Шеф с золотыми пуговицами', 1800, 10, '#f7f1df', '#57392e', '#e7bd52', 'royal'],
    ['streetChef', 'Уличный повар', 4500, 18, '#c95843', '#263a4a', '#f0c85a', 'modern'],
    ['pastryChef', 'Шеф-кондитер', 9500, 25, '#f1c8d3', '#7c425c', '#fff7e8', 'royal'],
  ],
  waiter: [
    ['classicWaiter', 'Классический жилет', 200, 1, '#f5f2e9', '#30383b', '#7f2938', 'classic'],
    ['bowWaiter', 'Официант с бабочкой', 600, 5, '#f4efe4', '#24262d', '#b48b45', 'classic'],
    ['apronWaiter', 'Фартук бариста', 1500, 10, '#d9c5a5', '#5d3c2d', '#8a654b', 'modern'],
    ['modernWaiter', 'Современный стиль', 3800, 18, '#4b7f84', '#20373d', '#d9f0e8', 'modern'],
    ['retroWaiter', 'Ретро-официант', 8500, 25, '#8f3f54', '#3b2734', '#efbd57', 'royal'],
  ],
};
export const FURNITURE_SKINS: FurnitureSkin[] = Object.entries(rows).flatMap(([kind, entries]) =>
  entries.map(([id, name, price, level, primary, secondary, accent, style]) => ({ id, name, kind: kind as FurnitureSkinKind, price, level, primary, secondary, accent, style })));
export const furnitureSkinById = (id: string): FurnitureSkin | undefined => FURNITURE_SKINS.find((item) => item.id === id);
export const furnitureSkinPreview = (id: string): string => {
  const skin = furnitureSkinById(id)!;
  return `linear-gradient(135deg, ${skin.primary} 0 58%, ${skin.secondary} 58% 72%, ${skin.accent} 72%)`;
};
