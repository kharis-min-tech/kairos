import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Check, Map as MapIcon, Search } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Input,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import type { CreateRegionRequest, Region, UpdateRegionRequest } from '@kairos/types';
import { COUNTRIES_BY_CONTINENT } from '@kairos/core';
import { api } from '@/lib/api-client';

const ALL_COUNTRIES: string[] = Object.values(COUNTRIES_BY_CONTINENT)
  .flat()
  .sort();

export default function Regions() {
  const router = useRouter();
  const qc = useQueryClient();

  const regions = useQuery({
    queryKey: ['regions', 'list'],
    queryFn: async () => (await api.regions.list()).data ?? [],
  });

  const [editing, setEditing] = useState<Region | null>(null);
  const [openForm, setOpenForm] = useState<'new' | 'edit' | null>(null);

  const create = useMutation({
    mutationFn: async (data: CreateRegionRequest) =>
      (await api.regions.create(data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regions'] }),
  });

  const update = useMutation({
    mutationFn: async (args: { id: string; data: UpdateRegionRequest }) =>
      (await api.regions.update(args.id, args.data)).data!,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regions'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.regions.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regions'] }),
  });

  async function confirmDelete(r: Region) {
    if ((r.branchCount ?? 0) > 0) {
      alert.info(
        'Region has branches',
        `${r.regionName} has ${r.branchCount} branch${r.branchCount === 1 ? '' : 'es'} attached. Move or delete those first.`,
      );
      return;
    }
    const ok = await alert.confirm({
      title: 'Delete region?',
      message: `Delete ${r.regionName}. This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(r.id, {
      onError: (err) =>
        alert.info(
          'Delete failed',
          err instanceof Error ? err.message : 'Please try again.',
        ),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Regions</Text>
        <Pressable
          onPress={() => {
            setEditing(null);
            setOpenForm('new');
          }}
          hitSlop={8}
          testID="new-region-btn"
          accessibilityLabel="New region"
        >
          <Plus color={colors.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <FlatList
        data={regions.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={regions.isRefetching}
            onRefresh={() => regions.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            {regions.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
            ) : null}
            {regions.isError ? (
              <Card padding="md">
                <Text style={styles.errorLine}>
                  Couldn&apos;t load regions:{' '}
                  {regions.error instanceof Error ? regions.error.message : 'Unknown error'}
                </Text>
              </Card>
            ) : null}
            <Text style={styles.introBlurb}>
              Regions group your branches for reporting and directory browsing. Tap a
              region to rename it or change country. Long-press to delete an empty region.
            </Text>
          </View>
        }
        ListEmptyComponent={
          !regions.isLoading ? (
            <Card padding="md" style={styles.emptyCard}>
              <View style={styles.emptyIconTile}>
                <MapIcon color={colors.primary} size={22} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No regions yet</Text>
              <Text style={styles.emptyMeta}>Tap + to create the first one.</Text>
            </Card>
          ) : null
        }
        renderItem={({ item: r }) => {
          const canDelete = (r.branchCount ?? 0) === 0;
          return (
            <Pressable
              onPress={() => {
                setEditing(r);
                setOpenForm('edit');
              }}
              onLongPress={() => confirmDelete(r)}
              delayLongPress={350}
              style={styles.rowWrap}
            >
              <Card padding="md" style={styles.rowCard}>
                <View style={styles.rowIconTile}>
                  <MapIcon color={colors.primary} size={18} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {r.regionName}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {r.country}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Badge
                    label={
                      typeof r.branchCount === 'number'
                        ? `${r.branchCount} branch${r.branchCount === 1 ? '' : 'es'}`
                        : '—'
                    }
                    variant={canDelete ? 'neutral' : 'primary'}
                    size="sm"
                  />
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          (regions.data ?? []).length > 0 ? (
            <Text style={styles.footnote}>
              Long-press a region to delete. Regions with attached branches can&apos;t be
              deleted until every branch is reassigned or removed.
            </Text>
          ) : null
        }
      />

      <RegionFormSheet
        open={openForm !== null}
        mode={openForm ?? 'new'}
        initial={editing}
        submitting={create.isPending || update.isPending}
        onClose={() => setOpenForm(null)}
        onSubmit={async (data) => {
          try {
            if (openForm === 'edit' && editing) {
              await update.mutateAsync({ id: editing.id, data });
            } else {
              await create.mutateAsync(data);
            }
            setOpenForm(null);
          } catch (err) {
            alert.info(
              'Save failed',
              err instanceof Error ? err.message : 'Please try again.',
            );
          }
        }}
      />
    </SafeAreaView>
  );
}

function RegionFormSheet({
  open,
  mode,
  initial,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'new' | 'edit';
  initial: Region | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRegionRequest) => Promise<void> | void;
}) {
  const [regionName, setRegionName] = useState(initial?.regionName ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  // Reset local state on open + mode/initial change
  const key = `${mode}:${initial?.id ?? 'new'}`;
  const [lastKey, setLastKey] = useState('');
  if (open && key !== lastKey) {
    setRegionName(initial?.regionName ?? '');
    setCountry(initial?.country ?? '');
    setErrors({});
    setLastKey(key);
  }

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [countryQuery]);

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (!regionName.trim()) next['regionName'] = 'Region name is required';
    if (!country) next['country'] = 'Choose a country';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    void onSubmit({ regionName: regionName.trim(), country });
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {mode === 'edit' ? 'Edit region' : 'New region'}
          </Text>

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.fieldLabel}>Region name *</Text>
            <Input
              value={regionName}
              onChangeText={(v) => {
                setRegionName(v);
                setErrors((p) => {
                  const n = { ...p };
                  delete n['regionName'];
                  return n;
                });
              }}
              placeholder="e.g. Greater Accra"
              autoCapitalize="words"
              error={errors['regionName']}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.fieldLabel}>Country *</Text>
            <Pressable
              style={[
                styles.pickerField,
                errors['country'] ? styles.pickerFieldError : null,
              ]}
              onPress={() => setCountryPickerOpen(true)}
            >
              <Text style={country ? styles.pickerValue : styles.pickerPlaceholder}>
                {country || 'Choose a country'}
              </Text>
            </Pressable>
            {errors['country'] ? (
              <Text style={styles.errorLine}>{errors['country']}</Text>
            ) : null}
          </View>

          <View style={styles.sheetActions}>
            <Button
              label="Cancel"
              variant="outline"
              size="md"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              label={submitting ? 'Saving…' : mode === 'edit' ? 'Save' : 'Create'}
              variant="primary"
              size="md"
              loading={submitting}
              onPress={handleSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>

      <Modal
        visible={countryPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Country</Text>
            <Input
              value={countryQuery}
              onChangeText={setCountryQuery}
              placeholder="Search countries"
              autoCapitalize="none"
              autoCorrect={false}
              leadingSlot={
                <Search color="rgba(26,28,28,0.4)" size={16} strokeWidth={1.5} />
              }
            />
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {filteredCountries.map((c) => {
                const selected = country === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.sheetOption, selected && styles.sheetOptionActive]}
                    onPress={() => {
                      setCountry(c);
                      setErrors((p) => {
                        const n = { ...p };
                        delete n['country'];
                        return n;
                      });
                      setCountryPickerOpen(false);
                      setCountryQuery('');
                    }}
                  >
                    <Text
                      style={[
                        styles.sheetOptionLabel,
                        selected && styles.sheetOptionLabelActive,
                      ]}
                    >
                      {c}
                    </Text>
                    {selected ? (
                      <Check color={colors.primary} size={16} strokeWidth={2} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.sheetCancel} onPress={() => setCountryPickerOpen(false)}>
              <Text style={styles.sheetCancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageLight },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.cardTitle, color: colors.ink },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  introBlurb: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    lineHeight: 16,
    paddingHorizontal: spacing.xs,
  },
  rowWrap: {
    marginBottom: spacing.sm,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { ...typography.body, color: colors.ink, fontWeight: '600' },
  rowMeta: { ...typography.meta, color: 'rgba(26,28,28,0.6)' },
  rowRight: {
    alignItems: 'flex-end',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93,63,211,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.cardTitle, color: colors.ink },
  emptyMeta: {
    ...typography.body,
    color: 'rgba(26,28,28,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorLine: {
    ...typography.meta,
    color: colors.danger,
  },
  footnote: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    paddingHorizontal: spacing.xs,
    lineHeight: 15,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardLight,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26,28,28,0.15)',
    alignSelf: 'center',
  },
  sheetTitle: {
    ...typography.cardTitle,
    color: colors.ink,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: colors.ink,
    opacity: 0.6,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(26,28,28,0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  pickerFieldError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  pickerValue: { ...typography.body, color: colors.ink, flex: 1 },
  pickerPlaceholder: {
    ...typography.body,
    color: 'rgba(26,28,28,0.4)',
    flex: 1,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,28,28,0.08)',
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(93,63,211,0.06)',
  },
  sheetOptionLabel: { ...typography.body, color: colors.ink },
  sheetOptionLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sheetCancelLabel: {
    ...typography.button,
    color: colors.primary,
  },
});
