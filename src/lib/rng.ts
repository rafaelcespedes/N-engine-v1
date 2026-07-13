/**
 * Seeded PRNG. Never use Math.random() in render code — determinism is a product
 * feature here, not a nicety. Same Params in, same pixels out, always.
 *
 * mulberry32: small, fast, good enough distribution for point sampling.
 */

export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive an independent stream from the master seed, so adding a new consumer
 * doesn't shift the sequence every other consumer sees.
 *
 * e.g. makeRng(deriveSeed(params.seed, "panels"))
 */
export function deriveSeed(seed: number, channel: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < channel.length; i++) {
    h = Math.imul(h ^ channel.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}
