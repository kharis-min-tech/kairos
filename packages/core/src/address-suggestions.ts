// ── Address autocomplete: shared suggestion resolver ──────────────────────
//
// Both the web (`@kairos/ui` AddressAutofillGroup) and native
// (`@kairos/ui-native` AddressAutofillInput) address pickers show ONE merged
// suggestion list drawn from two providers:
//
//   - Mapbox Search Box  — better data and ranking in the UK/US, but needs a
//     second `/retrieve` round trip to resolve a pick to a full address.
//   - Nominatim (OSM)    — community-mapped data, materially stronger in West
//     Africa (Ghana, Sierra Leone, Nigeria) where Mapbox coverage is thin.
//     Comes back fully resolved on the first call.
//
// Keeping the fetch/merge/dedupe logic here means the two platforms can't
// drift apart. The UI layers own only rendering and picking.
//
// Do NOT render these as two separate dropdowns. An earlier web build showed
// Mapbox's own list plus a second "Also found via OpenStreetMap" list, which
// left users picking from a menu that reopened underneath the field after
// they had already chosen.

/**
 * A suggestion from either provider, normalised to one shape.
 *
 * `mapbox` rows are unresolved — they carry a `mapboxId` the caller feeds to
 * {@link retrieveMapboxSuggestion}. `osm` rows already carry the full address
 * and coordinates.
 */
export type AddressSuggestion =
  | {
      source: 'mapbox';
      /** Stable dedupe + React key. */
      id: string;
      mapboxId: string;
      /** Short label, e.g. "3 St Georges Close". */
      name: string;
      /** Long label, e.g. "London, SE28 8QE, United Kingdom". */
      placeFormatted: string;
    }
  | {
      source: 'osm';
      id: string;
      name: string;
      placeFormatted: string;
      lat: number;
      lng: number;
      addressLine1: string;
      city: string;
      postcode: string;
      countryCode?: string;
    };

/** The resolved address a pick produces, in the shape both pickers store. */
export interface ResolvedAddress {
  line1: string;
  city: string;
  postalCode: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/** Minimum characters before either provider is queried. */
export const ADDRESS_QUERY_MIN_LENGTH = 3;

/**
 * Debounce for the suggest call, in ms.
 *
 * 400 sits between Google Places (~300) and Booking (~500). Shorter than ~250
 * and the list flickers while the user is still typing.
 */
export const ADDRESS_QUERY_DEBOUNCE_MS = 400;

/** Hard cap on the merged list. Six rows fit a phone screen without scrolling. */
const MAX_SUGGESTIONS = 6;

/**
 * Query both providers in parallel and return one merged, deduped list.
 *
 * Mapbox rows come first (better ranking where it has coverage); OSM rows fill
 * the remainder. Either provider failing is non-fatal — a network error or a
 * missing token degrades to whatever the other one returned.
 */
export async function resolveAddressSuggestions(
  query: string,
  opts: {
    accessToken?: string;
    sessionToken?: string;
    country?: string;
    /**
     * Identifies the app to Nominatim, whose usage policy asks for it.
     * Native callers should pass one. Browsers must NOT: `User-Agent` is a
     * forbidden header there, and setting it makes the request throw.
     */
    userAgent?: string;
  } = {},
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < ADDRESS_QUERY_MIN_LENGTH) return [];

  const { accessToken, sessionToken, country, userAgent } = opts;

  const [mapboxRes, osmRes] = await Promise.allSettled([
    accessToken && sessionToken
      ? fetchMapboxSuggestions(q, accessToken, sessionToken, country)
      : Promise.resolve<AddressSuggestion[]>([]),
    fetchOsmSuggestions(q, country, userAgent),
  ]);

  const mapboxHits = mapboxRes.status === 'fulfilled' ? mapboxRes.value : [];
  const osmHits = osmRes.status === 'fulfilled' ? osmRes.value : [];

  // Dedupe on a normalised full label. Rough, but the two providers format
  // addresses differently enough that anything stricter misses real dupes,
  // and this only has to be good enough for a six-row list.
  const merged: AddressSuggestion[] = mapboxHits.slice(0, MAX_SUGGESTIONS);
  const seen = new Set(merged.map((m) => normaliseLabel(m.placeFormatted)));

  for (const hit of osmHits) {
    if (merged.length >= MAX_SUGGESTIONS) break;
    const key = normaliseLabel(hit.placeFormatted);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(hit);
  }

  return merged;
}

/**
 * Resolve a picked Mapbox suggestion to a full address via `/retrieve`.
 *
 * Returns `null` when the feature comes back empty, so callers can leave the
 * user's typed text alone rather than blanking the field.
 */
export async function retrieveMapboxSuggestion(
  mapboxId: string,
  accessToken: string,
  sessionToken: string,
): Promise<ResolvedAddress | null> {
  const url = new URL(
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}`,
  );
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('session_token', sessionToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Mapbox retrieve failed (${res.status})`);

  const json = (await res.json()) as { features?: MapboxRetrieveFeature[] };
  const feat = json.features?.[0];
  if (!feat) return null;

  const p = feat.properties;
  // Mapbox GeoJSON convention: coordinates are [lng, lat].
  const coords = feat.geometry?.coordinates;
  const lng = Array.isArray(coords) ? coords[0] : undefined;
  const lat = Array.isArray(coords) ? coords[1] : undefined;

  return {
    line1: p.address_line1 ?? (isStreetLevel(p.feature_type) ? (p.name ?? '') : ''),
    city: p.address_level2 ?? '',
    postalCode: p.postcode ?? '',
    country: p.country_code?.toUpperCase(),
    latitude: typeof lat === 'number' ? lat : null,
    longitude: typeof lng === 'number' ? lng : null,
  };
}

/** Flatten an already-resolved OSM suggestion into the same shape. */
export function resolveOsmSuggestion(
  s: Extract<AddressSuggestion, { source: 'osm' }>,
): ResolvedAddress {
  return {
    line1: s.addressLine1,
    city: s.city,
    postalCode: s.postcode,
    country: s.countryCode?.toUpperCase(),
    latitude: s.lat,
    longitude: s.lng,
  };
}

/**
 * Mapbox bills one *session* (many suggests plus one retrieve) as a single
 * request, so callers generate a token on mount and rotate it after each
 * successful retrieve.
 */
export function generateAddressSessionToken(): string {
  // `crypto.randomUUID` is available in every browser we support and in Hermes
  // via expo-crypto's polyfill, but guard anyway — a weaker token only affects
  // billing granularity, never correctness.
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Providers ─────────────────────────────────────────────────────────────

interface MapboxSuggestResponse {
  suggestions?: {
    mapbox_id: string;
    name: string;
    place_formatted?: string;
    full_address?: string;
  }[];
}

interface MapboxRetrieveFeature {
  properties: {
    address_line1?: string;
    address_level2?: string;
    postcode?: string;
    country_code?: string;
    name?: string;
    feature_type?: string;
  };
  geometry?: { type: 'Point'; coordinates: [number, number] };
}

async function fetchMapboxSuggestions(
  query: string,
  accessToken: string,
  sessionToken: string,
  country: string | undefined,
): Promise<AddressSuggestion[]> {
  const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
  url.searchParams.set('q', query);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', String(MAX_SUGGESTIONS));
  url.searchParams.set('types', 'address,street,postcode,place,poi');
  if (country) url.searchParams.set('country', country);

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const json = (await res.json()) as MapboxSuggestResponse;
  return (json.suggestions ?? []).map((s) => ({
    source: 'mapbox' as const,
    id: `mapbox:${s.mapbox_id}`,
    mapboxId: s.mapbox_id,
    name: s.name,
    placeFormatted: s.place_formatted ?? s.full_address ?? '',
  }));
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country_code?: string;
  };
}

async function fetchOsmSuggestions(
  query: string,
  country: string | undefined,
  userAgent: string | undefined,
): Promise<AddressSuggestion[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(MAX_SUGGESTIONS));
  if (country) url.searchParams.set('countrycodes', country);

  const headers: Record<string, string> = { 'Accept-Language': 'en' };
  if (userAgent) headers['User-Agent'] = userAgent;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return [];

  const rows = (await res.json()) as NominatimResult[];
  return rows.map((r) => {
    const a = r.address ?? {};
    const street = [a.house_number, a.road ?? a.pedestrian].filter(Boolean).join(' ').trim();
    const shortLabel =
      street || a.suburb || a.neighbourhood || (r.display_name.split(',')[0] ?? '').trim();
    return {
      source: 'osm' as const,
      id: `osm:${r.place_id}`,
      name: shortLabel,
      placeFormatted: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      addressLine1: street,
      city: a.city ?? a.town ?? a.village ?? '',
      postcode: a.postcode ?? '',
      countryCode: a.country_code,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * When the user picks a postcode-only or place-only suggestion, `name` is the
 * postcode or town, not a street. Dumping that into line 1 leaves the address
 * field showing "SE28 8QE", so only fall back to `name` for feature types
 * where it genuinely reads as a street label.
 */
function isStreetLevel(featureType: string | undefined): boolean {
  return featureType === 'address' || featureType === 'street' || featureType === 'poi';
}

function normaliseLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[.,'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
