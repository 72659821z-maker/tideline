// The heads-up display, painted with the 2D canvas: health, cash, wanted stars,
// mission objective and distance, minimap, weapon/ammo, speedometer, subtitles, prompts.
import { PALETTE, formatCash, districtAt } from '../config.js';
import { Minimap } from './minimap.js';

const font = (size, weight = 600) => `${weight} ${size}px "Segoe UI", "Trebuchet MS", Arial, sans-serif`;
const displayFont = (size) => `900 ${size}px Impact, "Arial Black", "Segoe UI", sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function starPath(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export class HUD {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.minimap = new Minimap();
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.visible = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  draw() {
    const ctx = this.ctx;
    const game = this.game;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (!this.visible || game.mode === 'title') return;
    const w = this.width;
    const h = this.height;
    const player = game.player;
    const driving = Boolean(player.currentVehicle);

    this.drawTopLeft(ctx, game);
    this.drawWanted(ctx, game, w);
    this.drawMinimap(ctx, game);
    this.drawObjective(ctx, game, w, h);
    this.drawMissionBanner(ctx, game, w, h);
    this.drawDialogue(ctx, game, w, h);
    this.drawPrompt(ctx, game, w, h);
    if (driving) this.drawSpeedometer(ctx, game, w, h);
    else this.drawWeapon(ctx, game, w, h);
    this.drawCrosshair(ctx, game, w, h);
    this.drawCinematicBars(ctx, game, w, h);
  }

  drawTopLeft(ctx, game) {
    const player = game.player;
    const x = 30;
    const y = 28;
    ctx.save();
    ctx.fillStyle = 'rgba(5,18,23,.68)';
    roundRect(ctx, x - 10, y - 10, 248, 64, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(x - 10, y - 10, 3, 64);

    ctx.fillStyle = '#ffd99a';
    ctx.font = font(10, 700);
    ctx.letterSpacing = '2px';
    ctx.fillText('RAFA SOLANO', x, y + 4);
    ctx.fillStyle = 'rgba(255,244,220,.55)';
    ctx.font = font(9, 600);
    ctx.fillText(districtAt(player.position.x, player.position.z), x, y + 20);

    const barW = 196;
    const barY = y + 29;
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    roundRect(ctx, x, barY, barW, 10, 3);
    ctx.fill();
    const ratio = Math.max(0, player.health / player.maxHealth);
    const healthColor = ratio < 0.3 ? '#e45743' : ratio < 0.6 ? '#e1b34a' : '#69d68e';
    const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
    grad.addColorStop(0, healthColor);
    grad.addColorStop(1, ratio < 0.3 ? '#ff8b70' : '#9ae7ac');
    ctx.fillStyle = grad;
    roundRect(ctx, x, barY, barW * ratio, 10, 3);
    ctx.fill();
    for (let i = 1; i < 4; i += 1) {
      ctx.fillStyle = 'rgba(6,20,24,.45)';
      ctx.fillRect(x + (barW / 4) * i, barY, 1.5, 10);
    }
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = font(9, 700);
    ctx.fillText(`${Math.ceil(player.health)}`, x + barW + 8, barY + 9);
    ctx.fillStyle = 'rgba(255,244,220,.52)';
    ctx.font = font(8, 600);
    ctx.fillText('HEALTH', x + barW - 36, barY - 5);
    ctx.strokeStyle = 'rgba(255,244,220,.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, barY, barW, 10);
    ctx.restore();
  }

  drawWanted(ctx, game, w) {
    const stars = game.wanted.stars;
    const x = w - 30;
    const y = 42;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(5,18,23,.62)';
    roundRect(ctx, w - 233, 18, 203, 95, 4);
    ctx.fill();
    ctx.fillStyle = stars > 0 ? '#ffce57' : 'rgba(255,244,220,.5)';
    ctx.font = font(9, 700);
    ctx.fillText(stars > 0 ? `WANTED  ${stars}/5` : 'NO ACTIVE WARRANT', x, y - 14);
    const starsStart = x - 4 * 34 - 8;
    for (let i = 0; i < 5; i += 1) {
      const sx = starsStart + i * 34;
      starPath(ctx, sx, y + 14, 13, 6.2);
      if (i < stars) {
        ctx.fillStyle = stars >= 4 ? '#ffb84d' : '#ffdc72';
        ctx.fill();
        ctx.strokeStyle = '#4b2d13';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,244,220,.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,244,220,.33)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f2e4c7';
    ctx.font = font(17, 700);
    ctx.fillText(formatCash(game.cash), x, y + 67);
    ctx.fillStyle = 'rgba(255,244,220,.45)';
    ctx.font = font(8, 700);
    ctx.fillText('CASH', x - 78, y + 67);
    ctx.restore();
  }

  drawMinimap(ctx, game) {
    const radius = 94;
    const cx = 30 + radius;
    const cy = this.height - 32 - radius;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,18,23,.82)';
    ctx.fill();
    ctx.shadowBlur = 0;
    this.minimap.draw(ctx, game, cx, cy, radius);
    ctx.fillStyle = 'rgba(7,23,28,.82)';
    roundRect(ctx, cx - 76, cy - radius - 32, 152, 19, 3);
    ctx.fill();
    ctx.fillStyle = '#f6e7c8';
    ctx.font = font(9, 700);
    ctx.textAlign = 'center';
    ctx.fillText(districtAt(game.player.position.x, game.player.position.z), cx, cy - radius - 19);
    ctx.restore();
  }

  drawObjective(ctx, game, w, h) {
    if (!game.missions) return;
    const objective = game.missions.objective || game.missionObjective;
    if (!objective) return;
    const width = Math.min(560, w - 330);
    const x = w / 2 - width / 2;
    const y = h - 88;
    ctx.save();
    ctx.fillStyle = 'rgba(5,18,23,.76)';
    roundRect(ctx, x, y, width, 58, 4);
    ctx.fill();
    ctx.fillStyle = game.missions.active ? PALETTE.mission : 'rgba(255,255,255,.45)';
    ctx.fillRect(x, y, 3, 58);
    ctx.fillStyle = game.missions.active ? '#ffd47b' : 'rgba(255,243,218,.55)';
    ctx.font = font(8.5, 800);
    const kicker = game.missions.mission
      ? `CURRENT JOB ${String(game.missions.mission.number).padStart(2, '0')} // ${game.missions.mission.title.toUpperCase()}`
      : game.missions.availableMission
        ? `NEXT JOB ${String(game.missions.availableMission.number).padStart(2, '0')} // ${game.missions.availableMission.title.toUpperCase()}`
        : 'FREE ROAM // MARISOL BAY';
    ctx.fillText(kicker, x + 16, y + 17);
    ctx.fillStyle = '#fff5dd';
    ctx.font = font(14.5, 700);
    const lines = wrapText(ctx, objective, width - 130);
    ctx.fillText(lines[0], x + 16, y + 37);
    if (lines[1]) ctx.fillText(lines[1], x + 16, y + 51);
    const marker = game.missions.markerPosition;
    if (marker && game.missions.markerVisible) {
      const distance = Math.round(Math.hypot(marker.x - game.player.position.x, marker.z - game.player.position.z));
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.mission;
      ctx.font = font(19, 800);
      ctx.fillText(distance > 1000 ? `${(distance / 1000).toFixed(1)} KM` : `${distance} M`, x + width - 16, y + 31);
      ctx.fillStyle = 'rgba(255,244,220,.48)';
      ctx.font = font(8, 700);
      ctx.fillText('WAYPOINT', x + width - 16, y + 44);
    } else if (game.missions.stage?.type === 'escape') {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff7a61';
      ctx.font = font(16, 800);
      ctx.fillText('EVADE', x + width - 16, y + 33);
    }
    ctx.restore();
  }

  drawMissionBanner(ctx, game, w, h) {
    const banner = game.missionBanner;
    if (!banner || banner.time <= 0) return;
    const alpha = Math.min(1, banner.time / 0.6) * Math.min(1, (banner.duration - banner.time) / 0.35 + 0.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    const center = w / 2;
    const y = 64;
    ctx.textAlign = 'center';
    const grad = ctx.createLinearGradient(center - 260, 0, center + 260, 0);
    grad.addColorStop(0, 'rgba(5,18,23,0)');
    grad.addColorStop(0.5, 'rgba(5,18,23,.76)');
    grad.addColorStop(1, 'rgba(5,18,23,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(center - 290, y - 28, 580, 78);
    ctx.fillStyle = '#ffd47b';
    ctx.font = font(9.5, 800);
    ctx.fillText(banner.kicker ?? 'MARISOL BAY', center, y - 9);
    ctx.fillStyle = '#fff7e6';
    ctx.font = displayFont(33);
    ctx.fillText(banner.title ?? '', center, y + 20);
    if (banner.sub) {
      ctx.fillStyle = 'rgba(255,244,220,.66)';
      ctx.font = font(10, 600);
      ctx.fillText(banner.sub.toUpperCase(), center, y + 38);
    }
    ctx.restore();
  }

  drawDialogue(ctx, game, w, h) {
    const dialogue = game.dialogue;
    if (!dialogue || !dialogue.active) return;
    const line = dialogue.current;
    if (!line) return;
    const width = Math.min(720, w - 420);
    const x = w / 2 - width / 2;
    const y = h - 186;
    ctx.save();
    ctx.fillStyle = 'rgba(4,15,19,.83)';
    roundRect(ctx, x, y, width, 72, 4);
    ctx.fill();
    ctx.fillStyle = '#ffca69';
    ctx.fillRect(x, y, 3, 72);
    ctx.fillStyle = '#ffd27f';
    ctx.font = font(10, 800);
    ctx.fillText(dialogue.current.speaker.toUpperCase(), x + 20, y + 22);
    ctx.fillStyle = '#f8efd9';
    ctx.font = font(14, 500);
    const lines = wrapText(ctx, dialogue.current.text, width - 40);
    lines.forEach((text, index) => ctx.fillText(text, x + 20, y + 43 + index * 18));
    ctx.fillStyle = 'rgba(255,244,220,.35)';
    ctx.font = font(8, 600);
    ctx.textAlign = 'right';
    ctx.fillText('E  CONTINUE', x + width - 18, y + 63);
    ctx.restore();
  }

  drawPrompt(ctx, game, w, h) {
    if (!game.prompt) return;
    const text = game.prompt;
    ctx.save();
    ctx.font = font(11, 700);
    const textWidth = ctx.measureText(text).width;
    const width = textWidth + 82;
    const x = w / 2 - width / 2;
    const y = h - 218;
    ctx.fillStyle = 'rgba(4,15,19,.82)';
    roundRect(ctx, x, y, width, 34, 3);
    ctx.fill();
    ctx.fillStyle = '#ffca69';
    roundRect(ctx, x + 9, y + 7, 25, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#1b1207';
    ctx.font = font(10, 800);
    ctx.textAlign = 'center';
    ctx.fillText('F', x + 21.5, y + 21);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff0d2';
    ctx.font = font(11, 700);
    ctx.fillText(text, x + 43, y + 21);
    ctx.restore();
  }

  drawWeapon(ctx, game, w, h) {
    const player = game.player;
    const x = w - 30;
    const y = h - 34;
    const panelWidth = 236;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(5,18,23,.74)';
    roundRect(ctx, x - panelWidth, y - 64, panelWidth, 64, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.fillRect(x - panelWidth, y - 64, 3, 64);
    ctx.fillStyle = '#9eb6b6';
    ctx.font = font(8, 700);
    ctx.fillText('WEAPON', x - 14, y - 47);
    ctx.fillStyle = '#fff1d5';
    ctx.font = font(15, 700);
    ctx.fillText(player.weapon === 'pistol' ? 'PISTOL' : 'FISTS', x - 14, y - 24);
    if (player.weapon === 'pistol') {
      ctx.fillStyle = '#ffce72';
      ctx.font = font(25, 800);
      ctx.fillText(String(game.ammo).padStart(2, '0'), x - 112, y - 21);
      ctx.fillStyle = 'rgba(255,244,220,.4)';
      ctx.font = font(8, 700);
      ctx.fillText('ROUNDS', x - 112, y - 8);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,244,220,.25)';
      ctx.font = font(8, 600);
      ctx.fillText('1 / 2  SWITCH', x - panelWidth + 14, y - 8);
    } else {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,244,220,.3)';
      ctx.font = font(8, 600);
      ctx.fillText('1 / 2  SWITCH', x - panelWidth + 14, y - 8);
    }
    ctx.restore();
  }

  drawSpeedometer(ctx, game, w, h) {
    const vehicle = game.player.currentVehicle;
    if (!vehicle) return;
    const cx = w - 113;
    const cy = h - 105;
    const radius = 63;
    const speed = Math.min(220, vehicle.speedKmh);
    const start = Math.PI * 0.78;
    const end = Math.PI * 2.22;
    const t = Math.min(1, speed / 220);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,18,23,.67)';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.stroke();
    const grad = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
    grad.addColorStop(0, '#58c9c1');
    grad.addColorStop(0.65, '#ffd16f');
    grad.addColorStop(1, '#ff6b4c');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + (end - start) * t);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i += 1) {
      const angle = start + ((end - start) * i) / 10;
      const inner = radius - (i % 2 === 0 ? 9 : 5);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
    }
    const needleAngle = start + (end - start) * t;
    ctx.strokeStyle = '#ff7258';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 12), cy + Math.sin(needleAngle) * (radius - 12));
    ctx.stroke();
    ctx.fillStyle = '#fff5df';
    ctx.font = displayFont(28);
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(speed)), cx, cy + 7);
    ctx.fillStyle = 'rgba(255,244,220,.55)';
    ctx.font = font(8, 700);
    ctx.fillText('KM/H', cx, cy + 22);
    ctx.fillStyle = vehicle.forwardSpeed < -0.5 ? '#ff9a73' : '#ffd274';
    ctx.font = font(8, 800);
    ctx.fillText(vehicle.forwardSpeed < -0.5 ? 'R' : 'D', cx, cy + 38);
    ctx.fillStyle = 'rgba(255,244,220,.7)';
    ctx.font = font(9, 700);
    ctx.fillText(vehicle.name.toUpperCase(), cx, cy + 52);
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillRect(cx - 20, h - 30, 40, 2);
    ctx.restore();
  }

  drawCrosshair(ctx, game, w, h) {
    if (game.player.currentVehicle || game.mode !== 'playing') return;
    const cx = w / 2;
    const cy = h / 2;
    const aiming = game.input.mouseDown(2);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,244,220,.82)';
    ctx.fillStyle = 'rgba(255,244,220,.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, aiming ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
    const gap = aiming ? 10 : 7;
    const length = aiming ? 7 : 5;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * gap, cy + dy * gap);
      ctx.lineTo(cx + dx * (gap + length), cy + dy * (gap + length));
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCinematicBars(ctx, game, w, h) {
    if (!game.cinematic) return;
    ctx.save();
    ctx.fillStyle = '#050b0d';
    ctx.fillRect(0, 0, w, 34);
    ctx.fillRect(0, h - 34, w, 34);
    ctx.restore();
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
