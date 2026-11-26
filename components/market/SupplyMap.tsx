import React, { useState } from 'react';
import { DeficitGap, Listing, SupplyMatch } from '../../lib/contracts';
import { MapPin, Navigation, Compass, Layers, Check } from 'lucide-react';

interface SupplyMapProps {
  gaps: DeficitGap[];
  listings: Listing[];
  matches: SupplyMatch[];
  selectedMatchId?: string | null;
  onSelectMatch: (matchId: string) => void;
  className?: string;
}

// Bounding box for Multan urban sector:
// Lat: 30.170 to 30.260 (North-South, ~10 km)
// Lng: 71.430 to 71.520 (West-East, ~9 km)
const MULTAN_BOUNDS = {
  minLat: 30.17,
  maxLat: 30.26,
  minLng: 71.43,
  maxLng: 71.52,
};

function projectToSvg(lat: number, lng: number, width: number = 700, height: number = 420) {
  // Normalize lng to X (0 to width)
  const x = ((lng - MULTAN_BOUNDS.minLng) / (MULTAN_BOUNDS.maxLng - MULTAN_BOUNDS.minLng)) * width;
  // Normalize lat to Y (inverted: maxLat is top, minLat is bottom)
  const y = height - ((lat - MULTAN_BOUNDS.minLat) / (MULTAN_BOUNDS.maxLat - MULTAN_BOUNDS.minLat)) * height;
  return { x: Math.max(20, Math.min(width - 20, x)), y: Math.max(20, Math.min(height - 20, y)) };
}

export function SupplyMap({
  gaps,
  listings,
  matches,
  selectedMatchId,
  onSelectMatch,
  className = '',
}: SupplyMapProps) {
  const [activeTooltip, setActiveTooltip] = useState<{
    title: string;
    detail: string;
    x: number;
    y: number;
  } | null>(null);

  const selectedMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];

  // Key landmarks in Multan for context
  const landmarks = [
    { name: 'Chenab River Greenbelt', lat: 30.248, lng: 71.455, type: 'river' },
    { name: 'Gulgasht Colony', lat: 30.2244, lng: 71.492, type: 'area' },
    { name: 'Shah Rukn-e-Alam Shrine', lat: 30.198, lng: 71.481, type: 'heritage' },
    { name: 'Bohar Gate Walled City', lat: 30.197, lng: 71.4725, type: 'walled_city' },
    { name: 'Multan Cantt', lat: 30.183, lng: 71.442, type: 'area' },
    { name: 'Bosan Road Highway', lat: 30.235, lng: 71.488, type: 'highway' },
  ];

  return (
    <div className={`bg-stone-50 rounded-xl border border-stone-200 overflow-hidden flex flex-col ${className}`}>
      {/* Map Header */}
      <div className="bg-white px-4 py-3 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-800" />
          <span className="text-xs font-bold text-stone-900 tracking-tight uppercase">
            Multan Hyperlocal Spatial Grid
          </span>
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            (30.17°–30.26° N, 71.43°–71.52° E)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
            <span className="text-stone-700">Corner Store Gap</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-emerald-700" />
            <span className="text-stone-700">Grower Surplus</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-1 bg-[#4A154B] rounded-full" />
            <span className="text-[#4A154B] font-bold">Selected Route</span>
          </div>
        </div>
      </div>

      {/* Interactive Schematic SVG Map Canvas */}
      <div className="relative w-full h-[360px] sm:h-[420px] bg-[#F5F2EA] overflow-hidden select-none">
        <svg
          viewBox="0 0 700 420"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Schematic Multan Produce Supply and Deficit Map"
        >
          {/* Background grid texture */}
          <defs>
            <pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse">
              <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#E6E0D2" strokeWidth="0.8" />
            </pattern>
            {/* Gradient for River Chenab */}
            <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C4D7D1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#A3C2B8" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          <rect width="700" height="420" fill="url(#grid)" />

          {/* Schematic River Chenab curve in top-left */}
          <path
            d="M 0 30 Q 120 70 200 40 T 360 10"
            fill="none"
            stroke="url(#riverGrad)"
            strokeWidth="28"
            strokeLinecap="round"
          />
          <text x="75" y="45" fill="#4B6B60" fontSize="10" fontWeight="600" letterSpacing="1">
            CHENAB RIVER BELT (ORGANIC FARMS)
          </text>

          {/* Main Urban Corridors (Bosan Road, Northern Bypass, Old Bahawalpur Road) */}
          {/* Bosan Road Corridor */}
          <path d="M 280 20 L 450 180 L 490 310" fill="none" stroke="#D8D0BF" strokeWidth="6" strokeLinecap="round" />
          <text x="320" y="90" fill="#8C826F" fontSize="9" fontWeight="600" transform="rotate(40 320 90)">
            Bosan Road Corridor
          </text>

          {/* Northern Bypass */}
          <path d="M 50 160 Q 300 130 650 170" fill="none" stroke="#DDD5C5" strokeWidth="4" strokeDasharray="6,4" />
          <text x="120" y="150" fill="#8C826F" fontSize="8" fontWeight="500">
            Multan Northern Bypass
          </text>

          {/* Walled City Ring / Circular Road */}
          <circle cx="380" cy="310" r="45" fill="#EAE2D4" stroke="#C8BEAC" strokeWidth="2" strokeDasharray="3,3" />
          <text x="345" y="315" fill="#786F5E" fontSize="9" fontWeight="bold">
            Old Walled City
          </text>

          {/* Selected Route Polyline (Deep Plum #4A154B) */}
          {selectedMatch && (
            <g className="route-layer">
              {(() => {
                const start = projectToSvg(selectedMatch.listing.pickupLat, selectedMatch.listing.pickupLng);
                const end = projectToSvg(30.2251, 71.4935); // Gulgasht Store coords
                const midX = (start.x + end.x) / 2 + 15;
                const midY = (start.y + end.y) / 2 - 10;
                return (
                  <>
                    {/* Shadow / Glow line */}
                    <path
                      d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                      fill="none"
                      stroke="#4A154B"
                      strokeOpacity="0.2"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {/* Main Plum route line */}
                    <path
                      d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                      fill="none"
                      stroke="#4A154B"
                      strokeWidth="3.5"
                      strokeDasharray="6,4"
                      strokeLinecap="round"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="40"
                        to="0"
                        dur="1.8s"
                        repeatCount="indefinite"
                      />
                    </path>
                    {/* Route Transit Label Badge */}
                    <rect
                      x={midX - 90}
                      y={midY - 14}
                      width="180"
                      height="24"
                      rx="6"
                      fill="#4A154B"
                      className="shadow-sm"
                    />
                    <text
                      x={midX}
                      y={midY + 2}
                      fill="#FAF7F2"
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Straight-line distance: {selectedMatch.distanceKm} km (~{selectedMatch.estTransitMinutes}m)
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Plotted Stores (Amber Deficit Pins) */}
          {(() => {
            const activeProduce = selectedMatch?.gap.produce ?? listings[0]?.produce;
            const storeMap = new Map<string, DeficitGap>();
            for (const gap of gaps) {
              const existing = storeMap.get(gap.storeId);
              if (!existing) {
                storeMap.set(gap.storeId, gap);
              } else if (activeProduce && gap.produce === activeProduce) {
                storeMap.set(gap.storeId, gap);
              } else if (
                (!activeProduce || existing.produce !== activeProduce) &&
                gap.gapKg > existing.gapKg
              ) {
                storeMap.set(gap.storeId, gap);
              }
            }
            return Array.from(storeMap.values()).map((gap) => {
              // Gulgasht corner store coords or lookup
              const coords = gap.storeName.includes('Gulgasht')
                ? { lat: 30.2251, lng: 71.4935 }
                : { lat: 30.1925, lng: 71.5034 };
              const pt = projectToSvg(coords.lat, coords.lng);

              return (
                <g
                  key={`${gap.storeId}-${gap.produce}-${gap.date}`}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer group"
                  onClick={() => {
                    const match = matches.find((m) => m.gap.storeId === gap.storeId);
                    if (match) onSelectMatch(match.id);
                  }}
                >
                  {/* Pulse ring for critical deficit */}
                  <circle r="14" fill="#F59E0B" fillOpacity="0.3" className="animate-ping" />
                  <circle r="9" fill="#D97706" stroke="#FFFFFF" strokeWidth="2.5" />
                  <circle r="3.5" fill="#FFFFFF" />
                  {/* Store label tag */}
                  <rect x="12" y="-12" width="125" height="22" rx="4" fill="#FFFFFF" stroke="#E2DCD0" strokeWidth="1" />
                  <text x="18" y="3" fill="#1C1917" fontSize="10" fontWeight="bold">
                    {gap.storeName}
                  </text>
                  <text x="18" y="24" fill="#B45309" fontSize="9" fontWeight="bold">
                    Gap: {gap.gapKg} kg {gap.produce}
                  </text>
                </g>
              );
            });
          })()}

          {/* Plotted Grower Lots (Leaf Green Supply Pins) */}
          {listings.map((listing) => {
            const pt = projectToSvg(listing.pickupLat, listing.pickupLng);
            const isMatched = selectedMatch?.listing.id === listing.id;

            return (
              <g
                key={listing.id}
                transform={`translate(${pt.x}, ${pt.y})`}
                className="cursor-pointer group"
                onClick={() => {
                  const match = matches.find((m) => m.listing.id === listing.id);
                  if (match) onSelectMatch(match.id);
                }}
              >
                {isMatched && (
                  <circle r="18" fill="#1E6B38" fillOpacity="0.25" className="animate-pulse" />
                )}
                <circle
                  r={isMatched ? "11" : "8.5"}
                  fill="#1E6B38"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <circle r="3" fill="#FFFFFF" />
                {/* Grower label */}
                <rect
                  x="-75"
                  y="-32"
                  width="150"
                  height="22"
                  rx="4"
                  fill="#1E6B38"
                  className="shadow-xs"
                />
                <text
                  x="0"
                  y="-18"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {listing.availableG / 1000} kg {listing.produce} (PKR {listing.askPaisaKg / 100}/kg)
                </text>
              </g>
            );
          })}
        </svg>

        {/* Map Quick Action Overlay on Mobile & Desktop */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm bg-white/95 backdrop-blur-md p-3 rounded-lg border border-stone-200 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#4A154B] uppercase tracking-wider flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-[#4A154B]" />
              Selected Match Dispatch
            </span>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
              Score: {selectedMatch?.matchScore}%
            </span>
          </div>
          <p className="text-xs text-stone-700 font-medium">
            {selectedMatch?.listing.growerName} → {selectedMatch?.gap.storeName}
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1.5">
            <span>Distance: <strong>{selectedMatch?.distanceKm} km</strong></span>
            <span>Transit: <strong>~{selectedMatch?.estTransitMinutes} mins</strong></span>
            <span className="text-emerald-700 font-bold">{selectedMatch?.suggestedAction}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
