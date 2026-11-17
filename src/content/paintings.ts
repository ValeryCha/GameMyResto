export interface Painting { id: string; name: string; price: number; level: number; widthCells: number; heightCells: number; colors: [string, string, string]; motif: 'hills' | 'fruit' | 'city' | 'abstract' | 'portrait' }
export const PAINTINGS: Painting[] = [
  { id: 'hills', name: 'Тихие холмы', price: 300, level: 1, widthCells: 1, heightCells: 1, colors: ['#9fc7c1', '#668b59', '#f2d49b'], motif: 'hills' },
  { id: 'fruit', name: 'Натюрморт', price: 800, level: 5, widthCells: 1, heightCells: 2, colors: ['#583f4b', '#d4934f', '#9a3f45'], motif: 'fruit' },
  { id: 'city', name: 'Городской ритм', price: 1500, level: 10, widthCells: 2, heightCells: 1, colors: ['#35475d', '#d8a24a', '#8296a9'], motif: 'city' },
  { id: 'abstract', name: 'Смелая абстракция', price: 3000, level: 18, widthCells: 2, heightCells: 2, colors: ['#e3c45b', '#a6474b', '#3e6c73'], motif: 'abstract' },
  { id: 'portrait', name: 'Портрет шефа', price: 6000, level: 25, widthCells: 2, heightCells: 2, colors: ['#313c46', '#c88d68', '#7f313b'], motif: 'portrait' },
];
export const paintingById = (id: string): Painting | undefined => PAINTINGS.find((item) => item.id === id);
export function paintingPreview(id: string): string {
  const painting = paintingById(id)!;
  const [a, b, c] = painting.colors;
  return `linear-gradient(145deg, ${a} 0 35%, ${b} 35% 62%, ${c} 62%)`;
}
export function createPaintingCanvas(id: string): HTMLCanvasElement {
  const painting = paintingById(id)!;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = painting.colors[0]; context.fillRect(0, 0, 256, 256);
  context.fillStyle = painting.colors[1];
  if (painting.motif === 'hills') {
    context.beginPath(); context.moveTo(0, 190); context.quadraticCurveTo(70, 80, 140, 180); context.quadraticCurveTo(205, 105, 256, 175); context.lineTo(256, 256); context.lineTo(0, 256); context.fill();
    context.fillStyle = painting.colors[2]; context.beginPath(); context.arc(195, 60, 28, 0, Math.PI * 2); context.fill();
  } else if (painting.motif === 'fruit') {
    for (const [x, y, r] of [[85, 150, 42], [145, 135, 48], [175, 180, 35]]) { context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill(); }
    context.fillStyle = painting.colors[2]; context.fillRect(65, 202, 145, 18);
  } else if (painting.motif === 'city') {
    for (const [x, h] of [[20, 115], [70, 175], [125, 140], [175, 195]]) context.fillRect(x, 256 - h, 42, h);
    context.fillStyle = painting.colors[2]; for (let x = 28; x < 230; x += 50) for (let y = 110; y < 230; y += 30) context.fillRect(x, y, 10, 12);
  } else if (painting.motif === 'abstract') {
    context.beginPath(); context.arc(85, 90, 65, 0, Math.PI * 2); context.fill(); context.fillStyle = painting.colors[2]; context.fillRect(115, 105, 105, 110);
  } else {
    context.beginPath(); context.arc(128, 100, 55, 0, Math.PI * 2); context.fill(); context.fillStyle = painting.colors[2]; context.beginPath(); context.moveTo(50, 256); context.quadraticCurveTo(128, 135, 206, 256); context.fill();
  }
  return canvas;
}
