'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { AddressAutofill as AddressAutofillType } from '@mapbox/search-js-react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '../lib/utils';

/**
 * The Mapbox search-js-react package touches `document` at module load, which
 * breaks Next's static generation for any page that transitively imports from
 * `@kairos/ui`. Load it dynamically with `ssr: false` so it only ships in the
 * client bundle.
 */
const AddressAutofill = dynamic(
  () => import('@mapbox/search-js-react').then((m) => m.AddressAutofill),
  { ssr: false },
) as unknown as typeof AddressAutofillType;

export interface AddressAutofillValue {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country?: string;
  /**
   * Populated from the Mapbox retrieve response when the user picks a
   * suggestion. Consumers that persist coordinates (branches, fellowships)
   * should forward these to the API; consumers that don't care about coords
   * (member address for postal correspondence only) can ignore them.
   */
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddressAutofillGroupProps {
  /**
   * Mapbox public access token. Pass `process.env.NEXT_PUBLIC_MAPBOX_TOKEN` in
   * app code. When the token is missing the group renders as plain inputs with
   * no autofill (useful for local dev without the token wired).
   */
  accessToken?: string;
  value: AddressAutofillValue;
  onChange: (next: AddressAutofillValue) => void;
  /** Optional class applied to the outer wrapper. */
  className?: string;
  /**
   * ISO-2 country code (or comma-separated list) to bias suggestions.
   * Undefined = worldwide, ranked by prominence. Pass this only when the
   * form has strong signal about the country.
   */
  country?: string;
  /** Show line 2 field. Defaults to false. */
  showLine2?: boolean;
  /** Disable all fields together. */
  disabled?: boolean;
  /** Optional field-level errors keyed by field name. */
  errors?: Partial<Record<keyof AddressAutofillValue, string>>;
  /** Labels for each field. Override for e.g. "Secondary address". */
  labels?: {
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
  };
}

/**
 * Address entry group with Mapbox Search Box autofill baked in.
 *
 * Uses the browser's standard autocomplete tokens so `<AddressAutofill>` from
 * `@mapbox/search-js-react` can populate sibling inputs on selection. When
 * `accessToken` is empty the group degrades to a plain uncontrolled address
 * form so the app still renders during local dev without the token.
 */
export function AddressAutofillGroup({
  accessToken,
  value,
  onChange,
  className,
  country,
  showLine2 = false,
  disabled = false,
  errors,
  labels,
}: AddressAutofillGroupProps) {
  const [justPicked, setJustPicked] = React.useState(false);
  // OSM fallback state: fires in parallel with Mapbox's AddressAutofill when
  // the user types in line1. Renders a supplementary dropdown so users in
  // regions where Mapbox coverage is thin (Ghana, Sierra Leone, Nigeria) can
  // still find their address via community-mapped OSM data.
  const [osmHits, setOsmHits] = React.useState<OsmSuggestion[]>([]);
  const osmTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof AddressAutofillValue>(k: K, v: AddressAutofillValue[K]) => {
    // The user just typed — the pick hint is stale, clear it.
    setJustPicked(false);
    onChange({ ...value, [k]: v });
  };

  // Debounced OSM fetch driven off line1 changes.
  React.useEffect(() => {
    const q = value.line1?.trim() ?? '';
    if (q.length < 3) {
      setOsmHits([]);
      return;
    }
    if (osmTimerRef.current) clearTimeout(osmTimerRef.current);
    osmTimerRef.current = setTimeout(() => {
      void fetchOsmSuggestions(q, country).then(setOsmHits);
    }, 500);
    return () => {
      if (osmTimerRef.current) clearTimeout(osmTimerRef.current);
    };
  }, [value.line1, country]);

  function pickOsm(s: OsmSuggestion) {
    setOsmHits([]);
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
  }

  const line1Label = labels?.line1 ?? 'Address';
  const line2Label = labels?.line2 ?? 'Apartment, suite, etc. (optional)';
  const cityLabel = labels?.city ?? 'City';
  const postalLabel = labels?.postalCode ?? 'Postal code';

  const hint = 'Not detected — add if you know it.';

  const fields = (
    <div className={cn('grid gap-3', className)}>
      <FieldRow label={line1Label} error={errors?.line1}>
        <Input
          value={value.line1}
          onChange={(e) => set('line1', e.target.value)}
          autoComplete="address-line1"
          disabled={disabled}
          placeholder="Start typing your address…"
        />
        {justPicked && !value.line1?.trim() ? (
          <p className="mt-1 text-xs italic text-muted-foreground">{hint}</p>
        ) : null}
        {osmHits.length > 0 ? (
          <div className="mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-md">
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Also found via OpenStreetMap
            </div>
            {osmHits.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickOsm(s)}
                className="block w-full border-t border-border/50 px-3 py-2 text-left text-sm hover:bg-muted/60"
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {s.place_formatted}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </FieldRow>

      {showLine2 ? (
        <FieldRow label={line2Label} error={errors?.line2}>
          <Input
            value={value.line2 ?? ''}
            onChange={(e) => set('line2', e.target.value)}
            autoComplete="address-line2"
            disabled={disabled}
          />
        </FieldRow>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label={cityLabel} error={errors?.city}>
          <Input
            value={value.city}
            onChange={(e) => set('city', e.target.value)}
            autoComplete="address-level2"
            disabled={disabled}
          />
          {justPicked && !value.city?.trim() ? (
            <p className="mt-1 text-xs italic text-muted-foreground">{hint}</p>
          ) : null}
        </FieldRow>
        <FieldRow label={postalLabel} error={errors?.postalCode}>
          <Input
            value={value.postalCode}
            onChange={(e) => set('postalCode', e.target.value)}
            autoComplete="postal-code"
            disabled={disabled}
          />
          {justPicked && !value.postalCode?.trim() ? (
            <p className="mt-1 text-xs italic text-muted-foreground">{hint}</p>
          ) : null}
        </FieldRow>
      </div>
    </div>
  );

  if (!accessToken) return fields;

  return (
    <AddressAutofill
      accessToken={accessToken}
      options={country ? { country, language: 'en' } : { language: 'en' }}
      onRetrieve={(res) => {
        const feat = res.features?.[0];
        if (!feat) return;
        const p = feat.properties;
        // Mapbox GeoJSON convention: geometry.coordinates is [lng, lat].
        const coords = feat.geometry?.coordinates;
        const lng = Array.isArray(coords) ? coords[0] : undefined;
        const lat = Array.isArray(coords) ? coords[1] : undefined;
        // When the user picks a postcode-only or place suggestion, `feature_name`
        // is the postcode / place — dumping it into line1 leaves the address
        // field showing a postcode. Only trust the name when the feature is a
        // real street-level result.
        const canUseNameForLine1 =
          (p as { feature_type?: string }).feature_type === 'address' ||
          (p as { feature_type?: string }).feature_type === 'street' ||
          (p as { feature_type?: string }).feature_type === 'poi';
        const nextLine1 =
          p.address_line1 ?? (canUseNameForLine1 ? p.feature_name : '') ?? '';
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
      }}
    >
      {fields}
    </AddressAutofill>
  );
}

interface OsmSuggestion {
  id: string;
  name: string;
  place_formatted: string;
  lat: number;
  lng: number;
  addressLine1: string;
  city: string;
  postcode: string;
  countryCode?: string;
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
): Promise<OsmSuggestion[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '4');
  if (country) url.searchParams.set('countrycodes', country);
  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as NominatimResult[];
    return rows.map((r) => {
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

function FieldRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
