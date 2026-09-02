import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  MapPin,
  X,
  Search,
  Globe,
  Car,
  Bus,
  Train,
  Footprints,
} from 'lucide-react-native';
import Mapbox, { MapView, Camera, PointAnnotation, MarkerView, ShapeSource, LineLayer } from '@rnmapbox/maps';
import {
  Badge,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  useTheme,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { FellowshipWithBranch } from '@kairos/types';
import { FellowshipType } from '@kairos/types';
import { api } from '@/lib/api-client';
import { mapboxPublicToken } from '@/lib/config';

const TYPE_COLORS: Record<string, string> = {
  [FellowshipType.KGroups]: '#8b5cf6',
  [FellowshipType.KharisExpress]: '#f59e0b',
  [FellowshipType.NewBreeds]: '#10b981',
  [FellowshipType.KharisOnCampus]: '#0ea5e9',
  [FellowshipType.KharisOnCampusColleges]: '#f43f5e',
};

// Same list the web map ships with. Kept in [lat, lng] Leaflet order for
// symmetry with the web file; converted to Mapbox [lng, lat] at use sites.
interface CountryData {
  name: string;
  code: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
}

const COUNTRIES: CountryData[] = [
  { name: 'Ghana', code: 'GH', center: [7.9465, -1.0232], zoom: 6 },
  { name: 'United Kingdom', code: 'GB', center: [52.3555, -1.1743], zoom: 5.5 },
  { name: 'United States', code: 'US', center: [37.0902, -95.7129], zoom: 3.5 },
  { name: 'Nigeria', code: 'NG', center: [9.082, 8.6753], zoom: 5.5 },
  { name: 'South Africa', code: 'ZA', center: [-29.0, 25.0834], zoom: 4.5 },
  { name: 'Canada', code: 'CA', center: [56.1304, -106.3468], zoom: 3 },
  { name: 'Germany', code: 'DE', center: [51.1657, 10.4515], zoom: 5.5 },
  { name: 'Sierra Leone', code: 'SL', center: [8.4606, -11.7799], zoom: 6.5 },
];

// Haversine distance in km between two [lat, lng] pairs.
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

let tokenSet = false;

interface NearestState {
  fellowship: FellowshipWithBranch & { latitude: number; longitude: number };
  distanceKm: number;
  userCoords: [number, number]; // [lat, lng]
}

export default function FellowshipsMap() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const { scheme } = useTheme();
  const [selected, setSelected] = useState<FellowshipWithBranch | null>(null);
  const [nearest, setNearest] = useState<NearestState | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [cameraZoom, setCameraZoom] = useState<number | null>(null);

  useEffect(() => {
    if (mapboxPublicToken && !tokenSet) {
      Mapbox.setAccessToken(mapboxPublicToken);
      tokenSet = true;
    }
  }, []);

  const fellowships = useQuery({
    queryKey: ['fellowships', 'map'],
    queryFn: async () => (await api.fellowships.map()).data ?? [],
  });

  const pins = useMemo(
    () =>
      (fellowships.data ?? []).filter(
        (f): f is FellowshipWithBranch & { latitude: number; longitude: number } =>
          f.latitude != null && f.longitude != null,
      ),
    [fellowships.data],
  );

  const defaultCenter = useMemo(() => {
    if (pins.length === 0) return [-1.1743, 52.3555] as [number, number]; // UK centroid
    const avgLat = pins.reduce((s, p) => s + p.latitude, 0) / pins.length;
    const avgLng = pins.reduce((s, p) => s + p.longitude, 0) / pins.length;
    return [avgLng, avgLat] as [number, number];
  }, [pins]);

  function flyTo(latLng: [number, number], zoom: number) {
    setCameraCenter([latLng[1], latLng[0]]);
    setCameraZoom(zoom);
  }

  function onPickCountry(country: CountryData) {
    setCountryPickerOpen(false);
    flyTo(country.center, country.zoom);
    setNearest(null);
    setSelected(null);
  }

  async function onLocatePostcode(query: string): Promise<string | null> {
    if (!query.trim() || pins.length === 0) return 'Nothing to locate against. No fellowships are mapped yet.';
    if (!mapboxPublicToken) return 'Search is unavailable.';
    try {
      // Mapbox forward-geocode via the Search Box API. Same vendor as the
      // basemap + the address autofill, so no rate-limit / User-Agent
      // constraints (Nominatim's terms of use forbid heavy use from apps).
      const url = new URL(
        'https://api.mapbox.com/search/geocode/v6/forward',
      );
      url.searchParams.set('q', query.trim());
      url.searchParams.set('access_token', mapboxPublicToken);
      url.searchParams.set('limit', '1');
      url.searchParams.set('language', 'en');
      const res = await fetch(url.toString());
      if (!res.ok) return 'Location not found';
      const data = (await res.json()) as {
        features?: { geometry?: { coordinates: [number, number] } }[];
      };
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (!coords) return 'Location not found';
      // Mapbox geocode returns [lng, lat]; rest of this file uses [lat, lng].
      const userLatLng: [number, number] = [coords[1], coords[0]];

      let best: (FellowshipWithBranch & { latitude: number; longitude: number }) | null = null;
      let bestKm = Infinity;
      for (const f of pins) {
        const km = haversineKm(userLatLng, [f.latitude, f.longitude]);
        if (km < bestKm) {
          bestKm = km;
          best = f;
        }
      }
      if (!best) return 'No fellowships found nearby';
      setNearest({ fellowship: best, distanceKm: bestKm, userCoords: userLatLng });
      setSelected(null);

      // Frame the camera to include both — pick a midpoint + a zoom based on
      // the great-circle distance. Not as tight as fitBounds but reads cleanly.
      const midLat = (userLatLng[0] + best.latitude) / 2;
      const midLng = (userLatLng[1] + best.longitude) / 2;
      const zoom = bestKm > 200 ? 5 : bestKm > 50 ? 7 : bestKm > 10 ? 9 : 11;
      setCameraCenter([midLng, midLat]);
      setCameraZoom(zoom);
      return null;
    } catch {
      return 'Search failed';
    }
  }

  if (!mapboxPublicToken) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <View style={styles.centered}>
          <Card padding="md">
            <Text style={styles.errorText}>
              Map is unavailable. The Mapbox token isn&apos;t configured. Ask an
              admin to set the Mapbox public token.
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const styleURL = scheme === 'dark' ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1 }}>
          <MapView style={{ flex: 1 }} styleURL={styleURL}>
            <Camera
              zoomLevel={cameraZoom ?? 4}
              centerCoordinate={cameraCenter ?? defaultCenter}
              animationMode={cameraCenter ? 'flyTo' : 'none'}
              animationDuration={1500}
            />
            {pins.map((f) => (
              <PointAnnotation
                key={f.id}
                id={f.id}
                coordinate={[f.longitude, f.latitude]}
                onSelected={() => {
                  setSelected(f);
                  setNearest(null);
                }}
              >
                <View
                  style={[
                    styles.pin,
                    { backgroundColor: TYPE_COLORS[f.fellowshipType] ?? c.primary },
                  ]}
                >
                  <MapPin color="#ffffff" size={14} strokeWidth={2} />
                </View>
              </PointAnnotation>
            ))}

            {nearest ? (
              <>
                <MarkerView coordinate={[nearest.userCoords[1], nearest.userCoords[0]]}>
                  <View style={styles.userDot} />
                </MarkerView>
                <ShapeSource
                  id="nearest-line"
                  shape={{
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: [
                        [nearest.userCoords[1], nearest.userCoords[0]],
                        [nearest.fellowship.longitude, nearest.fellowship.latitude],
                      ],
                    },
                  }}
                >
                  <LineLayer
                    id="nearest-line-layer"
                    style={{
                      lineColor: c.primary,
                      lineWidth: 2,
                      lineDasharray: [2, 3],
                      lineOpacity: 0.7,
                    }}
                  />
                </ShapeSource>
              </>
            ) : null}
          </MapView>

          {fellowships.isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : null}

          {pins.length === 0 && !fellowships.isLoading ? (
            <View style={styles.emptyOverlay}>
              <Card padding="md">
                <Text style={styles.emptyText}>
                  No fellowships with coordinates yet. Edit a fellowship or its
                  parent branch and pick an address to place it on the map.
                </Text>
              </Card>
            </View>
          ) : null}

          <View style={styles.searchStack}>
            <PostcodeSearch onLocate={onLocatePostcode} />
            <CountryButton onPress={() => setCountryPickerOpen(true)} />
          </View>

          {selected && !nearest ? (
            <SelectedCard
              fellowship={selected}
              onClose={() => setSelected(null)}
              onOpen={() => {
                router.push(`/fellowships/${selected.id}`);
                setSelected(null);
              }}
            />
          ) : null}

          {nearest ? (
            <NearestCard
              nearest={nearest}
              onClose={() => {
                setNearest(null);
                setCameraCenter(null);
                setCameraZoom(null);
              }}
              onOpen={() => router.push(`/fellowships/${nearest.fellowship.id}`)}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <CountryPicker
        open={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        onPick={onPickCountry}
      />
    </SafeAreaView>
  );
}

// ─── Header ─────────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.headerBar}>
      <Pressable onPress={onBack} hitSlop={8}>
        <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
      </Pressable>
      <Text style={styles.headerTitle}>Fellowships map</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

// ─── Search overlays ────────────────────────────────────────

function PostcodeSearch({
  onLocate,
}: {
  onLocate: (query: string) => Promise<string | null>;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGo() {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    const err = await onLocate(value);
    setBusy(false);
    if (err) setError(err);
    else setValue('');
  }

  return (
    <View style={styles.searchCard}>
      <View style={styles.searchRow}>
        <Search color={c.inkFaded} size={14} strokeWidth={1.5} />
        <TextInput
          value={value}
          onChangeText={(t) => {
            setValue(t.toUpperCase());
            setError(null);
          }}
          onSubmitEditing={handleGo}
          placeholder="POSTCODE OR CITY…"
          placeholderTextColor={c.inkFaded}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Pressable
          onPress={handleGo}
          disabled={busy || !value.trim()}
          style={[styles.goBtn, (busy || !value.trim()) && { opacity: 0.5 }]}
        >
          <Text style={styles.goBtnLabel}>{busy ? '…' : 'GO'}</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.searchError}>{error}</Text> : null}
    </View>
  );
}

function CountryButton({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable style={styles.countryBtn} onPress={onPress}>
      <Globe color={c.primary} size={14} strokeWidth={1.5} />
      <Text style={styles.countryBtnLabel}>Jump to country</Text>
    </Pressable>
  );
}

function CountryPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (c: CountryData) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : COUNTRIES;
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Jump to country</Text>
          <View style={styles.sheetSearchRow}>
            <Search color="#888" size={14} strokeWidth={1.5} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country…"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.sheetSearchInput}
            />
          </View>
          <ScrollView style={{ maxHeight: 360 }}>
            {filtered.length === 0 ? (
              <Text style={styles.searchError}>No matches.</Text>
            ) : (
              filtered.map((c) => (
                <Pressable
                  key={c.code}
                  style={styles.countryRow}
                  onPress={() => onPick(c)}
                >
                  <Text style={styles.countryRowLabel}>{c.name}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Selected fellowship card ───────────────────────────────

function SelectedCard({
  fellowship,
  onClose,
  onOpen,
}: {
  fellowship: FellowshipWithBranch;
  onClose: () => void;
  onOpen: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.selectedCard}>
      <Card padding="md" style={{ gap: spacing.xs }}>
        <View style={styles.selectedHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedName}>{fellowship.fellowshipName}</Text>
            <Text style={styles.selectedMeta}>
              {fellowship.branchName}
              {fellowship.meetingDay ? ` · ${fellowship.meetingDay}` : ''}
              {fellowship.meetingTime ? ` · ${fellowship.meetingTime.slice(0, 5)}` : ''}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <X color={c.inkMuted} size={16} strokeWidth={1.5} />
          </Pressable>
        </View>
        <Badge label={fellowship.fellowshipType} variant="primary" size="sm" />
        <Pressable onPress={onOpen} style={styles.openBtn}>
          <Text style={styles.openLabel}>Open fellowship →</Text>
        </Pressable>
      </Card>
    </View>
  );
}

// ─── Nearest fellowship + travel card ───────────────────────

function NearestCard({
  nearest,
  onClose,
  onOpen,
}: {
  nearest: NearestState;
  onClose: () => void;
  onOpen: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const { fellowship, distanceKm, userCoords } = nearest;
  const dest: [number, number] = [fellowship.latitude, fellowship.longitude];

  const travelModes = [
    { label: 'Walk', mins: Math.round((distanceKm / 5) * 60), icon: Footprints, mode: 'walking' as const },
    { label: 'Bus', mins: Math.round((distanceKm / 20) * 60), icon: Bus, mode: 'transit' as const },
    { label: 'Car', mins: Math.round((distanceKm / 40) * 60), icon: Car, mode: 'driving' as const },
    { label: 'Train', mins: Math.round((distanceKm / 60) * 60), icon: Train, mode: 'transit' as const },
  ];

  function displayTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function openInMap(mode: 'walking' | 'transit' | 'driving') {
    // Cross-platform pattern: universal Google Maps URL works everywhere — on
    // iOS it opens the Google Maps app if installed, otherwise Apple Maps via
    // the browser. Reliable + zero-config.
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${dest[0]},${dest[1]}&travelmode=${mode}`;
    Linking.openURL(url).catch(() => {
      /* swallow — user may cancel the app-picker */
    });
  }

  function openInAppleMaps() {
    // iOS-only deep link. On Android this falls through to the browser which
    // is a reasonable fallback.
    const url = `http://maps.apple.com/?daddr=${dest[0]},${dest[1]}&dirflg=d`;
    Linking.openURL(url).catch(() => {});
  }

  function openInWaze() {
    const url = `https://waze.com/ul?ll=${dest[0]},${dest[1]}&navigate=yes`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={styles.nearestCard}>
      <Card padding="md" style={{ gap: spacing.sm }}>
        <View style={styles.selectedHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nearestEyebrow}>NEAREST FELLOWSHIP</Text>
            <Text style={styles.nearestName}>{fellowship.fellowshipName}</Text>
            <Text style={styles.selectedMeta}>
              {fellowship.branchName} · {distanceKm.toFixed(1)} km away
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <X color={c.inkMuted} size={16} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.travelRow}>
          {travelModes.map((tm) => {
            const Icon = tm.icon;
            return (
              <Pressable
                key={tm.label}
                style={styles.travelTile}
                onPress={() => openInMap(tm.mode)}
              >
                <Icon color={c.primary} size={20} strokeWidth={1.5} />
                <Text style={styles.travelLabel}>{tm.label}</Text>
                <Text style={styles.travelTime}>{displayTime(tm.mins)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.appRow}>
          <Text style={styles.appRowLabel}>Open in</Text>
          {Platform.OS === 'ios' ? (
            <Pressable onPress={openInAppleMaps} style={styles.appLink}>
              <Text style={styles.appLinkLabel}>Apple Maps</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => openInMap('driving')} style={styles.appLink}>
            <Text style={styles.appLinkLabel}>Google Maps</Text>
          </Pressable>
          <Pressable onPress={openInWaze} style={styles.appLink}>
            <Text style={styles.appLinkLabel}>Waze</Text>
          </Pressable>
        </View>

        <Pressable onPress={onOpen} style={styles.openBtn}>
          <Text style={styles.openLabel}>Open fellowship →</Text>
        </Pressable>
      </Card>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: { ...typography.cardTitle, color: c.ink },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    errorText: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    loadingOverlay: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      backgroundColor: c.card,
      padding: spacing.sm,
      borderRadius: radii.md,
    },
    emptyOverlay: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      top: spacing.md,
    },
    emptyText: { ...typography.body, color: c.inkMuted, lineHeight: 20 },
    pin: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    userDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#3b82f6',
      borderWidth: 3,
      borderColor: '#ffffff',
    },

    searchStack: {
      position: 'absolute',
      right: spacing.md,
      top: spacing.md,
      gap: spacing.xs,
      width: 240,
    },
    searchCard: {
      backgroundColor: c.card,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: c.ink,
      paddingVertical: spacing.sm,
    },
    goBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.sm,
    },
    goBtnLabel: { ...typography.meta, color: '#ffffff', fontWeight: '700' },
    searchError: { ...typography.meta, color: c.danger, padding: spacing.xs },
    countryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.card,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: spacing.sm,
    },
    countryBtnLabel: { ...typography.meta, color: c.primary, fontWeight: '700' },

    selectedCard: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.md,
    },
    selectedHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    selectedName: { ...typography.body, color: c.ink, fontWeight: '700' },
    selectedMeta: { ...typography.meta, color: c.inkMuted, marginTop: 2 },
    openBtn: { alignSelf: 'flex-start', paddingTop: spacing.xs },
    openLabel: { ...typography.body, color: c.primary, fontWeight: '700' },

    nearestCard: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.md,
    },
    nearestEyebrow: { ...typography.eyebrow, color: c.inkMuted, letterSpacing: 1 },
    nearestName: { ...typography.cardTitle, color: c.ink, marginTop: 2 },
    travelRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    travelTile: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: c.subtle,
    },
    travelLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    travelTime: { ...typography.body, color: c.ink, fontWeight: '700' },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: 4,
    },
    appRowLabel: { ...typography.meta, color: c.inkFaded },
    appLink: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(93,63,211,0.1)',
    },
    appLinkLabel: { ...typography.meta, color: c.primary, fontWeight: '700' },

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
    sheetSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: c.subtle,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
    },
    sheetSearchInput: {
      flex: 1,
      ...typography.body,
      color: c.ink,
      paddingVertical: spacing.sm,
    },
    countryRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    countryRowLabel: { ...typography.body, color: c.ink },
  });
}
