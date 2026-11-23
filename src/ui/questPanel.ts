import './questPanel.css';
import { QUESTS } from '../content/quests';
import { SIDE_QUESTS } from '../content/sideQuests';
import { DAILY_QUESTS } from '../content/dailyQuests';
import { experienceThreshold } from '../simulation/progression';
import { getHudModel } from '../simulation/selectors';
import { QUEUE_LIMIT } from '../simulation/queue';
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

  // Секция «Главные»
  const mainTitle = document.createElement('h3');
  mainTitle.textContent = 'Главные задания';
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

  // Секция «Побочные»
  const sideTitle = document.createElement('h3');
  sideTitle.textContent = 'Побочные задания';
  const sideList = document.createElement('div');
  sideList.className = 'side-quest-list';
  const sideRows = SIDE_QUESTS.map((quest) => {
    const item = document.createElement('article');
    item.className = 'side-quest-item';
    const name = document.createElement('strong');
    name.className = 'side-quest-title';
    name.append(createIcon(quest.icon), document.createTextNode(quest.title));
    const description = document.createElement('span');
    description.textContent = quest.description;
    const reward = document.createElement('small');
    reward.className = 'side-quest-reward';
    reward.textContent = `+${quest.reward} монет`;
    const lock = document.createElement('small');
    lock.className = 'side-quest-lock';
    lock.hidden = true;
    item.append(name, description, reward, lock);
    sideList.append(item);
    return { item, lock, quest };
  });

  // Секция «Ежедневные»
  const dailyTitle = document.createElement('h3');
  dailyTitle.textContent = 'Ежедневные задания';
  const dailyList = document.createElement('div');
  dailyList.className = 'daily-quest-list';
  const dailyRows = DAILY_QUESTS.map((quest) => {
    const item = document.createElement('article');
    item.className = 'daily-quest-item';
    const name = document.createElement('strong');
    name.className = 'daily-quest-title';
    name.append(createIcon(quest.icon), document.createTextNode(quest.title));
    const description = document.createElement('span');
    description.textContent = quest.description;
    const progressLabel = document.createElement('span');
    progressLabel.className = 'daily-quest-progress';
    const dailyBar = document.createElement('meter');
    dailyBar.max = Math.max(quest.target, 1);
    dailyBar.value = 0;
    const reward = document.createElement('small');
    reward.className = 'daily-quest-reward';
    reward.textContent = `+${quest.rewardCoins} монет`;
    const badge = document.createElement('small');
    badge.className = 'daily-quest-badge';
    badge.textContent = 'Выполнено';
    badge.hidden = true;
    item.append(name, description, progressLabel, dailyBar, reward, badge);
    dailyList.append(item);
    return { item, progressLabel, bar: dailyBar, badge, quest };
  });

  root.append(header, levelBlock, rating, mainTitle, list, sideTitle, sideList, dailyTitle, dailyList);

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
      const model = getHudModel(state);
      const details = document.createElement('span');
      details.textContent = `Декорации: +${Math.round(state.decorationRatingBonus)} · Обслуживание: ${Math.round(state.popularity - state.decorationRatingBonus)}`;
      const trend = document.createElement('span');
      trend.textContent = `Тренд за 60 тиков: ${model.ratingTrend} ${model.ratingDelta > 0 ? '+' : ''}${model.ratingDelta} · ${model.ratingReason}`;
      const guests = document.createElement('span');
      guests.textContent = `Места: ${model.occupiedSeats} занято / ${model.capacity} · Очередь: ${model.queue}/${QUEUE_LIMIT} · Поток: ${model.arrivalsPer60.toFixed(1)} приход / ${model.throughputPer60.toFixed(1)} обслуж.`;
      const team = document.createElement('span');
      team.textContent = `Официанты: ${model.team.waiters}/5 · Стойки: ${model.team.counters}/5 · Повара: ${model.team.chefs}/3 · Плиты: ${model.team.stoves}/3`;
      const upgrade = document.createElement('span');
      upgrade.className = 'progress-upgrade-hint';
      upgrade.textContent = model.upgrade.text;
      rating.append(ratingTitle, details, trend, guests, team, upgrade);
      if (state.peakState.last) {
        const peak = document.createElement('span');
        const result = state.peakState.last;
        peak.textContent = `Последний пик: обслужено ${result.served} · недовольных ${result.unhappy} · сервис ${Math.round(result.serviceRatio * 100)}% · +${result.bonusCoins} монет, +${result.bonusXP} опыта`;
        rating.append(peak);
      }

      // Главные
      const activeQuest = QUESTS.find((quest) => quest.level === state.level && !state.completedQuestIds.includes(quest.id));
      for (const row of rows) {
        const completed = state.completedQuestIds.includes(row.id);
        const active = row.quest === activeQuest;
        row.item.classList.toggle('is-complete', completed);
        row.item.classList.toggle('is-active', active);
        row.status.textContent = completed ? 'Выполнено' : active ? 'Активно' : `Откроется на уровне ${row.quest.level}`;
      }

      // Побочные
      for (const row of sideRows) {
        const completed = state.completedSideQuestIds.includes(row.quest.id);
        const parentDone = !row.quest.dependsOn
          || state.completedSideQuestIds.includes(row.quest.dependsOn)
          || state.completedQuestIds.includes(row.quest.dependsOn);
        const locked = !completed && !parentDone;
        row.item.classList.toggle('is-complete', completed);
        row.item.classList.toggle('is-locked', locked);
        row.item.classList.toggle('is-available', !completed && !locked);
        if (locked && row.quest.dependsOn) {
          const parentTitle = SIDE_QUESTS.find((p) => p.id === row.quest.dependsOn)?.title
            ?? QUESTS.find((p) => p.id === row.quest.dependsOn)?.title
            ?? row.quest.dependsOn;
          row.lock.textContent = `Требуется: ${parentTitle}`;
          row.lock.hidden = false;
        } else {
          row.lock.hidden = true;
          row.lock.textContent = '';
        }
      }

      // Ежедневные
      for (const row of dailyRows) {
        const active = state.dailyQuestState.id === row.quest.id;
        const current = active ? state.dailyQuestState.progress : 0;
        row.progressLabel.textContent = `${current} / ${row.quest.target}`;
        row.bar.value = Math.min(current, row.quest.target);
        row.badge.hidden = !(active && state.dailyQuestState.rewarded);
        row.item.classList.toggle('is-complete', active && state.dailyQuestState.rewarded);
        row.item.classList.toggle('is-active', active && !state.dailyQuestState.rewarded);
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