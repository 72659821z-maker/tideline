// The in-world save: cash, story progress, ammo and a timestamp in localStorage.
// Everything is clamped on the way back in, so a hand-edited or stale save cannot corrupt a run.
import { SAVE_KEY } from '../config.js';

export class SaveSystem {
  constructor() {
    this.hasSave = false;
    this.data = null;
  }

  load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const missionIndex = Number.isFinite(parsed.missionIndex) ? Math.max(0, Math.min(5, Math.floor(parsed.missionIndex))) : 0;
      const cash = Number.isFinite(parsed.cash) ? Math.max(0, Math.floor(parsed.cash)) : 0;
      const ammo = Number.isFinite(parsed.ammo) ? Math.max(0, Math.min(999, Math.floor(parsed.ammo))) : 36;
      this.data = { cash, missionIndex, ammo, savedAt: parsed.savedAt ?? null, storyComplete: Boolean(parsed.storyComplete) };
      this.hasSave = true;
      return this.data;
    } catch {
      return null;
    }
  }

  write(data) {
    try {
      const payload = {
        cash: Math.max(0, Math.floor(data.cash)),
        missionIndex: Math.max(0, Math.floor(data.missionIndex)),
        ammo: Math.max(0, Math.floor(data.ammo)),
        storyComplete: Boolean(data.storyComplete),
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.data = payload;
      this.hasSave = true;
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // A private window may refuse storage: nothing to clear.
    }
    this.hasSave = false;
    this.data = null;
  }
}
