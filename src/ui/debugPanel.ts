import './debugPanel.css';
import type { GameState } from '../simulation/types';

export function createDebugPanel() {
  const button = document.createElement('button');
  button.className = 'debug-toggle';
  button.textContent = 'D';
  button.title = 'Состояние гостей';
  button.setAttribute('aria-label', 'Состояние гостей');
  const panel = document.createElement('aside');
  panel.className = 'debug-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Отладка состояния гостей');
  const title = document.createElement('strong');
  title.textContent = 'Состояние гостей';
  const list = document.createElement('pre');
  panel.append(title, list);
  document.body.append(button, panel);
  const toggle = () => { panel.hidden = !panel.hidden; };
  button.addEventListener('click', toggle);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyD' && !event.repeat && !(event.target instanceof HTMLInputElement)) toggle();
  });
  return {
    update(state: GameState) {
      list.textContent = state.customers.length
        ? state.customers.map((guest) => [
          guest.id,
          `state=${guest.state} pos=${guest.position.x},${guest.position.y}`,
          `target=${guest.target ? `${guest.target.x},${guest.target.y}` : '—'} seat=${guest.seatId ?? '—'} order=${guest.orderId ?? '—'}`,
        ].join('\n')).join('\n\n')
        : 'Гостей пока нет';
    },
    toggle,
    setVisible(visible: boolean) {
      button.hidden = !visible;
      if (!visible) panel.hidden = true;
    },
  };
}
