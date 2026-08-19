import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Input } from './Input';
import { radii, spacing, typography } from './tokens';
import { useThemedStyles, useColors, type ThemeColors } from './theme';

export interface AddressAutofillValue {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country?: string;
  /**
   * Populated from the Mapbox retrieve response when the user picks a
   * suggestion. Consumers persist these where applicable (branches) so the
   * fellowships map can render pins organically.
   */
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddressAutofillInputProps {
  /**
   * Mapbox public access token. Pass `process.env.MAPBOX_PUBLIC_TOKEN` in
   * app code. When empty the input degrades to plain fields with no autofill.
   */
  accessToken?: string;
  value: AddressAutofillValue;
  onChange: (next: AddressAutofillValue) => void;
  /**
   * ISO-2 country code (or comma-separated list, e.g. 'gb,gh') to bias
   * suggestions. Undefined = worldwide, ranked by prominence. Pass this only
   * when the form has strong signal — e.g. a branch's region.country — so
   * users adding a Ghana branch aren't seeing UK-only results.
   */
  country?: string;
  /** Show a separate line-2 field. Defaults to false. */
  showLine2?: boolean;
  /** Labels for each field. */
  labels?: {
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
  };
  /** Field-level errors keyed by field name. */
  errors?: Partial<Record<keyof AddressAutofillValue, string>>;
  disabled?: boolean;
}

/**
 * A unified suggestion — either a Mapbox Search Box result (needs a follow-up
 * /retrieve call to resolve to full address + coords) or a Nominatim (OSM)
 * result (comes back fully resolved on the first call). Nominatim gives us a
 * fallback for regions where Mapbox coverage is thin (Ghana, Sierra Leone,
 * Nigeria — community-driven OSM data is often stronger there).
 */
type Suggestion =
  | {
      source: 'mapbox';
      id: string; // stable dedupe key + React key
      mapbox_id: string;
      name: string;
      place_formatted: string;
    }
  | {
      source: 'osm';
      id: string;
      name: string;
      place_formatted: string;
      lat: number;
      lng: number;
      addressLine1: string;
      city: string;
      postcode: string;
      countryCode?: string;
    };

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

interface RetrieveFeature {
  properties: {
    address_line1?: string;
    address_line2?: string;
    address_level1?: string;
    address_level2?: string;
    postcode?: string;
    country_code?: string;
    name?: string;
    feature_type?: string;
    place_formatted?: string;
  };
  geometry?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

/**
 * Address entry group with Mapbox Search Box autofill.
 *
 * Web has an official `<AddressAutofill>` component; RN doesn't, so this calls
 * the Search Box REST API directly (`/suggest` while typing, `/retrieve` on
 * pick) and renders results in a themed bottom-sheet picker matching the
 * app's existing sheet pattern.
 *
 * Session tokens keep billing sane — Mapbox counts one full session (many
 * suggests + one retrieve) as one billable request, so we generate a fresh
 * session token on mount and after each retrieve.
 */
export function AddressAutofillInput({
  accessToken,
  value,
  onChange,
  country,
  showLine2 = false,
  labels,
  errors,
  disabled = false,
}: AddressAutofillInputProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [justPicked, setJustPicked] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => generateSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof AddressAutofillValue>(k: K, v: AddressAutofillValue[K]) =>
    onChange({ ...value, [k]: v });

  const line1Label = labels?.line1 ?? 'Address';
  const line2Label = labels?.line2 ?? 'Apartment, suite, etc. (optional)';
  const cityLabel = labels?.city ?? 'City';
  const postalLabel = labels?.postalCode ?? 'Postal code';

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function handleLine1Change(text: string) {
    set('line1', text);
    setJustPicked(false);
    if (!accessToken || !text.trim() || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // 400ms matches the industry norm (Google Places ~300, Booking ~500) — a
    // hair longer than 250 avoids the "the picker keeps popping while I'm
    // still typing" annoyance.
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 400);
  }

  async function fetchSuggestions(query: string) {
    setLoading(true);
    try {
      // Fire Mapbox + Nominatim in parallel. Mapbox first (better UX,
      // richer data), Nominatim fills gaps in West Africa where Mapbox
      // coverage is thin. Nominatim's terms of service ask for a real
      // User-Agent — sent below.
      const [mapboxRaw, osmRaw] = await Promise.allSettled([
        accessToken ? fetchMapboxSuggestions(query, accessToken, sessionToken, country) : Promise.resolve<Suggestion[]>([]),
        fetchOsmSuggestions(query, country),
      ]);
      const mapboxHits =
        mapboxRaw.status === 'fulfilled' ? mapboxRaw.value : [];
      const osmHits = osmRaw.status === 'fulfilled' ? osmRaw.value : [];

      // Merge: Mapbox first, then any OSM result that doesn't look like a
      // near-duplicate. Dedupe is a rough label match — good enough for a
      // suggestion list of 6 rows.
      const merged: Suggestion[] = [...mapboxHits];
      const seen = new Set(
        mapboxHits.map((m) => normaliseLabel(m.place_formatted)),
      );
      for (const o of osmHits) {
        const key = normaliseLabel(o.place_formatted);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(o);
        if (merged.length >= 6) break;
      }

      setSuggestions(merged);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function pick(s: Suggestion) {
    setSuggestions([]);
    if (s.source === 'osm') {
      // Nominatim gives everything on the first call — no /retrieve step.
      onChange({
        line1: s.addressLine1 || value.line1,
        line2: value.line2,
        city: s.city || value.city,
        postalCode: s.postcode || value.postalCode,
        country: s.countryCode?.toUpperCase() ?? value.country,
        latitude: s.lat,
        longitude: s.lng,
      });
      setJustPicked(true);
      return;
    }
    if (!accessToken) return;
    try {
      const url = new URL(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(s.mapbox_id)}`,
      );
      url.searchParams.set('access_token', accessToken);
      url.searchParams.set('session_token', sessionToken);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Retrieve failed (${res.status})`);
      const json = (await res.json()) as { features?: RetrieveFeature[] };
      const feat = json.features?.[0];
      if (!feat) return;
      const p = feat.properties;
      const coords = feat.geometry?.coordinates;
      const lng = Array.isArray(coords) ? coords[0] : undefined;
      const lat = Array.isArray(coords) ? coords[1] : undefined;
      // When the user picks a postcode-only or place-only suggestion, `name`
      // is the postcode / place name itself — not a street address — and
      // dumping it into line1 leaves the address field looking like a
      // postcode. Only fall back to `name` for address/street/POI features
      // where it genuinely reads as a street label.
      const canUseNameForLine1 =
        p.feature_type === 'address' ||
        p.feature_type === 'street' ||
        p.feature_type === 'poi';
      const nextLine1 = p.address_line1 ?? (canUseNameForLine1 ? p.name : '') ?? '';
      onChange({
        line1: nextLine1 || value.line1,
        line2: value.line2,
        city: p.address_level2 ?? value.city,
        postalCode: p.postcode ?? value.postalCode,
        country: p.country_code?.toUpperCase() ?? value.country,
        latitude: typeof lat === 'number' ? lat : value.latitude,
        longitude: typeof lng === 'number' ? lng : value.longitude,
      });
      setJustPicked(true);
    } finally {
      // Session token rotates after each successful retrieve to start the next
      // billing session.
      setSessionToken(generateSessionToken());
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: 4 }}>
        <Input
          label={line1Label}
          value={value.line1}
          onChangeText={handleLine1Change}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!disabled}
          error={errors?.line1}
          placeholder="Start typing your address…"
          trailingSlot={
            loading ? <ActivityIndicator size="small" color={c.primary} /> : null
          }
        />
        {justPicked && !value.line1?.trim() ? (
          <Text style={styles.hintText}>Not detected — add if you know it.</Text>
        ) : null}
        {suggestions.length > 0 ? (
          <View style={styles.suggestionsDropdown}>
            {suggestions.map((s) => (
              <Pressable
                key={s.id}
                style={styles.suggestionRow}
                onPress={() => pick(s)}
              >
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.suggestionMeta} numberOfLines={1}>
                  {s.place_formatted}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {showLine2 ? (
        <Input
          label={line2Label}
          value={value.line2 ?? ''}
          onChangeText={(v) => set('line2', v)}
          autoCapitalize="words"
          editable={!disabled}
          error={errors?.line2}
        />
      ) : null}

      <View style={styles.pairRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Input
            label={cityLabel}
            value={value.city}
            onChangeText={(v) => {
              set('city', v);
              setJustPicked(false);
            }}
            autoCapitalize="words"
            editable={!disabled}
            error={errors?.city}
          />
          {justPicked && !value.city?.trim() ? (
            <Text style={styles.hintText}>Not detected — add if you know it.</Text>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Input
            label={postalLabel}
            value={value.postalCode}
            onChangeText={(v) => {
              set('postalCode', v);
              setJustPicked(false);
            }}
            autoCapitalize="characters"
            editable={!disabled}
            error={errors?.postalCode}
          />
          {justPicked && !value.postalCode?.trim() ? (
            <Text style={styles.hintText}>Not detected — add if you know it.</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

async function fetchMapboxSuggestions(
  query: string,
  accessToken: string,
  sessionToken: string,
  country: string | undefined,
): Promise<Suggestion[]> {
  const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
  url.searchParams.set('q', query);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('session_token', sessionToken);
  url.searchParams.set('language', 'en');
  if (country) url.searchParams.set('country', country);
  url.searchParams.set('types', 'address,street,place,postcode');
  url.searchParams.set('limit', '6');
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const json = (await res.json()) as {
    suggestions?: {
      mapbox_id: string;
      name: string;
      place_formatted: string;
    }[];
  };
  return (json.suggestions ?? []).map<Suggestion>((s) => ({
    source: 'mapbox',
    id: `mapbox:${s.mapbox_id}`,
    mapbox_id: s.mapbox_id,
    name: s.name,
    place_formatted: s.place_formatted,
  }));
}

async function fetchOsmSuggestions(
  query: string,
  country: string | undefined,
): Promise<Suggestion[]> {
  // Nominatim is OpenStreetMap's free geocoder. Community-mapped data,
  // which is often stronger than commercial in West Africa. Their terms of
  // use require a real User-Agent identifying the app.
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '4');
  if (country) url.searchParams.set('countrycodes', country);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'Kairos/1.0 (kairos.kharis.org)',
      },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as NominatimResult[];
    return rows.map<Suggestion>((r) => {
      const a = r.address ?? {};
      const streetLabel = [a.house_number, a.road ?? a.pedestrian]
        .filter(Boolean)
        .join(' ')
        .trim();
      const shortLabel =
        streetLabel ||
        a.suburb ||
        a.neighbourhood ||
        (r.display_name.split(',')[0] ?? '').trim();
      return {
        source: 'osm',
        id: `osm:${r.place_id}`,
        name: shortLabel,
        place_formatted: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        addressLine1: streetLabel,
        city: a.city ?? a.town ?? a.village ?? '',
        postcode: a.postcode ?? '',
        countryCode: a.country_code,
      };
    });
  } catch {
    return [];
  }
}

// Cheap normaliser for dedupe: lowercase + collapse whitespace + strip commas.
// Same address returned by both Mapbox and OSM will hash to the same key.
function normaliseLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, ' ').replace(/,/g, '').trim();
}

function generateSessionToken(): string {
  // Simple RFC-4122-ish v4 UUID. Doesn't need to be crypto-strong; Mapbox
  // just needs a stable-per-session opaque string.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    pairRow: { flexDirection: 'row', gap: spacing.md },
    suggestionsDropdown: {
      backgroundColor: c.card,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      marginTop: 4,
    },
    suggestionRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
      gap: 2,
    },
    suggestionName: { ...typography.body, color: c.ink, fontWeight: '600' },
    suggestionMeta: { ...typography.meta, color: c.inkMuted },
    hintText: {
      ...typography.meta,
      color: c.inkFaded,
      fontStyle: 'italic',
      paddingLeft: spacing.xs,
    },
  });
}
