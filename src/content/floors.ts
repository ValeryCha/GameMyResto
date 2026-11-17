export interface FloorPattern {
  id: string;
  name: string;
  level: number;
  price: number;
  description: string;
}

export const FLOOR_PATTERNS: FloorPattern[] = [
  { id: 'simpleTile', name: 'Простая плитка', level: 1, price: 200, description: 'Светлая плитка с тонкими швами' },
  { id: 'warmWood', name: 'Тёплое дерево', level: 5, price: 600, description: 'Уютные деревянные доски' },
  { id: 'softCarpet', name: 'Мягкий ковролин', level: 10, price: 1500, description: 'Фактурное бордовое покрытие' },
  { id: 'whiteMarble', name: 'Белый мрамор', level: 18, price: 4000, description: 'Камень с изящными прожилками' },
  { id: 'royalCeramic', name: 'Королевская керамика', level: 25, price: 10000, description: 'Шахматная плитка с золотым орнаментом' },
];

export const floorPatternById = (id: string): FloorPattern | undefined => FLOOR_PATTERNS.find((item) => item.id === id);

export function floorPreview(id: string): string {
  switch (id) {
    case 'warmWood': return 'repeating-linear-gradient(0deg, transparent 0 22px, #70452f 23px 24px), repeating-linear-gradient(90deg, #b77a49 0 47px, #855534 48px 50px)';
    case 'softCarpet': return 'radial-gradient(circle, #d9a08a 0 1px, transparent 2px), #874b52';
    case 'whiteMarble': return 'linear-gradient(125deg, transparent 35%, #b8b5ad 37%, transparent 39% 63%, #d2cec4 65%, transparent 67%), #f4f0e7';
    case 'royalCeramic': return 'radial-gradient(circle at 25% 25%, #e7bd52 0 2px, transparent 3px), radial-gradient(circle at 75% 75%, #e7bd52 0 2px, transparent 3px), repeating-conic-gradient(#283e43 0% 25%, #f0dfbd 0% 50%) 0 0 / 40px 40px';
    default: return 'repeating-conic-gradient(#e8e2d5 0% 25%, #f7f3e9 0% 50%) 0 0 / 32px 32px';
  }
}

export function createFloorCanvas(id: string, size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const unit = size / 256;
  context.scale(unit, unit);
  if (id === 'warmWood') {
    context.fillStyle = '#ad7548'; context.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      context.fillStyle = y % 64 ? '#b88050' : '#a86f43'; context.fillRect(0, y, 256, 30);
      context.strokeStyle = '#70452f'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(0, y + 31); context.lineTo(256, y + 31); context.stroke();
      for (let x = (y / 32) % 2 ? 64 : 0; x < 256; x += 128) {
        context.beginPath(); context.moveTo(x, y); context.lineTo(x, y + 32); context.stroke();
      }
      context.strokeStyle = '#c89567'; context.lineWidth = 1;
      for (let line = 8; line < 28; line += 8) {
        context.beginPath(); context.moveTo(0, y + line); context.bezierCurveTo(70, y + line - 4, 180, y + line + 4, 256, y + line); context.stroke();
      }
    }
  } else if (id === 'softCarpet') {
    context.fillStyle = '#874b52'; context.fillRect(0, 0, 256, 256);
    for (let y = 4; y < 256; y += 8) for (let x = 4; x < 256; x += 8) {
      context.fillStyle = (x + y) % 16 ? '#9d6266' : '#714047';
      context.fillRect(x, y, 2, 2);
    }
  } else if (id === 'whiteMarble') {
    context.fillStyle = '#f4f0e7'; context.fillRect(0, 0, 256, 256);
    context.strokeStyle = '#c1bdb4'; context.lineWidth = 3;
    for (let offset = -256; offset < 512; offset += 128) {
      context.beginPath(); context.moveTo(offset, 0);
      context.bezierCurveTo(offset + 70, 50, offset - 20, 150, offset + 120, 256); context.stroke();
      context.strokeStyle = '#ded9cf'; context.lineWidth = 1;
      context.beginPath(); context.moveTo(offset + 12, 0);
      context.bezierCurveTo(offset + 82, 50, offset - 8, 150, offset + 132, 256); context.stroke();
      context.strokeStyle = '#c1bdb4'; context.lineWidth = 3;
    }
  } else if (id === 'royalCeramic') {
    for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
      context.fillStyle = (x + y) / 64 % 2 ? '#283e43' : '#f0dfbd'; context.fillRect(x, y, 64, 64);
      context.strokeStyle = '#b89445'; context.lineWidth = 2; context.strokeRect(x + 4, y + 4, 56, 56);
      context.beginPath(); context.moveTo(x + 32, y + 12); context.lineTo(x + 52, y + 32); context.lineTo(x + 32, y + 52); context.lineTo(x + 12, y + 32); context.closePath(); context.stroke();
    }
  } else {
    for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
      context.fillStyle = (x + y) / 64 % 2 ? '#e8e2d5' : '#f7f3e9'; context.fillRect(x, y, 64, 64);
      context.strokeStyle = '#c9c3b6'; context.lineWidth = 2; context.strokeRect(x, y, 64, 64);
    }
  }
  return canvas;
}
