/**
 * Format utilities for displaying game data.
 *
 * Functions for formatting numbers, distances, speeds, times, etc.
 */

/**
 * Format a number with commas as thousands separator.
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Format a number with a specific number of decimal places.
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format a speed value with units.
 */
export function formatSpeed(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

/**
 * Format a distance value with appropriate units.
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format a time value (seconds) to MM:SS.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a time value with hours if needed (HH:MM:SS).
 */
export function formatTimeExtended(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a currency value (coins).
 */
export function formatCoins(coins: number): string {
  return `${formatNumber(coins)} 🪙`;
}

/**
 * Format XP value.
 */
export function formatXP(xp: number): string {
  return `${formatNumber(xp)} XP`;
}

/**
 * Format a level value.
 */
export function formatLevel(level: number): string {
  return `Lv. ${level}`;
}

/**
 * Format a file size in bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format a chunk ID for display.
 */
export function formatChunkId(chunkId: string): string {
  const parts = chunkId.split('_');
  if (parts.length !== 2) return chunkId;
  return `Chunk (${parts[0]}, ${parts[1]})`;
}

/**
 * Format a zone type for display.
 */
export function formatZone(zone: string): string {
  const zoneNames: Record<string, string> = {
    highway: '🛣️ Highway',
    cityCenter: '🏙️ City Center',
    suburban: '🏘️ Suburban',
    industrial: '🏭 Industrial',
    countryside: '🌾 Countryside',
  };
  return zoneNames[zone] || zone;
}

/**
 * Format a shop category for display.
 */
export function formatShopCategory(category: string): string {
  const categoryNames: Record<string, string> = {
    convenienceStore: '🏪 Convenience Store',
    gasStation: '⛽ Gas Station',
    coffeeShop: '☕ Coffee Shop',
    restaurant: '🍽️ Restaurant',
    shoppingMall: '🛍️ Shopping Mall',
    garage: '🔧 Garage',
    restStop: '🏕️ Rest Stop',
  };
  return categoryNames[category] || category;
}

/**
 * Format a quest category for display.
 */
export function formatQuestCategory(category: string): string {
  const categoryNames: Record<string, string> = {
    main: '📜 Main Quest',
    side: '📋 Side Quest',
    exploration: '🗺️ Exploration',
    challenge: '🏆 Challenge',
    delivery: '📦 Delivery',
    daily: '📅 Daily',
    tour: '🎯 Tour',
  };
  return categoryNames[category] || category;
}

/**
 * Format a weather type for display.
 */
export function formatWeather(weather: string): string {
  const weatherNames: Record<string, string> = {
    clear: '☀️ Clear',
    overcast: '☁️ Overcast',
    fog: '🌫️ Fog',
    rain: '🌧️ Rain',
  };
  return weatherNames[weather] || weather;
}

/**
 * Format a time of day (24h) to 12h format.
 */
export function formatTime12Hour(hour: number, minute: number = 0): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Format a decimal number to a compact representation (K, M, B).
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return Math.round(value).toString();
}

/**
 * Format a fraction (current/total) for display.
 */
export function formatFraction(current: number, total: number): string {
  return `${formatNumber(Math.floor(current))}/${formatNumber(total)}`;
}
