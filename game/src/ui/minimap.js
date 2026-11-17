// North-up minimap: roads, blocks, park, surf, mission waypoint, police blips, gang
// contacts and the player's heading. Drawn into the HUD canvas, so it needs no images.
import { ROAD_X, ROAD_Z, ROAD_HALF, WATER_Z, BEACH_Z, PARK, BLOCK_CENTRES_X, BLOCK_CENTRES_Z, PALETTE } from '../config.js';

export class Minimap {
  constructor() {
    this.scale = 0.58;
    this.worldRadius = 155;
  }

  draw(ctx, game, cx, cy, radius) {
    const player = game.player;
    const px = player.position.x;
    const pz = player.position.z;
    const scale = radius / this.worldRadius;
    const mapX = (x) => cx + (x - px) * scale;
    const mapY = (z) => cy + (z - pz) * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Ground and water.
    ctx.fillStyle = '#b8ab8f';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = '#e3ca98';
    ctx.fillRect(cx - radius, Math.max(cy - radius, mapY(BEACH_Z)), radius * 2, radius * 2);
    ctx.fillStyle = '#1c8ba0';
    ctx.fillRect(cx - radius, mapY(WATER_Z), radius * 2, radius * 2);
    ctx.fillStyle = 'rgba(14,58,68,.32)';
    ctx.fillRect(cx - radius, mapY(WATER_Z + 18), radius * 2, radius * 2);

    // Blocks.
    for (const bx of BLOCK_CENTRES_X) {
      for (const bz of BLOCK_CENTRES_Z) {
        const x = mapX(bx - 48);
        const y = mapY(bz - 48);
        const size = 96 * scale;
        ctx.fillStyle = bx === PARK.x && bz === PARK.z ? '#4f7848' : '#7d7d78';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = 'rgba(34,38,37,.18)';
        ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
      }
    }

    // Roads over the blocks.
    ctx.lineWidth = ROAD_HALF * 2 * scale;
    ctx.strokeStyle = '#3a4142';
    ctx.lineCap = 'butt';
    for (const x of ROAD_X) {
      ctx.beginPath();
      ctx.moveTo(mapX(x), mapY(-290));
      ctx.lineTo(mapX(x), mapY(350));
      ctx.stroke();
    }
    for (const z of ROAD_Z) {
      ctx.beginPath();
      ctx.moveTo(mapX(-320), mapY(z));
      ctx.lineTo(mapX(320), mapY(z));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(235,224,191,.55)';
    ctx.lineWidth = 1;
    for (const x of ROAD_X) {
      ctx.beginPath();
      ctx.moveTo(mapX(x), mapY(-260));
      ctx.lineTo(mapX(x), mapY(275));
      ctx.stroke();
    }
    for (const z of ROAD_Z) {
      ctx.beginPath();
      ctx.moveTo(mapX(-260), mapY(z));
      ctx.lineTo(mapX(260), mapY(z));
      ctx.stroke();
    }

    // Waypoint and dotted route.
    const marker = game.missions?.markerPosition;
    if (marker && game.missions.markerVisible) {
      let wx = mapX(marker.x);
      let wy = mapY(marker.z);
      const dx = wx - cx;
      const dy = wy - cy;
      const dist = Math.hypot(dx, dy);
      const edge = radius - 14;
      let clamped = false;
      if (dist > edge) {
        wx = cx + (dx / dist) * edge;
        wy = cy + (dy / dist) * edge;
        clamped = true;
      }
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(255,210,102,.72)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.mission;
      ctx.strokeStyle = '#2b2a20';
      ctx.lineWidth = 2;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.restore();
      if (clamped) {
        ctx.fillStyle = PALETTE.mission;
        ctx.beginPath();
        ctx.arc(wx, wy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Enemies and police. The map is small, so each blip is a crisp two-pixel mark.
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const ex = mapX(enemy.position.x);
      const ez = mapY(enemy.position.z);
      if (Math.hypot(ex - cx, ez - cy) > radius - 4) continue;
      ctx.fillStyle = enemy.kind === 'cop' ? '#5bb8ff' : '#e45b4c';
      ctx.beginPath();
      ctx.arc(ex, ez, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const unit of game.wanted.units) {
      if (!unit.vehicle) continue;
      const ex = mapX(unit.vehicle.position.x);
      const ez = mapY(unit.vehicle.position.z);
      if (Math.hypot(ex - cx, ez - cy) > radius - 4) continue;
      ctx.fillStyle = '#74c8ff';
      ctx.beginPath();
      ctx.arc(ex, ez, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d2632';
      ctx.beginPath();
      ctx.arc(ex, ez, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ped of game.pedestrians.pedestrians.slice(0, 18)) {
      if (ped.dead) continue;
      const ex = mapX(ped.position.x);
      const ez = mapY(ped.position.z);
      if (Math.hypot(ex - cx, ez - cy) > radius - 4) continue;
      ctx.fillStyle = 'rgba(255,248,228,.6)';
      ctx.fillRect(ex - 0.8, ez - 0.8, 1.6, 1.6);
    }

    // Player heading triangle.
    const heading = game.player.currentVehicle?.heading ?? game.player.heading;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-heading);
    ctx.fillStyle = '#fff6da';
    ctx.strokeStyle = '#17252a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Vinyl-style edge shadow.
    const edgeGrad = ctx.createRadialGradient(cx, cy, radius * 0.55, cx, cy, radius);
    edgeGrad.addColorStop(0, 'rgba(4,16,20,0)');
    edgeGrad.addColorStop(1, 'rgba(4,16,20,.45)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,241,211,.8)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(8,24,30,.65)';
    ctx.stroke();
    ctx.restore();

    // North marker.
    ctx.save();
    ctx.fillStyle = '#ffe9b4';
    ctx.font = '700 10px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - radius - 10);
    ctx.restore();
  }
}
