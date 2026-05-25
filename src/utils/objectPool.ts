/**
 * ObjectPool — Generic object pooling utility.
 *
 * Reduces garbage collection by reusing objects instead of creating/destroying them.
 * Ideal for frequently created/destroyed objects like particles, projectiles, etc.
 *
 * Usage:
 *   const pool = new ObjectPool(() => new Particle(), (obj) => obj.reset());
 *   const particle = pool.acquire();
 *   // ... use particle ...
 *   pool.release(particle);
 */

export interface PoolStats {
  /** Total number of objects ever created */
  totalCreated: number;
  /** Number of objects currently in use */
  inUse: number;
  /** Number of objects available in the pool */
  available: number;
  /** Maximum pool size (if set) */
  maxSize: number | null;
}

export class ObjectPool<T> {
  private pool: T[] = [];
  private inUse = 0;
  private totalCreated = 0;

  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number | null;
  private initialSize: number;

  /**
   * Create a new object pool.
   *
   * @param createFn Function that creates a new object
   * @param resetFn Function that resets an object to its initial state
   * @param options Optional configuration
   */
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    options: {
      initialSize?: number;
      maxSize?: number;
    } = {},
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = options.maxSize ?? null;
    this.initialSize = options.initialSize ?? 0;

    // Pre-allocate initial objects
    for (let i = 0; i < this.initialSize; i++) {
      this.pool.push(this.createFn());
      this.totalCreated++;
    }
  }

  /**
   * Acquire an object from the pool.
   * Creates a new one if the pool is empty and under max size.
   *
   * @returns An object ready for use
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.maxSize === null || this.totalCreated < this.maxSize) {
      obj = this.createFn();
      this.totalCreated++;
    } else {
      // Pool is at max capacity — return the oldest available object
      // This shouldn't happen if maxSize is respected, but handle it gracefully
      throw new Error('Object pool at maximum capacity');
    }

    this.inUse++;
    return obj;
  }

  /**
   * Return an object to the pool.
   *
   * @param obj The object to return
   */
  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
    this.inUse--;
  }

  /**
   * Acquire multiple objects from the pool.
   *
   * @param count Number of objects to acquire
   * @returns Array of acquired objects
   */
  acquireMultiple(count: number): T[] {
    const objects: T[] = [];
    for (let i = 0; i < count; i++) {
      objects.push(this.acquire());
    }
    return objects;
  }

  /**
   * Release multiple objects to the pool.
   *
   * @param objects Array of objects to release
   */
  releaseMultiple(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }

  /**
   * Get pool statistics.
   */
  getStats(): PoolStats {
    return {
      totalCreated: this.totalCreated,
      inUse: this.inUse,
      available: this.pool.length,
      maxSize: this.maxSize,
    };
  }

  /**
   * Clear all objects from the pool.
   * Note: Does not release objects currently in use.
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Pre-allocate additional objects to the pool.
   *
   * @param count Number of objects to pre-allocate
   */
  preAllocate(count: number): void {
    const limit = this.maxSize ? Math.min(count, this.maxSize - this.totalCreated) : count;
    for (let i = 0; i < limit; i++) {
      this.pool.push(this.createFn());
      this.totalCreated++;
    }
  }

  /**
   * Get the current size of the available pool.
   */
  size(): number {
    return this.pool.length;
  }

  /**
   * Check if the pool has any available objects.
   */
  hasAvailable(): boolean {
    return this.pool.length > 0;
  }

  /**
   * Dispose of the pool and all objects.
   * Call this when the pool is no longer needed.
   */
  dispose(): void {
    this.clear();
    this.inUse = 0;
  }
}
