import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  CheckCircle2,
} from 'lucide-react-native';
import {
  Button,
  Card,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import type { CreateFellowshipMeetingRequest, FellowshipMeeting } from '@kairos/types';
import { api } from '@/lib/api-client';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatMeetingDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function RollcallFellowship() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ fellowshipId: string }>();
  const fellowshipId = params.fellowshipId!;

  const fellowship = useQuery({
    queryKey: ['fellowships', fellowshipId],
    enabled: !!fellowshipId,
    queryFn: async () => (await api.fellowships.get(fellowshipId)).data ?? null,
  });

  const meetings = useQuery({
    queryKey: ['fellowships', fellowshipId, 'meetings'],
    enabled: !!fellowshipId,
    queryFn: async () => (await api.fellowships.meetings.list(fellowshipId)).data ?? [],
  });

  const createMeeting = useMutation({
    mutationFn: async (data: CreateFellowshipMeetingRequest) =>
      (await api.fellowships.meetings.create(fellowshipId, data)).data!,
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['fellowships', fellowshipId, 'meetings'] });
      router.push(`/rollcall/${fellowshipId}/${m.id}`);
    },
  });

  const rows = (meetings.data ?? []) as FellowshipMeeting[];
  const now = new Date();
  const upcoming = rows
    .filter((m) => new Date(m.meetingDate) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
  const past = rows
    .filter((m) => new Date(m.meetingDate) < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());

  const [creating, setCreating] = useState(false);

  function handleQuickCreate() {
    setCreating(true);
    createMeeting.mutate(
      { meetingDate: toISODate(new Date()) },
      {
        onError: (err) => {
          alert.info(
            'Could not start meeting',
            err instanceof Error ? err.message : 'Please try again in a moment.',
          );
        },
        onSettled: () => setCreating(false),
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {fellowship.data?.fellowshipName ?? 'Fellowship attendance'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={meetings.isFetching || fellowship.isFetching}
            onRefresh={() => {
              meetings.refetch();
              fellowship.refetch();
            }}
            tintColor={c.primary}
          />
        }
      >
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Meetings</Text>
          {fellowship.data?.branchName ? (
            <Text style={styles.introMeta}>{fellowship.data.branchName}</Text>
          ) : null}
        </View>

        <Button
          label={creating ? 'Starting…' : "Start today's meeting"}
          variant="primary"
          size="md"
          fullWidth
          loading={creating}
          iconLeft={<Plus color="#ffffff" size={16} strokeWidth={2} />}
          onPress={handleQuickCreate}
        />

        {meetings.isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
        ) : null}

        {upcoming.length > 0 ? (
          <View>
            <Text style={styles.sectionEyebrow}>UPCOMING</Text>
            <View style={styles.list}>
              {upcoming.map((m) => (
                <MeetingRow
                  key={m.id}
                  meeting={m}
                  onPress={() => router.push(`/rollcall/${fellowshipId}/${m.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {past.length > 0 ? (
          <View>
            <Text style={styles.sectionEyebrow}>RECENT</Text>
            <View style={styles.list}>
              {past.slice(0, 8).map((m) => (
                <MeetingRow
                  key={m.id}
                  meeting={m}
                  onPress={() => router.push(`/rollcall/${fellowshipId}/${m.id}`)}
                  muted
                />
              ))}
            </View>
          </View>
        ) : null}

        {!meetings.isLoading && rows.length === 0 ? (
          <Card padding="md" style={styles.emptyCard}>
            <View style={styles.emptyIconTile}>
              <Calendar color={c.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No meetings yet</Text>
            <Text style={styles.emptyMeta}>
              Tap &quot;Start today&apos;s meeting&quot; above to create the first one and take
              rollcall.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MeetingRow({
  meeting,
  onPress,
  muted,
}: {
  meeting: FellowshipMeeting;
  onPress: () => void;
  muted?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.rowCard}>
        <View
          style={[
            styles.rowIconTile,
            muted ? styles.rowIconTileMuted : null,
          ]}
        >
          {muted ? (
            <CheckCircle2 color={c.inkFaded} size={18} strokeWidth={1.5} />
          ) : (
            <Calendar color={c.primary} size={18} strokeWidth={1.5} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {meeting.meetingTitle ?? formatMeetingDate(meeting.meetingDate)}
          </Text>
          {meeting.meetingTitle ? (
            <Text style={styles.rowMeta}>{formatMeetingDate(meeting.meetingDate)}</Text>
          ) : null}
          {meeting.location ? (
            <Text style={styles.rowMeta} numberOfLines={1}>
              {meeting.location}
            </Text>
          ) : null}
        </View>
        <ChevronRight color={c.inkVeryFaded} size={18} strokeWidth={1.5} />
      </Card>
    </Pressable>
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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introBlock: { gap: 2 },
  introTitle: { ...typography.screenTitle, color: c.ink },
  introMeta: { ...typography.meta, color: c.inkMuted },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: c.inkMuted,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
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
  rowIconTileMuted: {
    backgroundColor: c.divider,
  },
  rowTitle: { ...typography.body, color: c.ink, fontWeight: '600' },
  rowMeta: { ...typography.meta, color: c.inkMuted },
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
  emptyTitle: { ...typography.cardTitle, color: c.ink },
  emptyMeta: {
    ...typography.body,
    color: c.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
}

