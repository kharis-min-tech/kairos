import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft, Plus, Trash2, Shirt, Calendar } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type {
  DepartmentUniformOutfit,
  DepartmentUniformScheduleWithOutfit,
} from '@kairos/types';
import { UniformGenderTarget } from '@kairos/types';
import { api } from '@/lib/api-client';
import { alert } from '@/lib/alert';

type Tab = 'schedule' | 'outfits';

export default function DepartmentUniforms() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const branchDeptId = id!;

  const [tab, setTab] = useState<Tab>('schedule');
  const [outfitSheet, setOutfitSheet] = useState<{
    mode: 'new' | 'edit';
    outfit?: DepartmentUniformOutfit;
  } | null>(null);
  const [assignSheet, setAssignSheet] = useState(false);

  const dept = useQuery({
    queryKey: ['departments', branchDeptId],
    enabled: !!branchDeptId,
    queryFn: async () => (await api.departments.get(branchDeptId)).data ?? null,
  });

  const outfits = useQuery({
    queryKey: ['departments', branchDeptId, 'uniforms', 'outfits'],
    enabled: !!branchDeptId,
    queryFn: async () =>
      (await api.departments.uniforms.listOutfits(branchDeptId)).data ?? [],
  });

  const upcoming = useQuery({
    queryKey: ['departments', branchDeptId, 'uniforms', 'upcoming'],
    enabled: !!branchDeptId,
    queryFn: async () =>
      (await api.departments.uniforms.upcoming(branchDeptId)).data ?? [],
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['departments', branchDeptId, 'uniforms'] });

  const activeOutfits = useMemo(
    () => (outfits.data ?? []).filter((o) => o.isActive),
    [outfits.data],
  );

  const deactivate = useMutation({
    mutationFn: async (outfitId: string) =>
      (await api.departments.uniforms.deactivateOutfit(branchDeptId, outfitId)).data!,
    onSuccess: () => invalidate(),
    onError: (e: Error) =>
      alert.info('Could not archive', e.message ?? 'Please try again.'),
  });

  const removeAssignment = useMutation({
    mutationFn: async (assignmentId: string) =>
      (await api.departments.uniforms.removeAssignment(branchDeptId, assignmentId))
        .data!,
    onSuccess: () => invalidate(),
    onError: (e: Error) =>
      alert.info('Could not remove', e.message ?? 'Please try again.'),
  });

  async function confirmDeactivateOutfit(o: DepartmentUniformOutfit) {
    const ok = await alert.confirm({
      title: 'Archive outfit?',
      message: `"${o.name}" will stop appearing when scheduling future services.`,
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) return;
    deactivate.mutate(o.id);
  }

  async function confirmRemoveAssignment(a: DepartmentUniformScheduleWithOutfit) {
    const ok = await alert.confirm({
      title: 'Remove assignment?',
      message: `Remove "${a.outfitName}" from ${new Date(a.serviceDate).toLocaleDateString()}.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    removeAssignment.mutate(a.id);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Uniforms</Text>
        <Pressable
          onPress={() =>
            tab === 'outfits' ? setOutfitSheet({ mode: 'new' }) : setAssignSheet(true)
          }
          hitSlop={8}
          accessibilityLabel="Add"
        >
          <Plus color={c.primary} size={22} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['schedule', 'outfits'] as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t === 'schedule' ? 'Upcoming' : 'Outfits'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={outfits.isFetching || upcoming.isFetching}
            onRefresh={() => {
              outfits.refetch();
              upcoming.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        {dept.data ? (
          <Text style={styles.contextLine}>
            {dept.data.departmentName} · {dept.data.branchName}
          </Text>
        ) : null}

        {tab === 'schedule' ? (
          upcoming.isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
          ) : (upcoming.data ?? []).length === 0 ? (
            <Card padding="md">
              <Text style={styles.emptyLine}>
                No upcoming assignments. Tap + to schedule an outfit for a service.
              </Text>
            </Card>
          ) : (
            (upcoming.data ?? []).map((a) => (
              <ScheduleCard
                key={a.id}
                row={a}
                onRemove={() => confirmRemoveAssignment(a)}
              />
            ))
          )
        ) : outfits.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xxl }} />
        ) : activeOutfits.length === 0 ? (
          <Card padding="md">
            <Text style={styles.emptyLine}>
              No outfits yet. Tap + to add one — you&apos;ll need a hosted image URL.
            </Text>
          </Card>
        ) : (
          activeOutfits.map((o) => (
            <OutfitCard
              key={o.id}
              outfit={o}
              onEdit={() => setOutfitSheet({ mode: 'edit', outfit: o })}
              onArchive={() => confirmDeactivateOutfit(o)}
            />
          ))
        )}
      </ScrollView>

      {outfitSheet ? (
        <OutfitSheet
          mode={outfitSheet.mode}
          outfit={outfitSheet.outfit}
          branchDeptId={branchDeptId}
          onClose={() => setOutfitSheet(null)}
          onDone={() => {
            invalidate();
            setOutfitSheet(null);
          }}
        />
      ) : null}

      {assignSheet ? (
        <AssignSheet
          outfits={activeOutfits}
          branchDeptId={branchDeptId}
          onClose={() => setAssignSheet(false)}
          onDone={() => {
            invalidate();
            setAssignSheet(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ScheduleCard({
  row,
  onRemove,
}: {
  row: DepartmentUniformScheduleWithOutfit;
  onRemove: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Card padding="md" style={styles.row}>
      {row.outfitImageUrl ? (
        <Image source={{ uri: row.outfitImageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Shirt color={c.primary} size={20} strokeWidth={1.5} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{row.outfitName}</Text>
        <Text style={styles.meta}>
          {new Date(row.serviceDate).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
          {row.genderTarget !== 'Unisex' ? ` · ${row.genderTarget}` : ''}
          {row.affectsCount ? ` · ${row.affectsCount} member${row.affectsCount === 1 ? '' : 's'}` : ''}
        </Text>
        {row.notes ? <Text style={styles.metaFaded}>{row.notes}</Text> : null}
      </View>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Remove assignment">
        <Trash2 color={c.danger} size={16} strokeWidth={1.5} />
      </Pressable>
    </Card>
  );
}

function OutfitCard({
  outfit,
  onEdit,
  onArchive,
}: {
  outfit: DepartmentUniformOutfit;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onEdit}>
      <Card padding="md" style={styles.row}>
        {outfit.imageUrl ? (
          <Image source={{ uri: outfit.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Shirt color={c.primary} size={20} strokeWidth={1.5} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.titleLine}>
            <Text style={styles.title}>{outfit.name}</Text>
            <Badge label={outfit.genderTarget} variant="neutral" size="sm" />
          </View>
          {outfit.notes ? <Text style={styles.metaFaded}>{outfit.notes}</Text> : null}
        </View>
        <Pressable onPress={onArchive} hitSlop={8} accessibilityLabel="Archive outfit">
          <Trash2 color={c.danger} size={16} strokeWidth={1.5} />
        </Pressable>
      </Card>
    </Pressable>
  );
}

function OutfitSheet({
  mode,
  outfit,
  branchDeptId,
  onClose,
  onDone,
}: {
  mode: 'new' | 'edit';
  outfit?: DepartmentUniformOutfit;
  branchDeptId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [name, setName] = useState(outfit?.name ?? '');
  const [imageUrl, setImageUrl] = useState(outfit?.imageUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [gender, setGender] = useState<UniformGenderTarget>(
    outfit?.genderTarget ?? UniformGenderTarget.Unisex,
  );
  const [notes, setNotes] = useState(outfit?.notes ?? '');

  async function handlePickImage(source: 'library' | 'camera') {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert.info(
        'Permission needed',
        source === 'camera'
          ? 'Grant camera access in Settings to take a photo.'
          : 'Grant photo library access in Settings to pick a photo.',
      );
      return;
    }
    const pick =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          });
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];

    setUploading(true);
    try {
      const mint = await api.media.mintUploadUrl({ purpose: 'uniform-outfit' });
      const { uploadUrl, deliveryUrl } = mint.data!;
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: 'upload.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
      const res = await fetch(uploadUrl, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setImageUrl(deliveryUrl);
    } catch (e) {
      alert.info(
        'Upload failed',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setUploading(false);
    }
  }

  const mutate = useMutation({
    mutationFn: async () => {
      if (mode === 'new') {
        const payload: Parameters<typeof api.departments.uniforms.createOutfit>[1] = {
          name: name.trim(),
          imageUrl: imageUrl.trim(),
          genderTarget: gender,
        };
        if (notes.trim()) payload.notes = notes.trim();
        return (await api.departments.uniforms.createOutfit(branchDeptId, payload)).data!;
      } else {
        if (!outfit) throw new Error('No outfit');
        return (
          await api.departments.uniforms.updateOutfit(branchDeptId, outfit.id, {
            name: name.trim(),
            imageUrl: imageUrl.trim(),
            genderTarget: gender,
            notes: notes.trim() || null,
          })
        ).data!;
      }
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not save', e instanceof Error ? e.message : 'Please try again.'),
  });

  return (
    <SheetShell open title={mode === 'new' ? 'New outfit' : 'Edit outfit'} onClose={onClose}>
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>Name</Text>
        <Input value={name} onChangeText={setName} placeholder="e.g. White shirt + black trousers" />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Photo</Text>
        <View style={styles.uploadRow}>
          <View style={styles.uploadPreview}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.uploadThumb} />
            ) : (
              <View style={[styles.uploadThumb, styles.uploadThumbFallback]}>
                <Shirt color={c.primary} size={24} strokeWidth={1.5} />
              </View>
            )}
            {uploading ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Pressable
              style={styles.uploadBtn}
              onPress={() => handlePickImage('library')}
              disabled={uploading}
            >
              <Plus color={c.primary} size={14} strokeWidth={2} />
              <Text style={styles.uploadBtnLabel}>
                {imageUrl ? 'Change photo' : 'Choose from library'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.uploadBtn}
              onPress={() => handlePickImage('camera')}
              disabled={uploading}
            >
              <Camera color={c.primary} size={14} strokeWidth={2} />
              <Text style={styles.uploadBtnLabel}>Take a photo</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>Applies to</Text>
        <View style={styles.chipRow}>
          {Object.values(UniformGenderTarget).map((g) => {
            const active = g === gender;
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.label}>Notes (optional)</Text>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything the team should know"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          containerStyle={{ minHeight: 70 }}
        />
      </View>
      <Button
        label={mutate.isPending ? 'Saving…' : mode === 'new' ? 'Add outfit' : 'Save changes'}
        size="lg"
        fullWidth
        loading={mutate.isPending}
        onPress={() => {
          if (!name.trim()) return alert.info('Missing name', 'Give the outfit a name.');
          if (!imageUrl.trim()) return alert.info('Missing photo', 'Pick a photo or take one first.');
          mutate.mutate();
        }}
      />
    </SheetShell>
  );
}

function AssignSheet({
  outfits,
  branchDeptId,
  onClose,
  onDone,
}: {
  outfits: DepartmentUniformOutfit[];
  branchDeptId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [outfitId, setOutfitId] = useState<string>(outfits[0]?.id ?? '');
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [gender, setGender] = useState<UniformGenderTarget>(UniformGenderTarget.Unisex);
  const [notes, setNotes] = useState('');

  const mutate = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof api.departments.uniforms.assignSchedule>[1] = {
        outfitId,
        serviceDate,
        genderTarget: gender,
      };
      if (notes.trim()) payload.notes = notes.trim();
      return (await api.departments.uniforms.assignSchedule(branchDeptId, payload)).data!;
    },
    onSuccess: onDone,
    onError: (e) =>
      alert.info('Could not assign', e instanceof Error ? e.message : 'Please try again.'),
  });

  return (
    <SheetShell open title="Assign outfit to service" onClose={onClose}>
      {outfits.length === 0 ? (
        <Text style={styles.emptyLine}>
          Add an outfit first from the Outfits tab.
        </Text>
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <Text style={styles.label}>Outfit</Text>
            <View style={{ gap: 4 }}>
              {outfits.map((o) => {
                const active = o.id === outfitId;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setOutfitId(o.id)}
                    style={[styles.outfitRow, active && styles.outfitRowActive]}
                  >
                    <Text style={styles.outfitRowName}>{o.name}</Text>
                    <Text style={styles.metaFaded}>{o.genderTarget}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <DatePicker
            label="Service date"
            value={serviceDate}
            onChange={setServiceDate}
          />
          <View style={{ gap: 4 }}>
            <Text style={styles.label}>Applies to</Text>
            <View style={styles.chipRow}>
              {Object.values(UniformGenderTarget).map((g) => {
                const active = g === gender;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={styles.label}>Notes (optional)</Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              containerStyle={{ minHeight: 60 }}
            />
          </View>
          <Button
            label={mutate.isPending ? 'Assigning…' : 'Assign'}
            size="lg"
            fullWidth
            loading={mutate.isPending}
            onPress={() => {
              if (!outfitId) return;
              mutate.mutate();
            }}
          />
        </>
      )}
    </SheetShell>
  );
}

function SheetShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{title}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 480 }}
            >
              <View style={{ gap: spacing.md }}>{children}</View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
    headerTitle: { ...typography.cardTitle, color: c.ink, flex: 1, textAlign: 'center' },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
      paddingBottom: spacing.sm,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    tabLabel: { ...typography.body, color: c.inkMuted, fontWeight: '600' },
    tabLabelActive: { color: c.primary, fontWeight: '700' },
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    contextLine: { ...typography.meta, color: c.inkMuted },
    emptyLine: { ...typography.body, color: c.inkMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { ...typography.body, color: c.ink, fontWeight: '700', flex: 1 },
    meta: { ...typography.meta, color: c.inkMuted },
    metaFaded: { ...typography.meta, color: c.inkFaded },
    thumb: {
      width: 60,
      height: 60,
      borderRadius: radii.md,
      backgroundColor: c.subtle,
    },
    thumbFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...typography.eyebrow, color: c.ink, opacity: 0.6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: 'rgba(93,63,211,0.1)',
      borderColor: c.primary,
    },
    chipLabel: { ...typography.meta, color: c.inkMuted, fontWeight: '600' },
    chipLabelActive: { color: c.primary, fontWeight: '700' },
    outfitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    outfitRowActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(93,63,211,0.06)',
    },
    outfitRowName: { ...typography.body, color: c.ink, fontWeight: '600' },
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
    uploadRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    uploadPreview: { position: 'relative' },
    uploadThumb: {
      width: 84,
      height: 84,
      borderRadius: radii.md,
      backgroundColor: c.subtle,
    },
    uploadThumbFallback: { alignItems: 'center', justifyContent: 'center' },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: 'rgba(93,63,211,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(93,63,211,0.2)',
    },
    uploadBtnLabel: { ...typography.meta, color: c.primary, fontWeight: '700' },
  });
}
