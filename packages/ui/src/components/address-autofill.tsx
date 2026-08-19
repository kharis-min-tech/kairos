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
  /** Country ISO-2 code to bias the search. Defaults to 'gb'. */
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
  country = 'gb',
  showLine2 = false,
  disabled = false,
  errors,
  labels,
}: AddressAutofillGroupProps) {
  const set = <K extends keyof AddressAutofillValue>(k: K, v: AddressAutofillValue[K]) =>
    onChange({ ...value, [k]: v });

  const line1Label = labels?.line1 ?? 'Address';
  const line2Label = labels?.line2 ?? 'Apartment, suite, etc. (optional)';
  const cityLabel = labels?.city ?? 'City';
  const postalLabel = labels?.postalCode ?? 'Postal code';

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
        </FieldRow>
        <FieldRow label={postalLabel} error={errors?.postalCode}>
          <Input
            value={value.postalCode}
            onChange={(e) => set('postalCode', e.target.value)}
            autoComplete="postal-code"
            disabled={disabled}
          />
        </FieldRow>
      </div>
    </div>
  );

  if (!accessToken) return fields;

  return (
    <AddressAutofill
      accessToken={accessToken}
      options={{ country, language: 'en' }}
      onRetrieve={(res) => {
        const feat = res.features?.[0];
        if (!feat) return;
        const p = feat.properties;
        // Mapbox GeoJSON convention: geometry.coordinates is [lng, lat].
        const coords = feat.geometry?.coordinates;
        const lng = Array.isArray(coords) ? coords[0] : undefined;
        const lat = Array.isArray(coords) ? coords[1] : undefined;
        onChange({
          line1:
            p.address_line1 ??
            [p.feature_name].filter(Boolean).join(' ') ??
            value.line1,
          line2: value.line2,
          city: p.address_level2 ?? value.city,
          postalCode: p.postcode ?? value.postalCode,
          country: p.country_code?.toUpperCase() ?? value.country,
          latitude: typeof lat === 'number' ? lat : value.latitude,
          longitude: typeof lng === 'number' ? lng : value.longitude,
        });
      }}
    >
      {fields}
    </AddressAutofill>
  );
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
