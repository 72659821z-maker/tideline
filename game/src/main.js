// Boot: create Marisol Bay, load any save, and either open the title screen or stage a
// deterministic screenshot scene for the shots named in shots.json.
// Entry point only: it wires the DOM canvases to Game and never touches game state itself.
import { Game } from './game.js';
import { stageShot } from './systems/scenarios.js';

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;
const shot = params.get('shot');

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');

try {
  const game = new Game({ canvas, hudCanvas, seed, shotMode: Boolean(shot) });
  window.__game = game;
  window.game = game;

  if (shot) {
    document.body.classList.add('shot-mode');
    stageShot(game, shot);
    // The scene is frozen; the loop only repaints it so a headless screenshot always
    // captures a freshly composited canvas.
    game.startLoop();
    let frames = 0;
    const markReady = () => {
      frames += 1;
      if (frames >= 3) window.__shotReady = true;
      else requestAnimationFrame(markReady);
    };
    requestAnimationFrame(markReady);
  } else if (params.has('norender')) {
    document.body.dataset.ready = '1';
    window.__renderPaused = true;
  } else {
    game.startLoop();
  }
} catch (error) {
  console.error(error);
  const status = document.getElementById('status');
  if (status) status.textContent = `TIDELINE failed to start: ${error?.message ?? error}`;
  const title = document.querySelector('.title-zone h1');
  if (title) title.textContent = 'ENGINE STALLED';
}
