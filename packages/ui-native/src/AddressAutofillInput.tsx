import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  ADDRESS_QUERY_DEBOUNCE_MS,
  ADDRESS_QUERY_MIN_LENGTH,
  generateAddressSessionToken,
  resolveAddressSuggestions,
  resolveOsmSuggestion,
  retrieveMapboxSuggestion,
  type AddressSuggestion,
} from '@kairos/core';
import { Input } from './Input';
import { radii, spacing, typography } from './tokens';
import { useThemedStyles, useColors, type ThemeColors } from './theme';

/** Identifies the app to Nominatim, whose usage policy asks callers to. */
const NOMINATIM_USER_AGENT = 'Kairos/1.0 (kairos.kharis.org)';

export interface AddressAutofillValue {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country?: string;
  /**
   * Populated when the user picks a suggestion. Consumers persist these where
   * applicable (branches) so the fellowships map can render pins organically.
   */
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddressAutofillInputProps {
  /**
   * Mapbox public access token. Pass `process.env.MAPBOX_PUBLIC_TOKEN` in app
   * code. Without a token the input still autocompletes via OpenStreetMap.
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
 * Address entry with autocomplete over Mapbox Search Box plus OpenStreetMap,
 * merged into a single suggestion list.
 *
 * The fetch, merge and dedupe live in `@kairos/core` so this and the web
 * `AddressAutofillGroup` behave identically. This component owns only the
 * rendering and the pick interaction.
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

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [justPicked, setJustPicked] = useState(false);
  const [sessionToken, setSessionToken] = useState(generateAddressSessionToken);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow in-flight request resolving after a newer one and
  // overwriting fresher suggestions with stale ones.
  const requestSeqRef = useRef(0);

  const set = <K extends keyof AddressAutofillValue>(k: K, v: AddressAutofillValue[K]) =>
    onChange({ ...value, [k]: v });

  const line1Label = labels?.line1 ?? 'Address';
  const line2Label = labels?.line2 ?? 'Apartment, suite, etc. (optional)';
  const cityLabel = labels?.city ?? 'City';
  const postalLabel = labels?.postalCode ?? 'Postal code';

  const hint = 'Not detected. Add it if you know it.';

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function handleLine1Change(text: string) {
    set('line1', text);
    setJustPicked(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < ADDRESS_QUERY_MIN_LENGTH) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runQuery(text);
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
        userAgent: NOMINATIM_USER_AGENT,
      });
      if (seq !== requestSeqRef.current) return; // superseded
      setSuggestions(hits);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setSuggestions([]);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }

  async function pick(s: AddressSuggestion) {
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
      // Mapbox bills one session as many suggests plus one retrieve, so the
      // token rotates once a retrieve has consumed it.
      if (s.source === 'mapbox') setSessionToken(generateAddressSessionToken());
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
          trailingSlot={loading ? <ActivityIndicator size="small" color={c.primary} /> : null}
        />
        {justPicked && !value.line1?.trim() ? <Text style={styles.hintText}>{hint}</Text> : null}
        {suggestions.length > 0 ? (
          <View style={styles.suggestionsDropdown}>
            {suggestions.map((s) => (
              <Pressable key={s.id} style={styles.suggestionRow} onPress={() => void pick(s)}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.suggestionMeta} numberOfLines={1}>
                  {s.placeFormatted}
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
          {justPicked && !value.city?.trim() ? <Text style={styles.hintText}>{hint}</Text> : null}
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
            <Text style={styles.hintText}>{hint}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
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
