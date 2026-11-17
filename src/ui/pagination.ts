export function pageCount(itemCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, itemCount) / Math.max(1, pageSize)));
}

export function clampPage(page: number, itemCount: number, pageSize: number): number {
  return Math.min(pageCount(itemCount, pageSize), Math.max(1, Math.floor(page)));
}

export function pageBounds(page: number, itemCount: number, pageSize: number): { start: number; end: number; page: number } {
  const current = clampPage(page, itemCount, pageSize);
  const start = (current - 1) * pageSize;
  return { start, end: Math.min(itemCount, start + pageSize), page: current };
}
