import './shopPanel.css';
import type { FurnitureKind, GameState } from '../simulation/types';

export type ShopItem = {
  id: 'waiter' | 'counter' | 'table' | 'tableDouble' | 'chair' | 'plant' | 'door' | 'limit' | 'expand';
  label: string;
  price: number;
  category: string;
  furniture?: FurnitureKind;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'waiter', label: 'Официант', price: 200, category: 'Сотрудники' },
  { id: 'counter', label: 'Стойка выдачи', price: 300, category: 'Мебель', furniture: 'counter' },
  { id: 'table', label: 'Стол 1×1', price: 100, category: 'Мебель', furniture: 'table' },
  { id: 'tableDouble', label: 'Стол 2×1', price: 200, category: 'Мебель', furniture: 'tableDouble' },
  { id: 'chair', label: 'Стул', price: 75, category: 'Мебель', furniture: 'chair' },
  { id: 'plant', label: 'Растение', price: 50, category: 'Мебель', furniture: 'plant' },
  { id: 'door', label: 'Перенести дверь', price: 100, category: 'Дверь' },
  { id: 'limit', label: '+1 гость', price: 600, category: 'Лимиты' },
  { id: 'expand', label: 'Расширить +2×2', price: 50000, category: 'Расширение' },
];

export const canAfford = (state: GameState, item: ShopItem): boolean => state.coins >= item.price;

export interface ShopCallbacks {
  onHire(): void;
  onLimit(): void;
  onExpand(): void;
  onPlace(kind: FurnitureKind): void;
  onMoveDoor(): void;
}

export function createShopPanel(callbacks: ShopCallbacks) {
  const root = document.createElement('aside');
  root.className = 'shop-panel';
  root.hidden = true;
  root.setAttribute('aria-label', 'Магазин ресторана');
  const header = document.createElement('div');
  header.className = 'shop-header';
  const title = document.createElement('strong');
  title.textContent = 'Магазин';
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Закрыть';
  closeButton.addEventListener('click', () => root.classList.remove('is-open'));
  header.append(title, closeButton);
  const summary = document.createElement('div');
  summary.className = 'shop-summary';
  root.append(header, summary);
  const buttons = new Map<string, HTMLButtonElement>();
  for (const category of ['Сотрудники', 'Мебель', 'Дверь', 'Лимиты', 'Расширение']) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = category;
    section.append(heading);
    for (const item of SHOP_ITEMS.filter((candidate) => candidate.category === category)) {
      const button = document.createElement('button');
      button.className = 'shop-item';
      button.dataset.shopItem = item.id;
      button.textContent = `${item.label} — ${item.price} монет`;
      button.addEventListener('click', () => {
        if (item.furniture) callbacks.onPlace(item.furniture);
        else if (item.id === 'waiter') callbacks.onHire();
        else if (item.id === 'limit') callbacks.onLimit();
        else if (item.id === 'expand') callbacks.onExpand();
        else if (item.id === 'door') callbacks.onMoveDoor();
      });
      buttons.set(item.id, button);
      section.append(button);
    }
    root.append(section);
  }
  document.body.append(root);
  return {
    update(state: GameState) {
      summary.textContent = `Баланс: ${state.coins} монет · Рейтинг: ${state.popularity.toFixed(1)}`;
      for (const item of SHOP_ITEMS) buttons.get(item.id)!.disabled = !canAfford(state, item);
    },
    setVisible(visible: boolean) {
      root.hidden = !visible;
      if (!visible) root.classList.remove('is-open');
    },
    open() { root.classList.add('is-open'); },
    close() { root.classList.remove('is-open'); },
  };
}
