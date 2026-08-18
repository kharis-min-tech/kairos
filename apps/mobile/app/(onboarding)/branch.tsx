import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, Check } from 'lucide-react-native';
import {
  Button,
  Badge,
  ProgressBar,
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { BranchWithRegion } from '@kairos/types';
import { api } from '@/lib/api-client';
import { useOnboardingStore } from '@/store/onboarding';

export default function BranchScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const savedBranchId = useOnboardingStore((s) => s.branchId);
  const setBranchId = useOnboardingStore((s) => s.setBranchId);
  const markDone = useOnboardingStore((s) => s.markDone);
  const [selected, setSelected] = useState<string | null>(savedBranchId);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['branches', 'public'],
    queryFn: async () => (await api.branches.listPublic()).data ?? [],
  });

  const grouped = useMemo(() => {
    const branches: BranchWithRegion[] = data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? branches.filter((b) => b.branchName.toLowerCase().includes(q))
      : branches;
    return filtered.reduce<Record<string, BranchWithRegion[]>>((acc, b) => {
      (acc[b.regionName] ??= []).push(b);
      return acc;
    }, {});
  }, [data, search]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.progressWrap}>
          <ProgressBar value={2 / 3} color={c.primary} height={4} />
        </View>
        <Text style={styles.stepLabel}>2 of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Where do you fellowship?</Text>

        <View style={styles.searchField}>
          <Search color={c.inkFaded} size={18} strokeWidth={1.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search branches"
            placeholderTextColor={c.inkFaded}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
        ) : null}

        {isError ? (
          <Text style={styles.errorText}>Couldn&apos;t load branches. Check your connection.</Text>
        ) : null}

        {Object.entries(grouped).map(([region, list]) => (
          <View key={region} style={styles.group}>
            <Text style={styles.groupLabel}>{region}</Text>
            {list.map((b) => {
              const isSelected = selected === b.id;
              return (
                <Pressable
                  key={b.id}
                  testID={`branch-row-${b.branchName}`}
                  onPress={() => setSelected(b.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  style={[styles.row, isSelected && styles.rowSelected]}
                >
                  <View style={styles.rowInfo}>
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.rowTitle}>{b.branchName}</Text>
                      {b.branchType === 'Main' ? (
                        <Badge label="Main" variant="primary" size="sm" />
                      ) : null}
                    </View>
                    <Text style={styles.rowSub}>
                      {b.city ?? b.branchType}
                    </Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected ? (
                      <Check color="#ffffff" size={12} strokeWidth={2.5} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          fullWidth
          disabled={!selected}
          onPress={async () => {
            if (!selected) return;
            await setBranchId(selected);
            await markDone();
            router.replace('/(auth)/login');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.page },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progressWrap: { flex: 1 },
  stepLabel: {
    ...typography.meta,
    color: c.inkMuted,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    color: c.ink,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.divider,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: c.ink,
  },
  errorText: {
    ...typography.body,
    color: c.danger,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  group: { gap: spacing.sm },
  groupLabel: {
    ...typography.eyebrow,
    color: c.inkMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.divider,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowSelected: {
    borderColor: c.primary,
    borderWidth: 1.5,
  },
  rowInfo: { flex: 1, gap: spacing.xs },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowTitle: { ...typography.cardTitle, color: c.ink },
  rowSub: { ...typography.meta, color: c.inkMuted },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: c.primary,
    backgroundColor: c.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
});
}

