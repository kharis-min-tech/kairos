import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  /** ISO-2 country code to bias suggestions. Defaults to 'gb'. */
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

interface Suggestion {
  mapbox_id: string;
  name: string;
  place_formatted: string;
  address?: string;
}

interface RetrieveFeature {
  properties: {
    address_line1?: string;
    address_line2?: string;
    address_level2?: string;
    postcode?: string;
    country_code?: string;
    name?: string;
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
  country = 'gb',
  showLine2 = false,
  labels,
  errors,
  disabled = false,
}: AddressAutofillInputProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
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
    if (!accessToken || !text.trim() || text.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 250);
  }

  async function fetchSuggestions(query: string) {
    if (!accessToken) return;
    setLoading(true);
    try {
      const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
      url.searchParams.set('q', query);
      url.searchParams.set('access_token', accessToken);
      url.searchParams.set('session_token', sessionToken);
      url.searchParams.set('language', 'en');
      url.searchParams.set('country', country);
      url.searchParams.set('types', 'address,street,place,postcode');
      url.searchParams.set('limit', '6');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Suggest failed (${res.status})`);
      const json = (await res.json()) as { suggestions?: Suggestion[] };
      setSuggestions(json.suggestions ?? []);
      setOpen((json.suggestions ?? []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function pick(s: Suggestion) {
    if (!accessToken) return;
    setOpen(false);
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
      onChange({
        line1: p.address_line1 ?? p.name ?? s.name,
        line2: value.line2,
        city: p.address_level2 ?? value.city,
        postalCode: p.postcode ?? value.postalCode,
        country: p.country_code?.toUpperCase() ?? value.country,
        latitude: typeof lat === 'number' ? lat : value.latitude,
        longitude: typeof lng === 'number' ? lng : value.longitude,
      });
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
        <View style={{ flex: 1 }}>
          <Input
            label={cityLabel}
            value={value.city}
            onChangeText={(v) => set('city', v)}
            autoCapitalize="words"
            editable={!disabled}
            error={errors?.city}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label={postalLabel}
            value={value.postalCode}
            onChangeText={(v) => set('postalCode', v)}
            autoCapitalize="characters"
            editable={!disabled}
            error={errors?.postalCode}
          />
        </View>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Pick an address</Text>
              <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                {suggestions.length === 0 ? (
                  <Text style={styles.emptyText}>No suggestions.</Text>
                ) : (
                  suggestions.map((s) => (
                    <Pressable
                      key={s.mapbox_id}
                      style={styles.suggestionRow}
                      onPress={() => pick(s)}
                    >
                      <Text style={styles.suggestionName}>{s.name}</Text>
                      <Text style={styles.suggestionMeta}>{s.place_formatted}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
              <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
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
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.inkGhost,
    },
    sheetTitle: { ...typography.cardTitle, color: c.ink },
    emptyText: {
      ...typography.body,
      color: c.inkMuted,
      paddingVertical: spacing.md,
      textAlign: 'center',
    },
    suggestionRow: {
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
      gap: 2,
    },
    suggestionName: { ...typography.body, color: c.ink, fontWeight: '600' },
    suggestionMeta: { ...typography.meta, color: c.inkMuted },
    cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
    cancelLabel: { ...typography.button, color: c.primary },
  });
}
