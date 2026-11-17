import './calendarPanel.css';
import { calendarReward, calendarView } from '../simulation/calendar';
import type { GameState } from '../simulation/types';
import { createIcon, setButtonIcon } from './icons';

interface CalendarCallbacks {
  onClaim(): number | undefined; onClose(): void;
}

export function createCalendarPanel(callbacks: CalendarCallbacks) {
  const root = document.createElement('aside');
  root.className = 'calendar-panel';
  root.hidden = true;
  root.setAttribute('aria-label', 'Календарь наград');

  const header = document.createElement('div');
  header.className = 'calendar-header';
  const title = document.createElement('strong');
  title.append(createIcon('calendar'), document.createTextNode('Календарь наград'));
  const closeButton = document.createElement('button');
  setButtonIcon(closeButton, 'Закрыть', 'close');
  closeButton.addEventListener('click', () => { root.classList.remove('is-open'); callbacks.onClose(); });
  header.append(title, closeButton);

  const summary = document.createElement('p');
  summary.className = 'calendar-summary';
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  const cells = Array.from({ length: 30 }, (_, index) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    cell.dataset.calendarDay = String(index);
    const number = document.createElement('span');
    number.className = 'calendar-day__number';
    number.textContent = `День ${index + 1}`;
    const reward = document.createElement('strong');
    reward.append(createIcon('coins'), document.createTextNode(String(calendarReward(index))));
    const status = document.createElement('small');
    cell.append(number, reward, status);
    grid.append(cell);
    return { cell, status };
  });
  const claim = document.createElement('button');
  claim.className = 'calendar-claim';
  claim.dataset.calendarClaim = '';
  const toast = document.createElement('div');
  toast.className = 'calendar-toast';
  toast.dataset.calendarToast = '';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  claim.addEventListener('click', () => {
    const reward = callbacks.onClaim();
    if (reward === undefined) return;
    toast.textContent = `Награда получена: +${reward} монет`;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
      toastTimer = undefined;
    }, 2000);
  });
  root.append(header, summary, grid, claim, toast);
  document.body.append(root);

  return {
    update(state: GameState, today: string) {
      const view = calendarView(state, today);
      summary.textContent = view.streakReset
        ? 'Календарный день пропущен — серия начинается заново.'
        : `Цикл ${view.cycle} · Получайте награду каждый день, пропуск сбрасывает серию.`;
      cells.forEach(({ cell, status }, index) => {
        const claimed = index < view.claimedCount;
        const available = index === view.availableIndex;
        cell.classList.toggle('is-claimed', claimed);
        cell.classList.toggle('is-available', available);
        cell.classList.toggle('is-locked', !claimed && !available);
        status.textContent = claimed ? 'Получено' : available ? 'Доступно' : 'Заблокировано';
      });
      claim.disabled = view.availableIndex < 0;
      const claimLabel = view.availableIndex < 0 ? 'Сегодня получено' : `Забрать ${calendarReward(view.availableIndex)} монет`;
      setButtonIcon(claim, claimLabel, view.availableIndex < 0 ? 'check' : 'gift');
    },
    open() { root.classList.add('is-open'); },
    close() { root.classList.remove('is-open'); },
    setVisible(visible: boolean) {
      root.hidden = !visible;
      if (!visible) {
        root.classList.remove('is-open');
        toast.hidden = true;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = undefined;
      }
    },
  };
}
