export function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RNG = () => number;

export function seeded(seed: string): RNG {
  const seedGen = xmur3(String(seed));
  return mulberry32(seedGen());
}
export const rand = {
  int(rng: RNG, min: number, max: number) { return Math.floor(rng() * (max - min + 1)) + min; },
  pick<T>(rng: RNG, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; },
  chance(rng: RNG, p: number) { return rng() < p; }
};
