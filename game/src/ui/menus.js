// DOM menus around the canvas: title screen with the field manual and save status,
// pause panel, and the respawn card after death or arrest. Kept separate from the HUD.
// The HUD draws the in-world play state; these panels are pure DOM and only appear when the
// simulation is paused or stopped.
import { formatCash } from '../config.js';

export class Menus {
  constructor(game) {
    this.game = game;
    this.startScreen = document.getElementById('start-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.deathScreen = document.getElementById('death-screen');
    this.startButton = document.getElementById('btn-start');
    this.continueButton = document.getElementById('btn-continue');
    this.resetButton = document.getElementById('btn-reset');
    this.saveNote = document.getElementById('save-note');
    this.toastElement = document.getElementById('toast');
    this.toastTimer = 0;
    this.deathTitle = document.getElementById('death-title');
    this.deathKicker = document.getElementById('death-kicker');
    this.deathCopy = document.getElementById('death-copy');
    this.deathCost = document.getElementById('death-cost');
    this.bind();
    this.refreshStart();
  }

  bind() {
    this.startButton.addEventListener('click', () => {
      this.game.audio.ensure();
      this.game.startFromMenu(false);
    });
    this.continueButton?.addEventListener('click', () => {
      this.game.audio.ensure();
      this.game.startFromMenu(false);
    });
    this.resetButton.addEventListener('click', () => {
      this.game.newGame();
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.game.resume());
    document.getElementById('btn-save').addEventListener('click', () => {
      this.game.saveProgress();
      this.toast('PROGRESS SAVED');
    });
    document.getElementById('btn-abandon').addEventListener('click', () => this.game.returnToTitle());
    document.getElementById('btn-respawn').addEventListener('click', () => this.game.respawnFromMenu());
  }

  refreshStart() {
    const hasSave = this.game.saveSystem?.hasSave;
    if (hasSave) {
      this.startButton.innerHTML = 'Continue story <small>Enter</small>';
      this.resetButton.hidden = false;
      const saved = this.game.saveSystem.data;
      this.saveNote.textContent = `Saved run · ${formatCash(saved?.cash ?? 0)} · job ${Math.min(5, (saved?.missionIndex ?? 0) + 1)} of 5`;
    } else {
      this.startButton.innerHTML = 'Start Game <small>Enter</small>';
      this.resetButton.hidden = true;
      this.saveNote.textContent = 'No save on this machine · progress saves at the garage';
    }
    this.continueButton.hidden = true;
  }

  showStart() {
    this.startScreen.hidden = false;
    this.pauseScreen.hidden = true;
    this.deathScreen.hidden = true;
    this.refreshStart();
  }

  hideAll() {
    this.startScreen.hidden = true;
    this.pauseScreen.hidden = true;
    this.deathScreen.hidden = true;
  }

  showPause() {
    this.pauseScreen.hidden = false;
  }

  hidePause() {
    this.pauseScreen.hidden = true;
  }

  showDeath({ kicker, title, copy, cost }) {
    this.deathKicker.textContent = kicker;
    this.deathTitle.textContent = title;
    this.deathCopy.textContent = copy;
    this.deathCost.textContent = formatCash(cost);
    this.deathScreen.hidden = false;
  }

  hideDeath() {
    this.deathScreen.hidden = true;
  }

  toast(text, duration = 3000) {
    this.toastElement.textContent = text;
    this.toastElement.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastElement.classList.remove('show'), duration);
  }
}
