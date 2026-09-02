'use client';

import * as React from 'react';
import {
  ADDRESS_QUERY_DEBOUNCE_MS,
  ADDRESS_QUERY_MIN_LENGTH,
  generateAddressSessionToken,
  resolveAddressSuggestions,
  resolveOsmSuggestion,
  retrieveMapboxSuggestion,
  type AddressSuggestion,
} from '@kairos/core';
import { Input } from './input';
import { Label } from './label';
import { cn } from '../lib/utils';

export interface AddressAutofillValue {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country?: string;
  /**
   * Populated when the user picks a suggestion. Consumers that persist
   * coordinates (branches, fellowships) should forward these to the API;
   * consumers that don't care about coords (member address, for postal
   * correspondence only) can ignore them.
   */
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddressAutofillGroupProps {
  /**
   * Mapbox public access token. Pass `process.env.NEXT_PUBLIC_MAPBOX_TOKEN` in
   * app code. Without a token the group still autocompletes via OpenStreetMap,
   * so local dev works with no Mapbox setup at all.
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
 * Address entry group with autocomplete over Mapbox Search Box plus
 * OpenStreetMap, merged into a single suggestion list.
 *
 * Suggestions are fetched by {@link resolveAddressSuggestions} in
 * `@kairos/core`, shared with the native picker so the two platforms behave
 * identically.
 *
 * The list is driven by the typing handler, NOT by a `useEffect` watching
 * `value.line1`. That distinction matters: picking a suggestion writes back to
 * `line1`, so a value-watching effect re-fires on the write and re-opens the
 * dropdown the user just dismissed.
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
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [justPicked, setJustPicked] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [sessionToken, setSessionToken] = React.useState(generateAddressSessionToken);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Guards against a slow in-flight request resolving after a newer one and
  // overwriting fresher suggestions with stale ones.
  const requestSeqRef = React.useRef(0);

  const listboxId = React.useId();
  const line1Id = React.useId();

  React.useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Dismiss on outside click, matching every other combobox on the platform.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(e.target as Node)) closeList();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  function closeList() {
    setOpen(false);
    setActiveIndex(-1);
  }

  const set = <K extends keyof AddressAutofillValue>(k: K, v: AddressAutofillValue[K]) => {
    // The user typed, so the "we just filled this in for you" hint is stale.
    setJustPicked(false);
    onChange({ ...value, [k]: v });
  };

  function handleLine1Change(next: string) {
    set('line1', next);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (next.trim().length < ADDRESS_QUERY_MIN_LENGTH) {
      setSuggestions([]);
      closeList();
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runQuery(next);
    }, ADDRESS_QUERY_DEBOUNCE_MS);
  }

  async function runQuery(query: string) {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const hits = await resolveAddressSuggestions(query, {
        accessToken,
        sessionToken,
        country,
      });
      if (seq !== requestSeqRef.current) return; // superseded
      setSuggestions(hits);
      setOpen(hits.length > 0);
      setActiveIndex(-1);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setSuggestions([]);
      closeList();
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }

  async function pick(s: AddressSuggestion) {
    // Close first. Any state the resolve writes must not reopen the list.
    closeList();
    setSuggestions([]);
    requestSeqRef.current++; // cancel anything still in flight

    try {
      const resolved =
        s.source === 'osm'
          ? resolveOsmSuggestion(s)
          : accessToken
            ? await retrieveMapboxSuggestion(s.mapboxId, accessToken, sessionToken)
            : null;
      if (!resolved) return;

      onChange({
        // Fall back to what the user already typed rather than blanking a
        // field the provider had no answer for.
        line1: resolved.line1 || value.line1,
        line2: value.line2,
        city: resolved.city || value.city,
        postalCode: resolved.postalCode || value.postalCode,
        country: resolved.country ?? value.country,
        latitude: resolved.latitude ?? value.latitude,
        longitude: resolved.longitude ?? value.longitude,
      });
      setJustPicked(true);
    } catch {
      // Leave the typed text as-is; the user can complete the fields manually.
    } finally {
      if (s.source === 'mapbox') setSessionToken(generateAddressSessionToken());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      // `noUncheckedIndexedAccess` is on, so this can be undefined in the type
      // system even though activeIndex is bounded by the arrow-key handlers.
      const active = suggestions[activeIndex];
      if (active) void pick(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeList();
    }
  }

  const line1Label = labels?.line1 ?? 'Address';
  const line2Label = labels?.line2 ?? 'Apartment, suite, etc. (optional)';
  const cityLabel = labels?.city ?? 'City';
  const postalLabel = labels?.postalCode ?? 'Postal code';

  const hint = 'Not detected. Add it if you know it.';

  return (
    <div className={cn('grid gap-3', className)} ref={containerRef}>
      <FieldRow label={line1Label} error={errors?.line1} controlId={line1Id}>
        <div className="relative">
          <Input
            id={line1Id}
            value={value.line1}
            onChange={(e) => handleLine1Change(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            autoComplete="off"
            disabled={disabled}
            placeholder="Start typing your address…"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
            }
          />
          {loading ? (
            <span
              className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-[#5D3FD3]"
              aria-hidden="true"
            />
          ) : null}

          {open && suggestions.length > 0 ? (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg"
            >
              {suggestions.map((s, i) => (
                <li key={s.id} role="none">
                  <button
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    type="button"
                    // `onMouseDown` rather than `onClick`: the input's blur
                    // would otherwise tear the list down before the click
                    // lands.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void pick(s);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'block w-full border-t border-border/50 px-3 py-2 text-left text-sm first:border-t-0',
                      i === activeIndex ? 'bg-muted/70' : 'hover:bg-muted/60',
                    )}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">
                      {s.placeFormatted}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {justPicked && !value.line1?.trim() ? (
          <p className="mt-1 text-xs italic text-muted-foreground">{hint}</p>
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
}

function FieldRow({
  label,
  error,
  controlId,
  children,
}: {
  label: string;
  error?: string;
  /**
   * Id of the control the label points at. Pass this when the row's children
   * are a wrapper rather than the input itself — cloning an `id` onto a
   * wrapping `<div>` would leave the label pointing at a non-focusable node.
   */
  controlId?: string;
  children: React.ReactNode;
}) {
  const generatedId = React.useId();
  const id = controlId ?? generatedId;
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {!controlId && React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
