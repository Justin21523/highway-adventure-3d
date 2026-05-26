/**
 * Building and architecture types for procedural city generation.
 * These types define building structures, facades, and architectural elements.
 */

import type { Vector3Data, EntityId } from './core';
import type { ShopCategory } from './shop';

/** Type of building structure */
export type BuildingType =
  | 'convenienceStore'
  | 'gasStation'
  | 'coffeeShop'
  | 'restaurant'
  | 'shoppingCenter'
  | 'restArea'
  | 'garage'
  | 'office'
  | 'apartment'
  | 'warehouse'
  | 'parkingGarage'
  | 'gasTower'
  | 'driveThru'
  | 'billboard'
  | 'tollBooth'
  | 'tunnelEntrance'
  | 'bridgePillar';

/** Building architectural style */
export type BuildingStyle = 'modern' | 'industrial' | 'suburban' | 'urban' | 'rural';

/** Roof type for building generation */
export type RoofType = 'flat' | 'pitched' | 'domed' | 'stepped' | 'none';

/** Window pattern for building facade */
export type WindowPattern = 'grid' | 'vertical' | 'horizontal' | 'random' | 'none';

/** Building material type */
export type BuildingMaterial = 'concrete' | 'brick' | 'glass' | 'metal' | 'wood' | 'stone';

/** Configuration for a single building */
export interface BuildingConfig {
  /** Unique identifier */
  id: EntityId;
  /** Type of building */
  type: BuildingType;
  /** Position in world space */
  position: Vector3Data;
  /** Rotation in radians */
  rotation: number;
  /** Scale multiplier */
  scale: number;
  /** Primary color (hex string) */
  color: string;
  /** Secondary/accent color */
  accentColor: string;
  /** Roof type */
  roofType: RoofType;
  /** Window pattern */
  windowPattern: WindowPattern;
  /** Building material */
  material: BuildingMaterial;
  /** Number of floors */
  floors: number;
  /** Building width in meters */
  width: number;
  /** Building depth in meters */
  depth: number;
  /** Building height in meters */
  height: number;
  /** Whether building is interactive (has shop) */
  interactable: boolean;
  /** Associated shop ID (if interactable) */
  shopId?: string;
  /** Shop category (if interactable) */
  shopCategory?: ShopCategory;
  /** Sign text on building */
  signText?: string;
  /** Sign color */
  signColor: string;
  /** Has neon sign */
  hasNeonSign: boolean;
  /** Neon sign color */
  neonColor?: string;
  /** Has parking lot */
  hasParkingLot: boolean;
  /** Has drive-thru lane */
  hasDriveThru: boolean;
  /** Architectural style */
  style: BuildingStyle;
  /** LOD distances [near, medium, far] */
  lodDistances: [number, number, number];
}

/** Building facade component */
export interface BuildingFacade {
  /** Wall segments */
  walls: BuildingWall[];
  /** Windows */
  windows: BuildingWindow[];
  /** Doors */
  doors: BuildingDoor[];
  /** Signs */
  signs: BuildingSign[];
  /** Decorative elements */
  decorations: BuildingDecoration[];
}

/** Single wall segment of a building facade */
export interface BuildingWall {
  /** Position relative to building center */
  position: Vector3Data;
  /** Width in meters */
  width: number;
  /** Height in meters */
  height: number;
  /** Material type */
  material: BuildingMaterial;
  /** Color */
  color: string;
  /** Has texture */
  hasTexture: boolean;
}

/** Single window on building facade */
export interface BuildingWindow {
  /** Position relative to building center */
  position: Vector3Data;
  /** Width in meters */
  width: number;
  /** Height in meters */
  height: number;
  /** Is window lit */
  isLit: boolean;
  /** Light color */
  lightColor: string;
  /** Window frame color */
  frameColor: string;
}

/** Single door on building facade */
export interface BuildingDoor {
  /** Position relative to building center */
  position: Vector3Data;
  /** Width in meters */
  width: number;
  /** Height in meters */
  height: number;
  /** Door type */
  type: 'entrance' | 'exit' | 'service' | 'garage';
  /** Is door open */
  isOpen: boolean;
  /** Door color */
  color: string;
}

/** Sign on building (neon or static) */
export interface BuildingSign {
  /** Position relative to building center */
  position: Vector3Data;
  /** Text on sign */
  text: string;
  /** Font size */
  fontSize: number;
  /** Text color */
  textColor: string;
  /** Background color */
  backgroundColor: string;
  /** Has neon glow */
  hasNeon: boolean;
  /** Neon color */
  neonColor: string;
  /** Neon intensity */
  neonIntensity: number;
}

/** Decorative element on building */
export interface BuildingDecoration {
  /** Type of decoration */
  type: 'awning' | 'balcony' | 'acUnit' | 'pipe' | 'antenna' | 'flowerBox' | 'banner';
  /** Position relative to building center */
  position: Vector3Data;
  /** Rotation in radians */
  rotation: number;
  /** Color */
  color: string;
  /** Size multiplier */
  scale: number;
}

/** Building batch instance for InstancedMesh rendering */
export interface BuildingBatchInstance {
  /** Building configuration */
  config: BuildingConfig;
  /** Instance matrix for rendering */
  matrix: number[];
  /** Color tint for this instance */
  color: string;
  /** LOD level (0 = high, 1 = medium, 2 = low) */
  lodLevel: number;
}
