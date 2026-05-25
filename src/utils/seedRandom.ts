/**
 * SeededRandom — Deterministic pseudo-random number generator.
 *
 * Uses the Mulberry32 algorithm for fast, reproducible random numbers.
 * Given the same seed, it will always produce the same sequence.
 *
 * This is essential for procedural world generation — the same chunk
 * coordinates always produce the same layout.
 */

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    // Ensure seed is a positive 32-bit integer
    this.seed = seed >>> 0;
  }

  /**
   * Generate the next random number in the sequence (0 to 1).
   * Uses Mulberry32 algorithm.
   */
  next(): number {
    let t = this.seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random number within a range [min, max].
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generate a random integer within a range [min, max] (inclusive).
   */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Pick a random element from an array.
   */
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[this.int(0, array.length - 1)];
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm.
   * Returns the shuffled array.
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Check if a random roll succeeds (returns true with given probability).
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Generate a random boolean with weighted probability.
   */
  weightedCoin(weight: number): boolean {
    return this.next() < weight;
  }

  /**
   * Generate a random hex color.
   */
  color(): string {
    const r = this.int(0, 255);
    const g = this.int(0, 255);
    const b = this.int(0, 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Generate a random hex color with constrained brightness.
   */
  colorWithBrightness(minBrightness: number = 0.2, maxBrightness: number = 0.8): string {
    const hsl = this.hslColor();
    hsl.l = minBrightness + this.next() * (maxBrightness - minBrightness);
    return this.hslToHex(hsl.h, hsl.s, hsl.l);
  }

  /**
   * Generate a random HSL color object.
   */
  hslColor(): { h: number; s: number; l: number } {
    return {
      h: this.next() * 360,
      s: 0.5 + this.next() * 0.5,
      l: 0.3 + this.next() * 0.4,
    };
  }

  /**
   * Create a new SeededRandom with a derived seed.
   * Useful for creating sub-randoms from a parent.
   */
  fork(): SeededRandom {
    const newSeed = (this.seed * 16807 + 12345) >>> 0;
    return new SeededRandom(newSeed);
  }

  /**
   * Reset the seed to the original value.
   */
  reset(originalSeed: number): void {
    this.seed = originalSeed >>> 0;
  }

  /**
   * Convert HSL to hex color string.
   */
  private hslToHex(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
