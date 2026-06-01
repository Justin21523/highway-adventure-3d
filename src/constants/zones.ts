/**
 * Zone layout constants — tunables for the world's district subdivision.
 *
 * Layout scheme: "corridor + along-route themed bands".
 * - The highway runs forever down the central corridor (|cx| <= HIGHWAY_CORRIDOR_HALF_WIDTH).
 * - Leaving the corridor laterally and advancing along +Z cycles through themed
 *   districts (commercial → residential → general roads), so the player drives
 *   through distinct areas.
 *
 * All values are in CHUNK units (1 chunk = ZONE_GRID_SIZE meters = WORLD.CHUNK_SIZE).
 */
export const ZONE_LAYOUT = {
  /** Half-width (in chunks) of the central highway corridor. |cx| <= this ⇒ highway. */
  HIGHWAY_CORRIDOR_HALF_WIDTH: 1,

  /** Depth (in chunks) of one themed band along the Z axis. 6 chunks ≈ 600m. */
  DISTRICT_DEPTH: 6,

  /** Lateral distance band (|cx|) that holds the dense city/residential districts. */
  MID_RING_MIN: 2,
  MID_RING_MAX: 3,

  /** Probability (0..1) that an outer (|cx| >= MID_RING_MAX+1) chunk is industrial. */
  INDUSTRIAL_CHANCE: 0.18,
} as const;
