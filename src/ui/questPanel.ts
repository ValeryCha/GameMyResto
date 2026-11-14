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
  document.body.append(root);
  return {
    update(state: GameState) {
      const quest = QUESTS.find((item) => item.level === state.level);
      heading.textContent = quest ? `Задание ${quest.level}: ${quest.title}` : 'Все задания выполнены';
      description.textContent = quest?.description ?? 'Продолжайте развивать ресторан';
      reward.textContent = quest ? `Награда: ${30 * quest.level} опыта · ${100 * quest.level * quest.level} монет` : '';
    },
    setVisible(visible: boolean) { root.hidden = !visible; },
  };
}
