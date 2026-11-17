export interface Wallpaper {
  id: string;
  name: string;
  level: number;
  price: number;
  description: string;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: 'creamStripes', name: 'Кремовые полосы', level: 1, price: 150, description: 'Спокойные вертикальные полосы' },
  { id: 'warmBrick', name: 'Тёплый кирпич', level: 5, price: 400, description: 'Кладка терракотового кирпича' },
  { id: 'kitchenCheck', name: 'Кухонная клетка', level: 10, price: 1200, description: 'Клетка с маленькими кухонными мотивами' },
  { id: 'wineOrnament', name: 'Винный орнамент', level: 18, price: 3500, description: 'Бордовый фон с золотыми завитками' },
  { id: 'goldenHoliday', name: 'Золотой праздник', level: 25, price: 8000, description: 'Глубокий синий фон и золотые звёзды' },
];

export const wallpaperById = (id: string): Wallpaper | undefined => WALLPAPERS.find((item) => item.id === id);

export function wallpaperPreview(id: string): string {
  switch (id) {
    case 'warmBrick': return 'linear-gradient(0deg, transparent 46%, #ead0b5 47%, #ead0b5 53%, transparent 54%), linear-gradient(90deg, transparent 47%, #ead0b5 48%, #ead0b5 52%, transparent 53%), #b96850';
    case 'kitchenCheck': return 'repeating-conic-gradient(#f7e7c2 0% 25%, #6faaa0 0% 50%) 0 0 / 18px 18px';
    case 'wineOrnament': return 'repeating-linear-gradient(45deg, transparent 0 10px, #d5a84d 11px 12px, transparent 13px 22px), repeating-linear-gradient(-45deg, #702f43 0 10px, #934358 11px 12px, #702f43 13px 22px)';
    case 'goldenHoliday': return 'radial-gradient(circle at 25% 25%, #f5cf63 0 2px, transparent 3px), radial-gradient(circle at 75% 75%, #f5cf63 0 2px, transparent 3px), #263c68';
    default: return 'repeating-linear-gradient(90deg, #f6e7c8 0 10px, #dca78b 10px 14px, #f6e7c8 14px 24px)';
  }
}

/** Единый генератор используется и для превью, и для Three.js-текстур. */
export function createWallpaperCanvas(id: string, size = 128): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const unit = size / 128;
  context.scale(unit, unit);

  if (id === 'warmBrick') {
    context.fillStyle = '#b96850'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = '#ead0b5'; context.lineWidth = 3;
    for (let y = 0; y <= 128; y += 24) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(128, y); context.stroke();
      const offset = (y / 24) % 2 ? 16 : 0;
      for (let x = offset; x <= 128; x += 32) {
        context.beginPath(); context.moveTo(x, y); context.lineTo(x, y + 24); context.stroke();
      }
    }
  } else if (id === 'kitchenCheck') {
    context.fillStyle = '#f7e7c2'; context.fillRect(0, 0, 128, 128);
    context.fillStyle = '#6faaa0';
    for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) {
      if ((x + y) / 32 % 2 === 0) context.fillRect(x, y, 32, 32);
    }
    context.fillStyle = '#fff3d4';
    for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) {
      context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill();
      context.fillRect(x - 1, y - 8, 2, 5);
    }
  } else if (id === 'wineOrnament') {
    context.fillStyle = '#702f43'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = '#d5a84d'; context.lineWidth = 2;
    for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) {
      context.beginPath(); context.moveTo(x, y - 12); context.lineTo(x + 12, y); context.lineTo(x, y + 12); context.lineTo(x - 12, y); context.closePath(); context.stroke();
      context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.stroke();
    }
  } else if (id === 'goldenHoliday') {
    context.fillStyle = '#263c68'; context.fillRect(0, 0, 128, 128);
    for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) {
      context.fillStyle = (x + y) % 64 ? '#f5cf63' : '#fff0ad';
      context.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 ? 3 : 8;
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (point === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.closePath(); context.fill();
    }
  } else {
    context.fillStyle = '#f6e7c8'; context.fillRect(0, 0, 128, 128);
    context.fillStyle = '#dca78b';
    for (let x = 8; x < 128; x += 24) context.fillRect(x, 0, 6, 128);
    context.fillStyle = '#fff7df';
    for (let x = 0; x < 128; x += 24) context.fillRect(x, 0, 3, 128);
  }
  return canvas;
}
