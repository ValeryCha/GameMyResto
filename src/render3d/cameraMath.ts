export function fitZoom(width: number, height: number, aspect: number): number {
  const roomHeight = Math.max(12, Math.max(width, height) + 4);
  return Math.min(1, (aspect < 1 ? 17 : 12) / roomHeight, aspect < 1 ? 0.7 : 1);
}

export function clampZoom(value: number, minimum: number): number {
  return Math.min(1.8, Math.max(minimum, value));
}
