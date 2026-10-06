import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, Check, PenLine } from 'lucide-react-native';
import {
  Avatar,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
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

/** The picked row, handed back so a caller can show a name without a second fetch. */
export interface PickedMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

interface PickerRow extends PickedMember {
  photoUrl: string | null;
  /** Secondary line — email for the directory source, phone · type for forms. */
  meta: string | null;
}

interface MemberPickerSheetProps {
  open: boolean;
  onClose: () => void;
  /** Branch to scope the search to. Members outside this branch are hidden. */
  branchId: string;
  /** Member ids already picked / already in the target group — hidden from results. */
  excludeMemberIds?: Set<string>;
  /** Fires with the picked member id. Sheet does NOT auto-close — the caller controls it. */
  onPick: (memberId: string, member?: PickedMember) => void;
  /** Sheet title. Defaults to "Add a member". */
  title?: string;
  /** Subtitle under the sheet title. */
  subtitle?: string;
  /** Confirms-on-tap: render a check for the currently selected id instead of the UserPlus glyph. */
  selectedMemberId?: string;
  /**
   * Which search to run.
   *
   * `members` (default) hits the directory — the right source for picking a
   * lead, a mentor or a rota slot, where the target is always a real member.
   * `forms` hits `/api/forms/member-search`, which any logged-in member may
   * call and which matches on phone as well as name, because a form may be
   * filled by someone with no directory reach of their own. It is also the
   * endpoint the web forms use, so a match found on one platform is found on
   * the other.
   */
  source?: 'members' | 'forms';
  /**
   * Offers "Use “<query>” as a name only" as the last row. Present only for a
   * field whose answer may legitimately be a name we can't route to — a
   * visiting child's guardian, a baby's parent. Calling it is the caller's cue
   * to store the typed name and clear any reference.
   */
  onUseTypedName?: (name: string) => void;
  /** Seeds the search box each time the sheet opens. Omit to keep what was typed. */
  initialQuery?: string;
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
  source = 'members',
  onUseTypedName,
  initialQuery,
}: MemberPickerSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [searchInput, setSearchInput] = useState(initialQuery ?? '');
  const debounced = useDebounced(searchInput.trim(), 250);

  // Only seed when the caller asked for it, so existing callers keep whatever
  // they had typed last time the sheet was open.
  useEffect(() => {
    if (open && initialQuery !== undefined) setSearchInput(initialQuery);
  }, [open, initialQuery]);

  const results = useQuery({
    queryKey: ['members', 'picker', { branchId, search: debounced, source }],
    enabled: open && (source === 'members' || debounced.length > 0),
    queryFn: async (): Promise<PickerRow[]> => {
      if (source === 'forms') {
        const found = (await api.forms.memberSearch({ q: debounced, branchId })).data ?? [];
        return found.map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          phone: m.phone,
          photoUrl: null,
          meta: `${m.phone ?? 'No phone'} · ${m.memberType}`,
        }));
      }
      const found =
        (await api.members.list({ branchId, search: debounced || undefined, limit: 20 })).data
          ?.data ?? [];
      return found.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone ?? null,
        photoUrl: m.photoUrl ?? null,
        meta: m.email && !m.redacted ? m.email : null,
      }));
    },
  });

  const filtered = (results.data ?? []).filter((m) =>
    excludeMemberIds ? !excludeMemberIds.has(m.id) : true,
  );
  const typed = searchInput.trim();

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
              <Search color={c.inkFaded} size={16} strokeWidth={1.5} />
            }
          />

          <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
            {results.isLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
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
                  <Pressable key={m.id} onPress={() => onPick(m.id, m)} style={styles.row}>
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
                      {m.meta ? (
                        <Text style={styles.meta} numberOfLines={1}>
                          {m.meta}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Check color={c.success} size={18} strokeWidth={2} />
                    ) : (
                      <UserPlus color={c.primary} size={16} strokeWidth={1.5} />
                    )}
                  </Pressable>
                );
              })
            )}

            {/* The way out, offered under the matches rather than as a second
                field on the form behind this sheet. */}
            {onUseTypedName && typed.length > 0 ? (
              <Pressable
                style={styles.freeTextRow}
                onPress={() => onUseTypedName(typed)}
                accessibilityRole="button"
              >
                <PenLine color={c.inkMuted} size={16} strokeWidth={1.5} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    Use “{typed}” as a name only
                  </Text>
                  <Text style={styles.meta}>
                    They aren’t in the directory, so we’ll record the name without a record.
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </ScrollView>

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.card,
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
    backgroundColor: c.inkGhost,
    alignSelf: 'center',
  },
  sheetTitle: {
    ...typography.cardTitle,
    color: c.ink,
  },
  sheetSub: {
    ...typography.meta,
    color: c.inkMuted,
    marginTop: -6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  freeTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.05)',
  },
  name: { ...typography.body, color: c.ink, fontWeight: '500' },
  meta: { ...typography.meta, color: c.inkMuted },
  empty: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelLabel: {
    ...typography.button,
    color: c.primary,
  },
});
}

