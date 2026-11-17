import { describe, expect, it } from 'vitest';
import { DISHES, dishPrice, recipeCost } from '../src/content/dishes';
import { createGame } from '../src/simulation/createGame';
import { buyRecipe } from '../src/simulation/shop';

describe('33 рецепта', () => {
  it('имеет уникальные id, уровни и цены блюд', () => {
    expect(DISHES).toHaveLength(33);
    expect(new Set(DISHES.map((dish) => dish.id)).size).toBe(33);
    DISHES.forEach((dish, index) => {
      expect(dish.unlockLevel).toBe(index + 1);
      expect(dish.price).toBe(5 + 2 * index);
      expect(dish.name.length).toBeGreaterThan(1);
    });
    expect(dishPrice(33)).toBe(69);
  });

  it('использует согласованную кривую стоимости', () => {
    expect([1, 2, 3, 10, 20, 33].map(recipeCost)).toEqual([0, 450, 750, 3850, 9850, 19350]);
  });

  it('покупает рецепт только на нужном уровне и один раз', () => {
    const state = createGame();
    expect(buyRecipe(state, 'pasta')).toEqual({ ok: false, reason: 'Нужен 2 уровень' });
    state.level = 2;
    expect(buyRecipe(state, 'pasta').ok).toBe(true);
    expect(state.coins).toBe(550);
    expect(state.unlockedDishIds).toContain('pasta');
    const coins = state.coins;
    expect(buyRecipe(state, 'pasta')).toEqual({ ok: false, reason: 'Рецепт уже куплен' });
    expect(state.coins).toBe(coins);
  });

  it('не тратит монеты на неизвестный или недоступный рецепт', () => {
    const state = createGame();
    expect(buyRecipe(state, 'missing')).toEqual({ ok: false, reason: 'Рецепт не найден' });
    expect(state.coins).toBe(1000);
  });
});
