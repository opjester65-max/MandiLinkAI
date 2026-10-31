import { DeficitGap, Listing, SupplyMatch } from '../contracts';

/**
 * Calculates Haversine distance in km between two coordinate points
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Estimates transit time in urban Multan based on average speed and road density
 */
export function estimateTransitMinutes(distanceKm: number): number {
  // Average urban tempo: 22 km/h plus 4 min buffer for loading
  const minutes = Math.round((distanceKm / 22) * 60 + 4);
  return Math.max(5, minutes);
}

/**
 * Matches open surplus listings with predicted store deficits conforming to Prompt 2 rules:
 * - Filter to same produce, eligible pickup window, positive remaining gap
 * - Fulfillable grams = min(remaining inventory, gap)
 * - Rank by: fulfillable grams DESC, distance ASC, stable listing ID
 * - Null-coordinate handling
 */
export function matchSupplyWithDeficits(
  listings: Listing[],
  gaps: DeficitGap[]
): (SupplyMatch & { fulfillableG: number; connectorLabel: string })[] {
  const matches: (SupplyMatch & { fulfillableG: number; connectorLabel: string })[] = [];
  const now = Date.now();

  for (const gap of gaps) {
    if (gap.gapKg <= 0) continue;
    const gapG = Math.round(gap.gapKg * 1000);

    // Filter matching listings with same produce, open status, available inventory, and unexpired pickup
    const candidateListings = listings.filter((l) => {
      const isSameProduce = l.produce === gap.produce;
      const isOpen = l.status === 'open';
      const hasInventory = l.availableG > 0;
      const unexpired = new Date(l.pickupUntil).getTime() > now;
      return isSameProduce && isOpen && hasInventory && unexpired;
    });

    for (const listing of candidateListings) {
      // Fulfillable grams is smaller of remaining inventory and gap
      const fulfillableG = Math.min(listing.availableG, gapG);

      // Safe coordinate handling with null check
      const storeLat = 30.2251;
      const storeLng = 71.4935;
      let distanceKm = 5.2; // Default fallback

      if (
        typeof listing.pickupLat === 'number' &&
        typeof listing.pickupLng === 'number' &&
        !isNaN(listing.pickupLat) &&
        !isNaN(listing.pickupLng)
      ) {
        distanceKm = calculateHaversineDistanceKm(storeLat, storeLng, listing.pickupLat, listing.pickupLng);
      }

      const estTransitMinutes = estimateTransitMinutes(distanceKm);

      // Scoring
      const coverageRatio = fulfillableG / gapG;
      const matchScore = Math.min(100, Math.round(coverageRatio * 60 + Math.max(0, 40 - distanceKm * 3)));

      let suggestedAction = 'Start bargaining';
      if (fulfillableG >= gapG) {
        suggestedAction = `Fulfills 100% of store deficit (${gap.gapKg} kg)`;
      } else {
        suggestedAction = `Covers ${(fulfillableG / 1000).toFixed(1)} kg of ${gap.gapKg} kg shortage`;
      }

      matches.push({
        id: `match-${listing.id.substring(0, 8)}-${gap.storeId.substring(0, 8)}`,
        listingId: listing.id,
        listing,
        gap,
        distanceKm,
        estTransitMinutes,
        matchScore,
        suggestedAction,
        fulfillableG,
        connectorLabel: 'Straight-line distance',
      });
    }
  }

  // Exact ranking: fulfillable grams DESC, approximate distance ASC, stable listing ID
  return matches.sort((a, b) => {
    if (b.fulfillableG !== a.fulfillableG) {
      return b.fulfillableG - a.fulfillableG; // Fulfillable grams descending
    }
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm; // Distance ascending
    }
    return a.listing.id.localeCompare(b.listing.id); // Stable listing ID
  });
}
