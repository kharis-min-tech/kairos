import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, Check } from 'lucide-react-native';
import {
  Avatar,
  Input,
  colors,
  radii,
  spacing,
  typography,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

interface MemberPickerSheetProps {
  open: boolean;
  onClose: () => void;
  /** Branch to scope the search to. Members outside this branch are hidden. */
  branchId: string;
  /** Member ids already picked / already in the target group — hidden from results. */
  excludeMemberIds?: Set<string>;
  /** Fires with the picked member id. Sheet does NOT auto-close — the caller controls it. */
  onPick: (memberId: string) => void;
  /** Sheet title. Defaults to "Add a member". */
  title?: string;
  /** Subtitle under the sheet title. */
  subtitle?: string;
  /** Confirms-on-tap: render a check for the currently selected id instead of the UserPlus glyph. */
  selectedMemberId?: string;
}

/**
 * Bottom-sheet picker with debounced server-side search over `api.members.list`
 * scoped to a branch. Used from fellowships/departments detail pages and create
 * forms (lead / deputy picker).
 */
export function MemberPickerSheet({
  open,
  onClose,
  branchId,
  excludeMemberIds,
  onPick,
  title = 'Add a member',
  subtitle = 'Search members in this branch. Tap to add.',
  selectedMemberId,
}: MemberPickerSheetProps) {
  const [searchInput, setSearchInput] = useState('');
  const debounced = useDebounced(searchInput.trim(), 250);

  const results = useQuery({
    queryKey: ['members', 'picker', { branchId, search: debounced }],
    enabled: open,
    queryFn: async () =>
      (
        await api.members.list({
          branchId,
          search: debounced || undefined,
          limit: 20,
        })
      ).data?.data ?? [],
  });

  const filtered = (results.data ?? []).filter((m) =>
    excludeMemberIds ? !excludeMemberIds.has(m.id) : true,
  );

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetSub}>{subtitle}</Text>

          <Input
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by name or email"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            leadingSlot={
              <Search color="rgba(26,28,28,0.4)" size={16} strokeWidth={1.5} />
            }
          />

          <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
            {results.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : filtered.length === 0 ? (
              <Text style={styles.empty}>
                {debounced
                  ? `No matches for "${debounced}" in this branch.`
                  : 'Start typing to search members.'}
              </Text>
            ) : (
              filtered.map((m) => {
                const isSelected = selectedMemberId === m.id;
                return (
                  <Pressable key={m.id} onPress={() => onPick(m.id)} style={styles.row}>
                    <Avatar
                      size="sm"
                      photoUrl={m.photoUrl ?? undefined}
                      firstName={m.firstName}
                      lastName={m.lastName}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {m.firstName} {m.lastName}
                      </Text>
                      {m.email && !m.redacted ? (
                        <Text style={styles.meta} numberOfLines={1}>
                          {m.email}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Check color={colors.success} size={18} strokeWidth={2} />
                    ) : (
                      <UserPlus color={colors.primary} size={16} strokeWidth={1.5} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  sheetSub: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.6)',
    marginTop: -6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,28,28,0.06)',
  },
  name: { ...typography.body, color: colors.ink, fontWeight: '500' },
  meta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  empty: {
    ...typography.body,
    color: 'rgba(26,28,28,0.55)',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelLabel: {
    ...typography.button,
    color: colors.primary,
  },
});
