import { setButtonIcon, type IconName } from './icons';

export interface MainMenuCallbacks {
  onPlay(): void;
  onNewGame(): void;
  onSoundChange(enabled: boolean): void;
}

function button(label: string, onClick: () => void, primary = false): HTMLButtonElement {
  const element = document.createElement('button');
  element.className = primary ? 'menu-button primary' : 'menu-button';
  const icons: Record<string, IconName> = { 'Играть': 'play', 'Новая игра': 'reset', 'Настройки': 'settings', 'Об игре': 'info', 'Назад': 'back', 'Начать заново': 'check', 'Отмена': 'close' };
  setButtonIcon(element, label, icons[label] ?? 'check');
  element.addEventListener('click', onClick);
  return element;
}

export function createMainMenu(callbacks: MainMenuCallbacks) {
  const root = document.createElement('div');
  root.className = 'menu-root';

  const main = document.createElement('section');
  main.className = 'menu-screen';
  const mainPanel = document.createElement('div');
  mainPanel.className = 'menu-panel';
  const logo = document.createElement('h1');
  logo.className = 'game-logo';
  logo.textContent = 'Мой ресторан';
  const subtitle = document.createElement('p');
  subtitle.className = 'menu-subtitle';
  subtitle.textContent = 'Создайте уютное место, куда хочется возвращаться';
  const facade = document.createElement('div');
  facade.className = 'restaurant-facade';
  facade.setAttribute('aria-hidden', 'true');
  facade.innerHTML = '<div class="facade-sign">МОЙ РЕСТОРАН</div><div class="facade-window"></div><div class="facade-door"></div><div class="facade-plant"></div>';
  const balance = document.createElement('p');
  balance.className = 'menu-balance';
  balance.dataset.testid = 'menu-balance';
  mainPanel.append(
    logo, subtitle, facade, balance,
    button('Играть', callbacks.onPlay, true),
    button('Новая игра', () => show(reset)),
    button('Настройки', () => show(settings)),
    button('Об игре', () => show(about)),
  );
  main.append(mainPanel);

  const settings = document.createElement('section');
  settings.className = 'menu-screen';
  settings.hidden = true;
  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'menu-panel compact-panel';
  const settingsTitle = document.createElement('h2');
  settingsTitle.textContent = 'Настройки';
  const soundLabel = document.createElement('label');
  soundLabel.className = 'sound-setting';
  const sound = document.createElement('input');
  sound.type = 'checkbox';
  sound.checked = localStorage.getItem('moy-restoran:sound') !== 'off';
  sound.addEventListener('change', () => callbacks.onSoundChange(sound.checked));
  soundLabel.append(sound, document.createTextNode(' Звук'));
  const soundNote = document.createElement('p');
  soundNote.textContent = 'Настройка сохранена. Звуковое сопровождение появится в следующем обновлении.';
  settingsPanel.append(settingsTitle, soundLabel, soundNote, button('Назад', () => show(main)));
  settings.append(settingsPanel);

  const about = document.createElement('section');
  about.className = 'menu-screen';
  about.hidden = true;
  const aboutPanel = document.createElement('div');
  aboutPanel.className = 'menu-panel compact-panel';
  const aboutTitle = document.createElement('h2');
  aboutTitle.textContent = 'Об игре';
  const aboutText = document.createElement('p');
  aboutText.textContent = 'Принимайте гостей, готовьте блюда и развивайте свой ресторан. Покупайте украшения на заработанные монеты. Ваш прогресс сохраняется автоматически.';
  aboutPanel.append(aboutTitle, aboutText, button('Назад', () => show(main)));
  about.append(aboutPanel);

  const reset = document.createElement('section');
  reset.className = 'menu-screen';
  reset.hidden = true;
  const resetPanel = document.createElement('div');
  resetPanel.className = 'menu-panel compact-panel';
  const resetTitle = document.createElement('h2');
  resetTitle.textContent = 'Новая игра';
  const warning = document.createElement('p');
  warning.textContent = 'Удалить текущий прогресс?';
  const resetNote = document.createElement('p');
  resetNote.textContent = 'Ресторан, монеты и все покупки будут сброшены. Это действие нельзя отменить.';
  resetPanel.append(resetTitle, warning, resetNote, button('Начать заново', callbacks.onNewGame, true), button('Отмена', () => show(main)));
  reset.append(resetPanel);

  const screens = [main, settings, about, reset];
  root.append(...screens);
  document.body.append(root);

  function show(screen: HTMLElement): void {
    for (const item of screens) item.hidden = item !== screen;
    screen.querySelector<HTMLButtonElement>('button')?.focus();
  }

  return {
    show() { root.hidden = false; show(main); },
    hide() { root.hidden = true; },
    setBalance(coins: number) { balance.textContent = `Текущий баланс: ${coins} монет`; },
    showSettings() { show(settings); },
    showAbout() { show(about); },
    showResetConfirmation() { show(reset); },
  };
}
