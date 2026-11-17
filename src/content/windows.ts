export type WindowMotif = 'wood' | 'panorama' | 'stained' | 'arch' | 'round';
export interface RestaurantWindow {
  id: string; name: string; price: number; level: number; widthCells: number; heightCells: number;
  colors: [string, string, string]; motif: WindowMotif;
}
export const WINDOWS: RestaurantWindow[] = [
  { id: 'woodWindow', name: 'Деревянное окно', price: 300, level: 1, widthCells: 1, heightCells: 1, colors: ['#805238', '#9fd4dc', '#f3e6c7'], motif: 'wood' },
  { id: 'panoramaWindow', name: 'Панорамное окно', price: 800, level: 5, widthCells: 2, heightCells: 1, colors: ['#45545c', '#b8e3e8', '#e8f3ef'], motif: 'panorama' },
  { id: 'stainedWindow', name: 'Витраж', price: 1800, level: 10, widthCells: 1, heightCells: 2, colors: ['#c7a34d', '#6da9ad', '#a55165'], motif: 'stained' },
  { id: 'archWindow', name: 'Арочное окно', price: 3500, level: 18, widthCells: 2, heightCells: 2, colors: ['#e2d4b9', '#90c6d0', '#95623f'], motif: 'arch' },
  { id: 'roundWindow', name: 'Круглый иллюминатор', price: 7000, level: 25, widthCells: 2, heightCells: 2, colors: ['#c7a85c', '#a6d8df', '#38505d'], motif: 'round' },
];
export const windowById = (id: string): RestaurantWindow | undefined => WINDOWS.find((item) => item.id === id);
export function windowPreview(id: string): string {
  const item = windowById(id)!;
  return `linear-gradient(145deg, ${item.colors[0]} 0 24%, ${item.colors[1]} 24% 72%, ${item.colors[2]} 72%)`;
}
