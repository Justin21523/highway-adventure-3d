// src/physics/CollisionSystem.ts

import { IVec3 } from '../types/core';

interface AABB {
  min: IVec3;
  max: IVec3;
}

/**
 * CollisionSystem
 * Provides high-performance AABB collision detection and response.
 * Designed to be called inside useFrame or physics tick. Zero GC pressure.
 */
export class CollisionSystem {
  private static instance: CollisionSystem | null = null;

  private constructor() {}

  static getInstance(): CollisionSystem {
    if (!this.instance) this.instance = new CollisionSystem();
    return this.instance;
  }

  /**
   * Checks if two AABBs intersect.
   * Returns overlap vector if collision occurs, null otherwise.
   */
  static checkAABB(a: AABB, b: AABB): IVec3 | null {
    const overlapX = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    const overlapY = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
    const overlapZ = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);

    if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
      // Find smallest penetration axis
      if (overlapX < overlapY && overlapX < overlapZ) {
        const sign = (a.min.x + a.max.x) < (b.min.x + b.max.x) ? -1 : 1;
        return { x: overlapX * sign, y: 0, z: 0 };
      }
      if (overlapY < overlapZ) {
        const sign = (a.min.y + a.max.y) < (b.min.y + b.max.y) ? -1 : 1;
        return { x: 0, y: overlapY * sign, z: 0 };
      }
      const sign = (a.min.z + a.max.z) < (b.min.z + b.max.z) ? -1 : 1;
      return { x: 0, y: 0, z: overlapZ * sign };
    }
    return null;
  }

  /**
   * Calculates AABB from center position and half-extents.
   */
  static createAABB(center: IVec3, halfExtents: IVec3): AABB {
    return {
      min: { x: center.x - halfExtents.x, y: center.y - halfExtents.y, z: center.z - halfExtents.z },
      max: { x: center.x + halfExtents.x, y: center.y + halfExtents.y, z: center.z + halfExtents.z }
    };
  }

  /**
   * Applies arcade-style collision response.
   * Modifies velocity and returns damage amount based on impact speed.
   */
  static applyResponse(
    currentVelocity: IVec3,
    overlap: IVec3,
    mass: number,
    impactThreshold: number
  ): { newVelocity: IVec3; damage: number } {
    const impactSpeed = Math.abs(currentVelocity.x * overlap.x + currentVelocity.y * overlap.y + currentVelocity.z * overlap.z);
    
    let newVel = { ...currentVelocity };
    let damage = 0;

    if (impactSpeed > impactThreshold) {
      damage = (impactSpeed - impactThreshold) * mass * 0.05;
      
      // Bounce response
      if (overlap.x !== 0) newVel.x *= -0.3;
      else if (overlap.z !== 0) newVel.z *= -0.3;
      else newVel.y = 2; // Pop up on vertical hit

      // Dampen
      newVel.x *= 0.7;
      newVel.z *= 0.7;
    }

    return { newVelocity: newVel, damage };
  }
  
  static checkOverlap(a: AABB, b: AABB): { overlaps: boolean; overlapVec: IVec3; depth: number } {
    const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    const oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
    const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);

    if (ox < 0 || oy < 0 || oz < 0) return { overlaps: false, overlapVec: { x: 0, y: 0, z: 0 }, depth: 0 };

    let axis = 'x'; let depth = ox;
    if (oy < depth) { axis = 'y'; depth = oy; }
    if (oz < depth) { axis = 'z'; depth = oz; }

    const centerA = { x: (a.min.x + a.max.x) / 2, y: (a.min.y + a.max.y) / 2, z: (a.min.z + a.max.z) / 2 };
    const centerB = { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2 };
    const dir = axis === 'x' ? Math.sign(centerA.x - centerB.x) : axis === 'y' ? Math.sign(centerA.y - centerB.y) : Math.sign(centerA.z - centerB.z);

    const overlapVec = {
      x: axis === 'x' ? depth * dir : 0,
      y: axis === 'y' ? depth * dir : 0,
      z: axis === 'z' ? depth * dir : 0
    };

    return { overlaps: true, overlapVec, depth };
  }

  static resolveArcadeImpact(velocity: IVec3, normal: IVec3, mass: number, restitution: number, damageThreshold: number) {
    const dot = velocity.x * normal.x + velocity.y * normal.y + velocity.z * normal.z;
    if (dot > 0) return { newVelocity: velocity, damage: 0 }; // Moving away

    const impactSpeed = Math.abs(dot);
    const newVel = {
      x: velocity.x + normal.x * dot * (1 + restitution),
      y: velocity.y + normal.y * dot * (1 + restitution),
      z: velocity.z + normal.z * dot * (1 + restitution)
    };
    const damage = impactSpeed > damageThreshold ? (impactSpeed - damageThreshold) * mass * 0.04 : 0;
    return { newVelocity: newVel, damage };
  }
}