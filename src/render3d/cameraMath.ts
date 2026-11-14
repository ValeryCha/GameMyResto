export function fitZoom(width: number, height: number, aspect: number): number {
  const roomHeight = Math.max(12, Math.max(width, height) + 4);
  return Math.min(1, 12 / roomHeight * Math.min(1, aspect));
}
