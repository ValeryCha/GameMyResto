import './questPanel.css';
import { QUESTS } from '../content/quests';
import { experienceThreshold } from '../simulation/progression';
import type { GameState } from '../simulation/types';
import { createIcon, setButtonIcon, type IconName } from './icons';

export function createQuestPanel(onClose?: () => void) {
  const root = document.createElement('aside');
  root.className = 'quest-panel';
  root.hidden = true;
  root.setAttribute('aria-label', 'Прогресс ресторана');
  const header = document.createElement('div');
  header.className = 'progress-header';
  const title = document.createElement('strong');
  title.textContent = 'Прогресс';
  const closeButton = document.createElement('button');
  setButtonIcon(closeButton, 'Закрыть', 'close');
  closeButton.addEventListener('click', () => { close(); onClose?.(); });
  header.append(title, closeButton);
  const level = document.createElement('h2');
  const experience = document.createElement('span');
  const bar = document.createElement('progress');
  bar.setAttribute('aria-label', 'Опыт до следующего уровня');
  const levelBlock = document.createElement('section');
  levelBlock.className = 'level-progress';
  levelBlock.append(level, experience, bar);
  const rating = document.createElement('section');
  rating.className = 'rating-breakdown';
  rating.setAttribute('aria-label', 'Детализация рейтинга');
  const list = document.createElement('div');
  list.className = 'quest-list';
  const rows = QUESTS.map((quest, index) => {
    const item = document.createElement('article');
    item.className = 'quest-item';
    const name = document.createElement('strong');
    name.className = 'quest-title';
    name.append(createIcon(quest.icon), document.createTextNode(`${index + 1}. ${quest.title}`));
    const description = document.createElement('span');
    description.textContent = quest.description;
    const reward = document.createElement('small');
    reward.textContent = quest.reward.experience
      ? `Награда: ${quest.reward.experience} опыта · ${quest.reward.coins} монет`
      : `Награда: ${quest.reward.coins} монет`;
    const status = document.createElement('small');
    item.append(name, description, reward, status);
    list.append(item);
    return { item, status, id: quest.id, quest };
  });
  root.append(header, levelBlock, rating, list);
  const toast = document.createElement('div');
  toast.className = 'quest-toast';
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-label', 'Уведомление о прогрессе');
  document.body.append(root, toast);
  let knownCompleted = new Set<string>();
  let knownLevel = 1;
  let initialized = false;
  let queue: string[] = [];
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const showNext = () => {
    if (hideTimer || queue.length === 0) return;
    toast.textContent = queue.shift()!;
    toast.hidden = false;
    hideTimer = setTimeout(() => {
      hideTimer = undefined;
      toast.hidden = true;
      showNext();
    }, 2000);
  };
  const close = () => root.classList.remove('is-open');
  return {
    update(state: GameState) {
      const atMaxLevel = state.level >= 33;
      const threshold = atMaxLevel ? state.experience : experienceThreshold(state.level);
      level.textContent = atMaxLevel ? 'Уровень 33 — максимум' : `Уровень ${state.level}`;
      experience.textContent = atMaxLevel ? 'Все расширения за уровни получены' : `${state.experience} / ${threshold} опыта`;
      bar.max = Math.max(threshold, 1);
      bar.value = Math.min(state.experience, bar.max);
      rating.replaceChildren();
      const ratingTitle = document.createElement('strong');
      ratingTitle.append(createIcon('rating'), document.createTextNode(`Рейтинг: ${Math.round(state.popularity)}`));
      const details = document.createElement('span');
      details.textContent = `Декорации: +${Math.round(state.decorationRatingBonus)} · Обслуживание: ${Math.round(state.popularity - state.decorationRatingBonus)}`;
      rating.append(ratingTitle, details);
      const activeQuest = QUESTS.find((quest) => quest.level === state.level && !state.completedQuestIds.includes(quest.id));
      for (const row of rows) {
        const completed = state.completedQuestIds.includes(row.id);
        const active = row.quest === activeQuest;
        row.item.classList.toggle('is-complete', completed);
        row.item.classList.toggle('is-active', active);
        row.status.textContent = completed ? 'Выполнено' : active ? 'Активно' : `Откроется на уровне ${row.quest.level}`;
      }
      if (!initialized) {
        knownCompleted = new Set(state.completedQuestIds);
        knownLevel = state.level;
        initialized = true;
        return;
      }
      for (const id of state.completedQuestIds) {
        if (knownCompleted.has(id)) continue;
        const quest = QUESTS.find((item) => item.id === id);
        if (quest) queue.push(`Задание выполнено: ${quest.title}. ${quest.reward.experience ? `+${quest.reward.experience} опыта, ` : ''}+${quest.reward.coins} монет`);
      }
      if (state.level > knownLevel) {
        for (let next = knownLevel + 1; next <= state.level; next++) queue.push(`Уровень ${next}!${next % 5 === 0 ? ' Бонус: расширение 2×2' : ''}`);
      }
      knownCompleted = new Set(state.completedQuestIds);
      knownLevel = state.level;
      showNext();
    },
    open() { root.classList.add('is-open'); },
    close,
    setVisible(visible: boolean) {
      root.hidden = !visible;
      if (!visible) {
        close();
        toast.hidden = true;
        queue = [];
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = undefined;
      }
    },
  };
}
