import { furnitureSkinById } from '../content/furnitureSkins';
import { createPaintingCanvas, paintingById } from '../content/paintings';
import { windowById } from '../content/windows';
import { createWallpaperCanvas, wallpaperById } from '../content/wallpapers';
import { createFloorCanvas, floorPatternById } from '../content/floors';
import { doorPatternById } from '../content/doors';
import type { ShopItem } from './shopPanel';

const svg = (body: string) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 100 80'); node.setAttribute('aria-hidden', 'true');
  node.innerHTML = body;
  return node;
};
const image = (canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number, clipPath = '') =>
  `<image href="${canvas.toDataURL('image/png')}" x="${x}" y="${y}" width="${width}" height="${height}"${clipPath ? ` clip-path="url(#${clipPath})"` : ''}/>`;

export function createShopThumbnail(item: ShopItem): SVGSVGElement | null {
  const skin = item.furnitureSkinId ? furnitureSkinById(item.furnitureSkinId) : undefined;
  const windowItem = item.windowId ? windowById(item.windowId) : undefined;
  const painting = item.paintingId ? paintingById(item.paintingId) : undefined;
  const wallpaper = item.wallpaperId ? wallpaperById(item.wallpaperId) : undefined;
  const floor = item.floorId ? floorPatternById(item.floorId) : undefined;
  const door = item.doorId ? doorPatternById(item.doorId) : undefined;
  const a = skin?.primary ?? windowItem?.colors[0] ?? '#6f472d';
  const b = skin?.secondary ?? windowItem?.colors[1] ?? '#57392e';
  const c = skin?.accent ?? windowItem?.colors[2] ?? '#f4d99b';
  const kind = skin?.kind ?? item.furniture ?? item.icon;

  if (wallpaper) {
    return svg(`<path d="M22 5h56v70H22z" fill="#fff8e9" stroke="#6b422d" stroke-width="2"/>${image(createWallpaperCanvas(wallpaper.id), 26, 9, 48, 62)}`);
  }
  if (floor) {
    return svg(`<defs><clipPath id="floor-clip"><path d="M50 6l42 29-42 37-42-37z"/></clipPath></defs>${image(createFloorCanvas(floor.id), 8, 6, 84, 66, 'floor-clip')}<path d="M50 6l42 29-42 37-42-37z" fill="none" stroke="#6b422d" stroke-width="2"/>`);
  }
  if (painting) {
    const height = painting.heightCells >= painting.widthCells * 1.5 ? 62 : 48;
    const width = Math.min(66, height * painting.widthCells / painting.heightCells);
    const x = 50 - width / 2; const y = 40 - height / 2;
    return svg(`<rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="2" fill="${a}"/>${image(createPaintingCanvas(painting.id), x, y, width, height)}`);
  }
  if (windowItem) {
    const width = windowItem.motif === 'arch' ? 44 : 24 + windowItem.widthCells * 17; const height = 18 + windowItem.heightCells * 16;
    const x = 50 - width / 2; const y = 40 - height / 2;
    if (windowItem.motif === 'round') {
      const radius = Math.min(width, height) * 0.43;
      return svg(`<circle cx="50" cy="40" r="${radius + 4}" fill="${a}"/><circle cx="50" cy="40" r="${radius}" fill="${b}"/><path d="M50 ${40 - radius}v${radius * 2}M${50 - radius} 40h${radius * 2}" stroke="${c}" stroke-width="2.5"/>`);
    }
    if (windowItem.motif === 'arch') {
      const arch = `M${x} ${y + height}v-${height - width / 2}a${width / 2} ${width / 2} 0 0 1 ${width} 0v${height - width / 2}z`;
      const innerX = x + 4; const innerWidth = width - 8;
      const inner = `M${innerX} ${y + height - 4}v-${height - 8 - innerWidth / 2}a${innerWidth / 2} ${innerWidth / 2} 0 0 1 ${innerWidth} 0v${height - 8 - innerWidth / 2}z`;
      return svg(`<path d="${arch}" fill="${a}"/><path d="${inner}" fill="${b}"/><path d="M50 ${y + 4}v${height - 8}M${innerX} 40h${innerWidth}" stroke="${c}" stroke-width="2.5"/>`);
    }
    const bars = windowItem.motif === 'panorama'
      ? `<path d="M50 ${y + 4}v${height - 8}" stroke="${a}" stroke-width="3"/>`
      : `<path d="M50 ${y + 4}v${height - 8}M${x + 4} 40h${width - 8}" stroke="${a}" stroke-width="3"/>`;
    const stained = windowItem.motif === 'stained'
      ? `<path d="M${x + 5} ${y + 5}h${width / 2 - 7}v${height / 2 - 7}h-${width / 2 - 7}zM50 40h${width / 2 - 5}v${height / 2 - 5}H50z" fill="${c}"/>` : '';
    const sill = windowItem.motif === 'wood' ? `<path d="M${x - 4} ${y + height + 3}h${width + 8}" stroke="${c}" stroke-width="5"/>` : '';
    return svg(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" fill="${a}"/><rect x="${x + 4}" y="${y + 4}" width="${width - 8}" height="${height - 8}" fill="${b}"/>${stained}${bars}${sill}`);
  }
  if (door || item.id === 'door') {
    const color = door?.color ?? '#805238';
    const detail = door?.id === 'glass' ? `<path d="M34 14h32v50H34z" fill="#a5d9dc"/>`
      : door?.id === 'stained' ? `<path d="M34 14h15v20H34zM51 14h15v20H51z" fill="#d8a64d"/><path d="M34 36h15v20H34zM51 36h15v20H51z" fill="#6d3c64"/><path d="M49.5 14v42M34 35h32" stroke="#263f4d" stroke-width="2"/>`
        : door?.id === 'metal' ? `<path d="M37 20h4M59 20h4M37 40h4M59 40h4M37 60h4M59 60h4" stroke="#c0c8ca" stroke-width="4" stroke-linecap="round"/>`
          : door?.id === 'carved' ? `<ellipse cx="50" cy="29" rx="12" ry="9" fill="none" stroke="#c79a46" stroke-width="2"/><ellipse cx="50" cy="51" rx="12" ry="9" fill="none" stroke="#c79a46" stroke-width="2"/>` : '';
    return svg(`<path d="M27 7h46v65H27z" fill="#57392e"/><path d="M34 14h32v58H34z" fill="${color}"/>${detail}<circle cx="60" cy="45" r="3" fill="#e7bd52"/><path d="M22 72h56" stroke="#506642" stroke-width="5"/>`);
  }
  if (!skin && !item.furniture) return null;
  if (kind === 'chair') return svg(`<path d="M29 8h38v35H29z" rx="3" fill="${a}"/><path d="M34 14h28v20H34z" fill="${c}"/><path d="M26 38h46v12H26z" fill="${a}"/><path d="M31 49v25M65 49v25M36 49v22M60 49v22" stroke="${b}" stroke-width="5"/>`);
  if (kind === 'table' || kind === 'tableDouble') {
    const double = kind === 'tableDouble';
    const top = double ? 'M5 28l45-19 45 19-45 20z' : 'M20 28l30-14 30 14-30 16z';
    const pedestal = double ? '<path d="M32 43v24M68 43v24" stroke="' + b + '" stroke-width="9"/><path d="M23 67h18M59 67h18" stroke="' + b + '" stroke-width="6"/>' : '<path d="M50 43v25" stroke="' + b + '" stroke-width="10"/><path d="M38 69h24" stroke="' + b + '" stroke-width="6"/>';
    const plates = double ? `<ellipse cx="32" cy="27" rx="9" ry="4" fill="${c}"/><ellipse cx="68" cy="27" rx="9" ry="4" fill="${c}"/>` : `<ellipse cx="50" cy="28" rx="9" ry="4" fill="${c}"/>`;
    return svg(`<path d="${top}" fill="${a}"/>${pedestal}${plates}`);
  }
  if (kind === 'stove' || kind === 'kitchen') {
    const grill = skin?.id === 'grillStove' ? '<path d="M25 13h50M25 19h50M25 25h50M32 11v18M43 11v18M54 11v18M65 11v18" stroke="' + c + '" stroke-width="2"/>' : '';
    const burners = grill ? '' : `<ellipse cx="35" cy="20" rx="7" ry="5" fill="${skin?.id === 'futureStove' ? c : '#161b1d'}"/><ellipse cx="63" cy="20" rx="7" ry="5" fill="${skin?.id === 'futureStove' ? c : '#161b1d'}"/><ellipse cx="43" cy="12" rx="6" ry="4" fill="#161b1d"/><ellipse cx="70" cy="12" rx="6" ry="4" fill="#161b1d"/>`;
    return svg(`<path d="M23 23h54v47H23z" fill="${a}"/><path d="M18 10h64v23H18z" fill="${b}"/>${burners}${grill}<path d="M32 43h36v19H32z" fill="${skin?.id === 'stoneOven' ? '#201b18' : b}"/><path d="M37 36h5M48 36h5M59 36h5" stroke="${c}" stroke-width="4"/>`);
  }
  if (kind === 'counter') return svg(`<path d="M16 26l38-15 32 18-38 16z" fill="${c}"/><path d="M16 26v34l32 13 38-18V29L48 45z" fill="${a}"/><path d="M24 45l18 8v5l-18-8zM54 47l24-11v5L54 52z" fill="${b}"/><ellipse cx="50" cy="25" rx="10" ry="4" fill="#fff0cf"/>${skin?.id === 'neonCounter' ? `<path d="M23 55l21 9 32-15" fill="none" stroke="${c}" stroke-width="3"/>` : ''}`);
  if (kind === 'chef' || kind === 'waiter' || kind === 'staff') {
    const chef = kind === 'chef';
    const special = skin?.id === 'goldChef' ? `<path d="M58 43v19" stroke="${c}" stroke-width="3" stroke-dasharray="2 5"/>`
      : skin?.id === 'streetChef' ? `<path d="M31 37h38" stroke="${c}" stroke-width="5"/>`
        : skin?.id === 'pastryChef' ? `<path d="M43 37v32" stroke="${c}" stroke-width="5"/>`
          : skin?.id === 'modernWaiter' ? `<path d="M50 41v27" stroke="${c}" stroke-width="4"/>` : '';
    const bow = !chef && (skin?.id === 'bowWaiter' || skin?.id === 'retroWaiter') ? `<path d="M43 35l7 5 7-5v9l-7-4-7 4z" fill="${c}"/>` : '';
    const hat = chef ? `<path d="M33 17Q28 4 40 6Q50-3 58 6Q73 4 66 19z" fill="${c}"/>` : skin?.id === 'retroWaiter' ? `<path d="M35 12h30v7H35z" fill="${b}"/>` : '';
    return svg(`<circle cx="50" cy="23" r="14" fill="#edb994"/><path d="M25 72l5-35 20-8 20 8 5 35z" fill="${a}"/><path d="M35 39h30v33H35z" fill="${chef ? b : c}"/>${special}${bow}${hat}`);
  }
  return null;
}
