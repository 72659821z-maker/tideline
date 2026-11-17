// The fixed geography and tuning shared by the world, the HUD and the mission data.
// Marisol Bay is a five-by-five street grid on a south-facing coast: five north–south
// avenues, five east–west streets, sixteen city blocks, a beach and an open ocean.
// Change a number here and the whole city moves: nothing else hard-codes these coordinates.
export const GAME_TITLE = 'TIDELINE';
export const CITY_NAME = 'MARISOL BAY';
export const STORY_TAGLINE = 'A Marisol Bay Story';
export const SAVE_KEY = 'tideline.marisol.save.v1';

/** Avenue centres, west to east. */
export const ROAD_X = [-240, -120, 0, 120, 240];
/** Street centres, north to south. The last one is the waterfront boulevard. */
export const ROAD_Z = [-220, -100, 20, 140, 260];
export const ROAD_HALF = 9;
export const SIDEWALK = 5;
/** Half-width of the building plot inside one block. */
export const BLOCK_HALF = 50;
export const CITY_LIMIT_X = 318;
export const CITY_LIMIT_Z = 352;
export const NORTH_LIMIT = -286;
export const WATER_Z = 332;
export const BEACH_Z = 286;
export const SHORE_Z = 348;
export const LANE_OFFSET = 4.5;
export const WORLD_SEED = 20261117;

export const BLOCK_CENTRES_X = [-180, -60, 60, 180];
export const BLOCK_CENTRES_Z = [-160, -40, 80, 200];

/** The park occupies the south-west city block. */
export const PARK = { x: -60, z: 80, half: 46, name: 'CORAL PARK' };
/** Rafa's garage and the story's home marker. */
export const GARAGE = { x: 66, z: 72, name: 'SOLANO MOTOR CO.' };
export const PLAYER_SPAWN = { x: 70, z: 82, heading: 0.35 };
export const PIER = { x: 76, z: 292, name: 'PIER 9' };
export const MARINA = { x: -180, z: 274, name: 'MARISOL MARINA' };
export const LIGHTHOUSE = { x: 270, z: 315, name: 'THE NARROWS LIGHT' };

export const DISTRICTS = [
  { name: 'WAREHOUSE ROW', x: -180, z: -160 },
  { name: 'OLD TOWN', x: -60, z: -160 },
  { name: 'CIVIC CENTER', x: 60, z: -160 },
  { name: 'VISTA HEIGHTS', x: 180, z: -160 },
  { name: 'WEST END', x: -180, z: -40 },
  { name: 'MARKET DISTRICT', x: -60, z: -40 },
  { name: 'DOWNTOWN', x: 60, z: -40 },
  { name: 'NEON ROW', x: 180, z: -40 },
  { name: 'CORAL PARK', x: -60, z: 80 },
  { name: 'LITTLE HARBOR', x: 60, z: 80 },
  { name: 'DESIGN DISTRICT', x: 180, z: 80 },
  { name: 'MARISOL MARINA', x: -180, z: 200 },
  { name: 'BEACHSIDE', x: -60, z: 200 },
  { name: 'PIER 9', x: 60, z: 200 },
  { name: 'SOUTH POINT', x: 180, z: 200 },
  { name: 'THE NARROWS', x: 270, z: 315 },
];

/** Palette shared by the 3D scene and the canvas HUD. */
export const PALETTE = {
  sun: '#ffb84d',
  coral: '#ff5b45',
  teal: '#14a6a6',
  ink: '#08181e',
  cream: '#fff4dc',
  sea: '#1c9fb4',
  deepSea: '#0b667c',
  sand: '#e9c98e',
  grass: '#568a4a',
  asphalt: '#353a3c',
  roadLine: '#f4e6bd',
  wanted: '#ffce57',
  health: '#67d68d',
  police: '#5db7ff',
  mission: '#ffd45c',
};

export const WEAPONS = {
  fists: { name: 'FISTS', ammo: Infinity, damage: 28, cooldown: 0.38, range: 2.05 },
  pistol: { name: 'PISTOL', ammo: 12, damage: 62, cooldown: 0.22, range: 58 },
};

export const PLAYER = {
  walkSpeed: 4.6,
  sprintSpeed: 7.8,
  jumpSpeed: 7.2,
  gravity: 22,
  radius: 0.46,
  maxHealth: 100,
};

export const WANTED = {
  maxStars: 5,
  decayDelay: 13,
  decayStep: 7,
  respawnCashLoss: 250,
};

export const TRAFFIC = {
  count: 18,
  minSpeed: 9,
  maxSpeed: 15,
  stealRadius: 3.6,
  laneOffset: 4.5,
};

export function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const district of DISTRICTS) {
    const d = (district.x - x) ** 2 + (district.z - z) ** 2;
    if (d < bestD) { bestD = d; best = district; }
  }
  return best.name;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Approach a target at a fixed rate, without overshooting. */
export function approach(value, target, delta) {
  if (value < target) return Math.min(target, value + delta);
  return Math.max(target, value - delta);
}

export function formatCash(value) {
  return `$${Math.max(0, Math.floor(value)).toLocaleString('en-US')}`;
}
