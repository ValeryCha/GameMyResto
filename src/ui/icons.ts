const ICON_MARKUP = {
  kitchen: '<path d="M5 9h14v5a7 7 0 0 1-14 0V9Z"/><path d="M8 9V7a4 4 0 0 1 8 0v2M3 9h18M8 20h8"/>',
  decor: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16l5-5 5 5 3-3 5 5M16 8h.01"/>',
  hall: '<path d="M4 10h16M6 10v9m12-9v9M8 6h8v4M3 16h4m10 0h4"/>',
  staff: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M8 14l4 3 4-3"/>',
  speed: '<path d="M13 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-2-1-3-1-3s4 2 4 6a7 7 0 0 1-14 0c0-5 4-8 8-12Z"/><path d="m9 17 3-3 3 3"/>',
  counter: '<path d="M3 17h18v4H3zM5 17v-3h14v3M7 11h10M9 11a3 3 0 0 1 6 0M12 6v2"/>',
  waiter: '<circle cx="9" cy="6" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M15 11h6M16 11a3 3 0 0 1 4 0M18 8v3M6 13l3 2 3-2"/>',
  training: '<circle cx="8" cy="6" r="3"/><path d="M2 21v-3a6 6 0 0 1 11-3M16 13h5v5M21 13l-6 6M5 13l3 2 2-1"/>',
  table: '<rect x="4" y="5" width="16" height="6" rx="1"/><path d="M7 11v8m10-8v8M5 19h4m6 0h4"/>',
  tableDouble: '<rect x="2" y="6" width="20" height="6" rx="1"/><path d="M6 12v7m12-7v7M4 19h4m8 0h4M12 6v6"/>',
  chair: '<path d="M6 3h9v9H6zM4 12h14v4H4zM6 16v5m10-5v5"/>',
  plant: '<path d="M8 14h8l-1 7H9l-1-7Z"/><path d="M12 14V8M12 11c-5 0-6-3-6-6 4 0 6 2 6 6Zm0 2c5 0 6-3 6-6-4 0-6 2-6 6Z"/>',
  door: '<path d="M5 21V3h12v18M5 21h15M13 12h.01"/><path d="m15 8 4-3m0 0v4m0-4h-4"/>',
  guest: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 11-3M18 13v7m-3.5-3.5h7"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 5h20v4H2zM12 5v16M12 5H8a3 3 0 1 1 3-3c1 2 1 3 1 3Zm0 0h4a3 3 0 1 0-3-3c-1 2-1 3-1 3Z"/>',
  coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 10v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4M4 14v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4"/>',
  shop: '<path d="M4 10v11h16V10M3 4h18l-2 6a3 3 0 0 1-5 1 3 3 0 0 1-4 0 3 3 0 0 1-4 0 3 3 0 0 1-5-1L3 4Z"/><path d="M9 21v-6h6v6"/>',
  editor: '<path d="M4 13V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6M2 13a3 3 0 0 1 3 3v2h14v-2a3 3 0 0 1 3-3M5 18v3m14-3v3M8 9h8"/>',
  progress: '<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/><path d="m3 7 5-4 6 5 6-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  recipe: '<path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3V3Z"/><path d="M8 3v18m3-13h5m-5 4h5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 4h2m4 0h2"/>',
  rating: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  peak: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M4 4l2 2m12 0 2-2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  reset: '<path d="M4 10a8 8 0 1 1 2 7M4 4v6h6"/>',
  sell: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  move: '<path d="M12 2v20M2 12h20M12 2 8 6m4-4 4 4M12 22l-4-4m4 4 4-4M2 12l4-4m-4 4 4 4M22 12l-4-4m4 4-4 4"/>',
  rotate: '<path d="M20 7v5h-5M4 17v-5h5M19 12a7 7 0 0 0-12-5L4 10m1 2a7 7 0 0 0 12 5l3-3"/>',
  wallpaper: '<path d="M5 3h12v18H5zM17 7h3v14H8M8 8h6M8 12h6M8 16h4"/>',
  floor: '<path d="m12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6M2 19l10 3 10-3"/>',
  window: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  zoomIn: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6m-3-3v6"/>',
  zoomOut: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
} as const;

export type IconName = keyof typeof ICON_MARKUP;
export const ICON_NAMES = Object.keys(ICON_MARKUP) as IconName[];

export function createIcon(name: IconName, className = ''): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = ICON_MARKUP[name];
  return svg;
}

export function setButtonIcon(button: HTMLButtonElement, label: string, icon: IconName): void {
  const text = document.createElement('span');
  text.className = 'sr-only';
  text.textContent = label;
  button.replaceChildren(createIcon(icon), text);
  button.setAttribute('aria-label', label);
  button.title = label;
}

export function createDishIcon(dishId: string, level: number): SVGSVGElement {
  const svg = createIcon('recipe');
  svg.dataset.dishIcon = dishId;
  const variant = (level - 1) % 6;
  const shapes = [
    '<path d="M5 12h14a7 7 0 0 1-14 0Z"/><path d="M8 8c0-2 2-2 2-4m3 4c0-2 2-2 2-4"/>',
    '<circle cx="12" cy="12" r="7"/><path d="m12 5 0 14M5 12h14"/>',
    '<path d="M5 9h14l-2 10H7L5 9Zm2-3h10l2 3H5l2-3Z"/>',
    '<path d="M6 18c0-7 2-12 6-12s6 5 6 12H6Z"/><path d="M9 10h6"/>',
    '<path d="M4 15c5-8 11-8 16 0-5 5-11 5-16 0Z"/><circle cx="15" cy="13" r="1"/>',
    '<path d="M7 5h10v14H7z"/><path d="M9 5V2m6 3V2M9 10h6m-6 4h6"/>',
  ];
  svg.innerHTML = `${shapes[variant]}<text x="19" y="21" text-anchor="end" fill="currentColor" stroke="none" font-size="7" font-weight="800">${level}</text>`;
  return svg;
}
