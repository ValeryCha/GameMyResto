import { describe, expect, it } from 'vitest';
import { clampPage, pageBounds, pageCount } from '../src/ui/pagination';

describe('пагинация магазина', () => {
  it('рассчитывает страницы для адаптивных размеров и пустого списка', () => {
    expect(pageCount(32, 10)).toBe(4);
    expect(pageCount(32, 6)).toBe(6);
    expect(pageCount(32, 4)).toBe(8);
    expect(pageCount(0, 10)).toBe(1);
  });

  it('ограничивает текущую страницу при сокращении списка', () => {
    expect(clampPage(4, 32, 10)).toBe(4);
    expect(clampPage(4, 11, 10)).toBe(2);
    expect(clampPage(4, 0, 10)).toBe(1);
    expect(clampPage(0, 32, 10)).toBe(1);
  });

  it('возвращает границы видимых элементов без выхода за список', () => {
    expect(pageBounds(2, 32, 10)).toEqual({ start: 10, end: 20, page: 2 });
    expect(pageBounds(4, 32, 10)).toEqual({ start: 30, end: 32, page: 4 });
    expect(pageBounds(9, 3, 4)).toEqual({ start: 0, end: 3, page: 1 });
  });
});
