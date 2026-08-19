import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MapPin, X } from 'lucide-react-native';
import Mapbox, { MapView, Camera, PointAnnotation } from '@rnmapbox/maps';
import {
  Badge,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
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

let tokenSet = false;

export default function FellowshipsMap() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [selected, setSelected] = useState<FellowshipWithBranch | null>(null);

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

  const center = useMemo(() => {
    if (pins.length === 0) return [-1.1743, 52.3555] as [number, number]; // UK centroid
    const avgLat = pins.reduce((s, p) => s + p.latitude, 0) / pins.length;
    const avgLng = pins.reduce((s, p) => s + p.longitude, 0) / pins.length;
    return [avgLng, avgLat] as [number, number];
  }, [pins]);

  if (!mapboxPublicToken) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onBack={() => router.back()} />
        <View style={styles.centered}>
          <Card padding="md">
            <Text style={styles.errorText}>
              Map is unavailable — Mapbox token isn&apos;t configured. Ask an
              admin to set the Mapbox public token.
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onBack={() => router.back()} />

      <View style={{ flex: 1 }}>
        <MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Street}>
          <Camera zoomLevel={4} centerCoordinate={center} animationMode="none" />
          {pins.map((f) => (
            <PointAnnotation
              key={f.id}
              id={f.id}
              coordinate={[f.longitude, f.latitude]}
              onSelected={() => setSelected(f)}
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
                No fellowships with coordinates yet. Edit a fellowship and pick
                its meeting address to place it on the map.
              </Text>
            </Card>
          </View>
        ) : null}

        {selected ? (
          <View style={styles.selectedCard}>
            <Card padding="md" style={{ gap: spacing.xs }}>
              <View style={styles.selectedHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedName}>{selected.fellowshipName}</Text>
                  <Text style={styles.selectedMeta}>
                    {selected.branchName}
                    {selected.meetingDay ? ` · ${selected.meetingDay}` : ''}
                    {selected.meetingTime
                      ? ` · ${selected.meetingTime.slice(0, 5)}`
                      : ''}
                  </Text>
                </View>
                <Pressable onPress={() => setSelected(null)} hitSlop={8}>
                  <X color={c.inkMuted} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              <Badge
                label={selected.fellowshipType}
                variant="primary"
                size="sm"
              />
              <Pressable
                onPress={() => {
                  router.push(`/fellowships/${selected.id}`);
                  setSelected(null);
                }}
                style={styles.openBtn}
              >
                <Text style={styles.openLabel}>Open fellowship →</Text>
              </Pressable>
            </Card>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

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
      right: spacing.md,
      backgroundColor: c.card,
      padding: spacing.sm,
      borderRadius: radii.md,
    },
    emptyOverlay: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.md,
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
  });
}
