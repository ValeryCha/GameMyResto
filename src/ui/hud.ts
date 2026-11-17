import type { GameState } from '../simulation/types';
import { getHudModel } from '../simulation/selectors';
import { experienceThreshold } from '../simulation/progression';
import { calendarView } from '../simulation/calendar';
import { createIcon, setButtonIcon, type IconName } from './icons';
import { peakBottleneck } from '../simulation/peak';
import { QUEUE_LIMIT } from '../simulation/queue';
import type { PeakResult } from '../simulation/types';

interface HudCallbacks {
  onShop(): void;
  onMenu(): void;
  onCancel(): void;
  onEditor(): void;
  onProgress(): void;
  onCalendar(): void;
}

type PanelName = 'shop' | 'editor' | 'progress' | 'calendar';

export function createHud(callbacks: HudCallbacks) {
  const root = document.createElement('section');
  root.className = 'hud-panel';
  root.hidden = true;
  root.setAttribute('aria-label', 'Показатели ресторана');
  const text = document.createElement('div');
  text.className = 'hud-status';
  text.dataset.testid = 'hud-status';
  const values: Record<string, HTMLSpanElement> = {};
  const ratingChange = document.createElement('small');
  ratingChange.className = 'hud-rating-change';
  for (const [key, label] of [['coins', 'Монеты'], ['popularity', 'Рейтинг'], ['guests', 'Гости'], ['peak', 'Пик']]) {
    const item = document.createElement('span');
    item.className = `hud-stat hud-stat--${key}`;
    const accessibleLabel = document.createElement('span');
    accessibleLabel.className = 'sr-only';
    accessibleLabel.textContent = `${label}: `;
    item.append(createIcon(key === 'popularity' ? 'rating' : key === 'coins' ? 'coins' : key === 'guests' ? 'guest' : 'peak'), accessibleLabel);
    const value = document.createElement('span');
    value.className = 'hud-value';
    item.append(value);
    if (key === 'popularity') {
      item.title = 'Рейтинг влияет на частоту визитов, терпение и чаевые до 20%';
      item.append(ratingChange);
    }
    values[key] = value;
    text.append(item);
  }
  const experience = document.createElement('div');
  experience.className = 'hud-experience';
  experience.dataset.testid = 'hud-experience';
  const experienceLevel = document.createElement('span');
  experienceLevel.className = 'hud-level';
  const experienceBar = document.createElement('progress');
  experienceBar.setAttribute('aria-label', 'Опыт до следующего уровня');
  const experienceValue = document.createElement('small');
  experience.append(experienceLevel, experienceBar, experienceValue);
  const actions = document.createElement('div');
  actions.className = 'hud-actions';
  const navigation = new Map<PanelName | 'menu', HTMLButtonElement>();
  const makeButton = (id: PanelName | 'menu', label: string, icon: IconName, callback: () => void) => {
    const button = document.createElement('button');
    button.className = 'hud-action';
    setButtonIcon(button, label, icon);
    button.addEventListener('click', callback);
    navigation.set(id, button);
    actions.append(button);
  };
  makeButton('shop', 'Магазин', 'shop', callbacks.onShop);
  makeButton('editor', 'Обстановка', 'editor', callbacks.onEditor);
  makeButton('progress', 'Прогресс', 'progress', callbacks.onProgress);
  makeButton('calendar', 'Календарь', 'calendar', callbacks.onCalendar);
  makeButton('menu', 'Меню', 'menu', callbacks.onMenu);
  const calendarBadge = document.createElement('span');
  calendarBadge.className = 'hud-badge';
  calendarBadge.hidden = true;
  calendarBadge.setAttribute('aria-hidden', 'true');
  calendarBadge.textContent = '1';
  navigation.get('calendar')!.append(calendarBadge);
  const hint = document.createElement('div');
  hint.className = 'hud-hint';
  hint.hidden = true;
  const hintText = document.createElement('span');
  const cancel = document.createElement('button');
  cancel.className = 'hud-cancel';
  setButtonIcon(cancel, 'Готово', 'check');
  cancel.addEventListener('click', callbacks.onCancel);
  hint.append(hintText, cancel);
  root.append(text, experience, actions, hint);
  const toast = document.createElement('div');
  toast.className = 'hud-toast';
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  const peakBanner = document.createElement('div');
  peakBanner.className = 'hud-peak-banner';
  peakBanner.dataset.testid = 'peak-banner';
  peakBanner.hidden = true;
  peakBanner.setAttribute('role', 'status');
  const peakResult = document.createElement('div');
  peakResult.className = 'hud-peak-result';
  peakResult.dataset.testid = 'peak-result';
  peakResult.hidden = true;
  peakResult.setAttribute('role', 'status');
  peakResult.setAttribute('aria-label', 'Итог пикового часа');
  const queueIndicator = document.createElement('div');
  queueIndicator.className = 'hud-peak-result';
  queueIndicator.dataset.testid = 'guest-queue';
  queueIndicator.style.top = '222px';
  queueIndicator.hidden = true;
  queueIndicator.setAttribute('aria-label', 'Очередь у входа');
  document.body.append(root, toast, peakBanner, peakResult, queueIndicator);
  let previousRating: number | undefined;
  let ratingTimer: ReturnType<typeof setTimeout> | undefined;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let peakResultTimer: ReturnType<typeof setTimeout> | undefined;
  let observedPeakResult: PeakResult | null | undefined;
  return {
    update(state: GameState, today: string) {
      const model = getHudModel(state);
      values.coins.textContent = String(model.coins);
      values.popularity.textContent = model.popularity;
      values.guests.textContent = `${model.guests} · мест ${model.capacity}`;
      values.guests.parentElement!.title = `Планируемый поток: ${model.arrivalsPer60.toFixed(1)} гостей за 60 с`;
      values.peak.textContent = model.peak ? `${model.peakRemaining} с` : `через ${model.peakRemaining} с`;
      values.peak.parentElement?.classList.toggle('is-peak', model.peak);
      const firstQueued = state.customers.find((guest) => guest.id === state.guestQueue[0]);
      const queuePatience = firstQueued
        ? Math.ceil(Math.max(0, (firstQueued.queuePatience ?? 0) - (firstQueued.queueWaitedTicks ?? 0)))
        : 0;
      queueIndicator.textContent = `Очередь: ${state.guestQueue.length}/${QUEUE_LIMIT}${firstQueued ? ` · терпение первого: ${queuePatience} с` : ''}`;
      const phase = ((state.tick % 180) + 180) % 180;
      if (state.peakState.current) {
        peakBanner.hidden = false;
        peakBanner.textContent = `Пик: ${60 - phase} с · обслужено ${state.peakState.current.served} · недовольных ${state.peakState.current.unhappy}`;
      } else if (phase >= 170) {
        peakBanner.hidden = false;
        peakBanner.textContent = `Пик через ${180 - phase} · лимитирует: ${peakBottleneck(state)}`;
      } else {
        peakBanner.hidden = true;
      }
      if (observedPeakResult === undefined) {
        observedPeakResult = state.peakState.last;
      } else if (state.peakState.last && state.peakState.last !== observedPeakResult) {
        observedPeakResult = state.peakState.last;
        const result = state.peakState.last;
        const grade = result.bonusXP === 50 ? 'отлично' : result.bonusXP === 20 ? 'хорошо' : 'пройден';
        peakResult.textContent = `Пик: ${grade} · обслужено ${result.served} · недовольных ${result.unhappy} · сервис ${Math.round(result.serviceRatio * 100)}% · завершено ${Math.round(result.completion * 100)}%${result.bonusCoins ? ` · +${result.bonusCoins} монет, +${result.bonusXP} опыта` : ''}`;
        peakResult.hidden = false;
        if (peakResultTimer) clearTimeout(peakResultTimer);
        peakResultTimer = setTimeout(() => { peakResult.hidden = true; }, 6000);
      }
      const atMaxLevel = state.level >= 33;
      const threshold = atMaxLevel ? state.experience : experienceThreshold(state.level);
      experienceLevel.textContent = String(state.level);
      experienceLevel.setAttribute('aria-label', atMaxLevel ? 'Уровень 33 — максимум' : `Уровень ${state.level}`);
      experienceLevel.title = atMaxLevel ? 'Максимальный уровень' : `Уровень ${state.level}`;
      experienceValue.textContent = atMaxLevel ? 'Максимум' : `${state.experience} / ${threshold}`;
      experienceBar.max = Math.max(threshold, 1);
      experienceBar.value = Math.min(state.experience, experienceBar.max);
      calendarBadge.hidden = calendarView(state, today).availableIndex < 0;
      if (previousRating !== undefined && Math.abs(state.popularity - previousRating) > 0.001) {
        const delta = state.popularity - previousRating;
        ratingChange.textContent = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
        ratingChange.classList.toggle('is-negative', delta < 0);
        if (ratingTimer) clearTimeout(ratingTimer);
        ratingTimer = setTimeout(() => { ratingChange.textContent = ''; }, 2000);
      }
      previousRating = state.popularity;
    },
    setActivePanel(active: PanelName | null) {
      navigation.forEach((button, id) => button.classList.toggle('is-active', id === active));
    },
    setPlacement(label: string | null, reason?: string) {
      hint.hidden = !label;
      root.classList.toggle('is-placing', Boolean(label));
      hintText.textContent = reason || (label ? `Выберите клетку: ${label}` : '');
    },
    notify(message: string) {
      toast.textContent = message;
      toast.hidden = false;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 2000);
    },
    setVisible(visible: boolean) {
      root.hidden = !visible;
      queueIndicator.hidden = !visible;
      if (!visible) {
        toast.hidden = true;
        peakBanner.hidden = true;
        peakResult.hidden = true;
        if (peakResultTimer) clearTimeout(peakResultTimer);
        peakResultTimer = undefined;
      }
    },
  };
}
