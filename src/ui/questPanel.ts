import './questPanel.css';
import { QUESTS } from '../content/quests';
import type { GameState } from '../simulation/types';

export function createQuestPanel() {
  const root = document.createElement('aside');
  root.className = 'quest-panel';
  root.hidden = true;
  root.setAttribute('aria-label', 'Текущее задание');
  const heading = document.createElement('strong');
  const description = document.createElement('span');
  const reward = document.createElement('small');
  root.append(heading, description, reward);
  const toast = document.createElement('div');
  toast.className = 'quest-toast';
  toast.hidden = true;
  toast.setAttribute('aria-label', 'Уведомление о выполненном задании');
  document.body.append(root, toast);
  let knownCompleted = new Set<string>();
  let initialized = false;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  return {
    update(state: GameState) {
      const quest = QUESTS.find((item) => item.level === state.level);
      heading.textContent = quest ? `Задание ${quest.level}: ${quest.title}` : 'Все задания выполнены';
      description.textContent = quest?.description ?? 'Продолжайте развивать ресторан';
      reward.textContent = quest ? `Награда: ${30 * quest.level} опыта · ${100 * quest.level * quest.level} монет` : '';
      if (!initialized) {
        knownCompleted = new Set(state.completedQuestIds);
        initialized = true;
        return;
      }
      const completedId = state.completedQuestIds.find((id) => !knownCompleted.has(id));
      if (!completedId) return;
      knownCompleted = new Set(state.completedQuestIds);
      const completedQuest = QUESTS.find((item) => `quest-${item.level}` === completedId);
      toast.textContent = `Задание выполнено: ${completedQuest?.title ?? completedId}`;
      toast.hidden = false;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { toast.hidden = true; }, 3000);
    },
    setVisible(visible: boolean) {
      root.hidden = !visible;
      if (!visible) {
        toast.hidden = true;
        if (hideTimer) clearTimeout(hideTimer);
      }
    },
  };
}
