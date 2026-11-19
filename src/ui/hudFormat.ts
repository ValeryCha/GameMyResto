export function formatGuestsStat(guests: number, capacity: number): string {
  const free = Math.max(0, capacity - guests);
  return `${guests} занято · свободно ${free} · лимит ${capacity}`;
}