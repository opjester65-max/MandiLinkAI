/**
 * MandiLink Spatial Distance Module
 * Implements strict Haversine straight-line distance calculations for Multan hyperlocal matching.
 *
 * Requirements:
 * - Pure straight-line physical distance in kilometers
 * - Strict rejection of out-of-range latitude/longitude
 * - Explicitly accepts 0 coordinates (valid geographical points)
 * - Exact 0.0 km handling for identical points
 * - Deterministic tie-breaking logic
 * - Dashed approximate map connector geometry
 * - GUARANTEE: Never generates driving-time, ETA, or road-routing claims (urban Multan transit requires ground truth).
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface MapConnector {
  origin: Coordinate;
  destination: Coordinate;
  straightLineKm: number;
  isApproximateDashed: true;
  pathCoordinates: [number, number][];
  disclaimer: 'Straight-line approximate distance only; no driving-time or traffic routing claim generated';
}

/**
 * Validates whether latitude and longitude are within standard geographical bounds.
 * Latitude: [-90, 90], Longitude: [-180, 180].
 * Specifically accepts 0.0 coordinates.
 */
export function validateCoordinates(lat: number, lng: number): void {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new TypeError(`Coordinates must be valid numbers: lat=${lat}, lng=${lng}`);
  }
  if (lat < -90 || lat > 90) {
    throw new RangeError(`Latitude out of range [-90, 90]: ${lat}`);
  }
  if (lng < -180 || lng > 180) {
    throw new RangeError(`Longitude out of range [-180, 180]: ${lng}`);
  }
}

/**
 * Calculates Haversine distance in kilometers between two points.
 * Explicitly accepts 0 coords, returns 0.0 for identical coordinates,
 * and throws RangeError for out-of-range coordinates.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  validateCoordinates(lat1, lon1);
  validateCoordinates(lat2, lon2);

  // Exact identical points check
  if (lat1 === lat2 && lon1 === lon2) {
    return 0.0;
  }

  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Safeguard floating point precision edge cases near 1.0
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  const distance = R * c;

  // Round to single decimal place for display consistency
  return Math.round(distance * 10) / 10;
}

/**
 * Generates dashed approximate map connector coordinates between grower pickup and buyer store.
 * Returns the exact geometry and explicitly provides an audit disclaimer.
 */
export function createApproximateMapConnector(
  origin: Coordinate,
  destination: Coordinate
): MapConnector {
  validateCoordinates(origin.lat, origin.lng);
  validateCoordinates(destination.lat, destination.lng);

  const distanceKm = calculateHaversineDistanceKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  // Interpolate intermediate point for curvature / dashed visual styling
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  return {
    origin,
    destination,
    straightLineKm: distanceKm,
    isApproximateDashed: true,
    pathCoordinates: [
      [origin.lat, origin.lng],
      [midLat, midLng],
      [destination.lat, destination.lng],
    ],
    disclaimer:
      'Straight-line approximate distance only; no driving-time or traffic routing claim generated',
  };
}

/**
 * Deterministic tie-breaking comparator for match candidate rankings:
 * 1. Fulfillable grams descending (most shortage addressed first)
 * 2. Straight-line distance ascending (closest physical grower first)
 * 3. Stable listing ID alphabetical ascending (guarantees idempotent deterministic sorting)
 */
export function compareMatchesDeterministically<T extends { fulfillableG: number; distanceKm: number; listingId: string }>(
  a: T,
  b: T
): number {
  if (b.fulfillableG !== a.fulfillableG) {
    return b.fulfillableG - a.fulfillableG;
  }
  if (a.distanceKm !== b.distanceKm) {
    return a.distanceKm - b.distanceKm;
  }
  return a.listingId.localeCompare(b.listingId);
}
