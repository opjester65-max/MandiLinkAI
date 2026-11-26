/**
 * Tests for lib/matching/distance.ts
 *
 * Verifies:
 * 1. Haversine distance in km
 * 2. Explicit acceptance of 0,0 coordinates
 * 3. Rejection of out-of-range coordinates (RangeError)
 * 4. Handling of identical points (0.0 km)
 * 5. Deterministic tie-breaking comparator
 * 6. Dashed approximate map connector geometry
 * 7. STRICT PROOF: No driving-time, speed, or traffic claims generated
 */

import {
  calculateHaversineDistanceKm,
  validateCoordinates,
  createApproximateMapConnector,
  compareMatchesDeterministically,
} from '../lib/matching/distance.ts';

export function runDistanceTests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
    }
  }

  // 1. Accepts valid Multan coordinates
  test('Calculates accurate Haversine distance between Multan points', () => {
    // Chenab Greenbelt (30.2450, 71.4720) to Gulgasht Corner Store (30.2251, 71.4935)
    const dist = calculateHaversineDistanceKm(30.2450, 71.4720, 30.2251, 71.4935);
    if (dist <= 0 || dist > 10) {
      throw new Error(`Expected realistic Multan urban distance ~3-4 km, got ${dist} km`);
    }
    if (dist !== 3.0 && dist !== 3.1) {
      // Expected ~3.0 - 3.1 km
      if (Math.abs(dist - 3.0) > 0.5) {
        throw new Error(`Distance deviation too high: ${dist} km`);
      }
    }
  });

  // 2. Accepts 0,0 coordinates
  test('Explicitly accepts 0,0 equator/prime-meridian coordinates', () => {
    validateCoordinates(0, 0);
    const dist = calculateHaversineDistanceKm(0, 0, 0, 1);
    // 1 degree along equator is ~111.2 km
    if (dist < 110 || dist > 112) {
      throw new Error(`Expected ~111 km at equator, got ${dist}`);
    }
  });

  // 3. Rejects out-of-range coordinates
  test('Strictly rejects out-of-range coordinates with RangeError', () => {
    let latErrorCaught = false;
    try {
      validateCoordinates(95.0, 71.4);
    } catch (e: any) {
      if (e instanceof RangeError) latErrorCaught = true;
    }
    if (!latErrorCaught) throw new Error('Failed to throw RangeError for latitude > 90');

    let lngErrorCaught = false;
    try {
      validateCoordinates(30.2, 195.0);
    } catch (e: any) {
      if (e instanceof RangeError) lngErrorCaught = true;
    }
    if (!lngErrorCaught) throw new Error('Failed to throw RangeError for longitude > 180');
  });

  // 4. Identical points return 0.0
  test('Returns exactly 0.0 km for identical coordinate points', () => {
    const dist = calculateHaversineDistanceKm(30.2251, 71.4935, 30.2251, 71.4935);
    if (dist !== 0.0) {
      throw new Error(`Expected exactly 0.0, got ${dist}`);
    }
  });

  // 5. Deterministic tie-breaking
  test('Deterministically breaks ties by fulfillable grams, distance, and stable ID', () => {
    const matches = [
      { fulfillableG: 20000, distanceKm: 4.2, listingId: 'list-c' },
      { fulfillableG: 24000, distanceKm: 5.0, listingId: 'list-b' },
      { fulfillableG: 20000, distanceKm: 3.0, listingId: 'list-a' },
      { fulfillableG: 20000, distanceKm: 3.0, listingId: 'list-z' },
    ];

    matches.sort(compareMatchesDeterministically);

    // 1st: 24,000 g
    if (matches[0].listingId !== 'list-b') throw new Error(`Expected list-b first, got ${matches[0].listingId}`);
    // 2nd: 20,000 g, dist 3.0, id 'list-a'
    if (matches[1].listingId !== 'list-a') throw new Error(`Expected list-a second, got ${matches[1].listingId}`);
    // 3rd: 20,000 g, dist 3.0, id 'list-z'
    if (matches[2].listingId !== 'list-z') throw new Error(`Expected list-z third, got ${matches[2].listingId}`);
    // 4th: 20,000 g, dist 4.2, id 'list-c'
    if (matches[3].listingId !== 'list-c') throw new Error(`Expected list-c fourth, got ${matches[3].listingId}`);
  });

  // 6. Dashed approximate connector geometry
  test('Generates dashed approximate map connector with audit disclaimer', () => {
    const origin = { lat: 30.2450, lng: 71.4720 };
    const destination = { lat: 30.2251, lng: 71.4935 };
    const connector = createApproximateMapConnector(origin, destination);

    if (!connector.isApproximateDashed) {
      throw new Error('Connector must have isApproximateDashed: true');
    }
    if (connector.pathCoordinates.length < 3) {
      throw new Error('Connector must include origin, midpoint, and destination coordinates');
    }
  });

  // 7. CRITICAL: Proves NO driving-time claim is generated
  test('PROVES NO driving-time, ETA, speed, or road-route claim is generated', () => {
    const origin = { lat: 30.2450, lng: 71.4720 };
    const destination = { lat: 30.2251, lng: 71.4935 };
    const connector = createApproximateMapConnector(origin, destination);

    const keys = Object.keys(connector);
    const forbidden = ['drivingMinutes', 'transitMinutes', 'eta', 'speedKmH', 'trafficDelay', 'turnByTurn'];
    for (const f of forbidden) {
      if (keys.includes(f)) {
        throw new Error(`CRITICAL VIOLATION: Connector contains driving-time property "${f}"`);
      }
    }

    if (!connector.disclaimer.includes('no driving-time')) {
      throw new Error(`Disclaimer must explicitly state no driving time generated: "${connector.disclaimer}"`);
    }
  });

  return results;
}

if (process.argv[1]?.endsWith('distance.test.ts')) {
  console.log('Running Distance & Spatial Tests:');
  const results = runDistanceTests();
  results.forEach(r => console.log(`  ${r.passed ? '✓' : '✗'} ${r.name} ${r.error ? `(${r.error})` : ''}`));
}
