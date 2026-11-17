// A tiny seeded generator. The city, traffic and pedestrians use it so a given seed always
// gives the same streetscape and each staged screenshot is deterministic.
// Every consumer keeps its own stream, so adding a call in one place does not shift another.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRandom(seed = 1) {
  const next = mulberry32(seed);
  return {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    /** Pick from parallel weight tables; used for traffic mix and palette spreads. */
    weighted(items, weights) {
      let total = 0;
      for (const w of weights) total += w;
      let roll = next() * total;
      for (let i = 0; i < items.length; i += 1) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    shuffled(items) {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
