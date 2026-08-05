import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { Card, Avatar, colors, spacing, typography, radii } from '@kairos/ui-native';
import { formatShortDate } from '@kairos/core';
import { api } from '@/lib/api-client';

interface Column {
  key: string;
  label: string;
  color: string;
}

const COLUMNS: Column[] = [
  { key: 'new', label: 'New', color: colors.primary },
  { key: 'following_up', label: 'Following up', color: colors.gold },
  { key: 'interested', label: 'Interested', color: colors.info },
  { key: 'converted', label: 'Converted', color: colors.success },
];

export default function FollowUps() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={colors.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Follow-ups</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Souls pipeline</Text>
        <Text style={styles.subMeta}>Swipe columns horizontally.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columnsScroll}
      >
        {COLUMNS.map((col) => (
          <ColumnView key={col.key} column={col} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ColumnView({ column }: { column: Column }) {
  const query = useQuery({
    queryKey: ['souls', column.key],
    queryFn: async () => {
      const res = await api.souls.list({ status: column.key, limit: 20 });
      return res.data?.data ?? [];
    },
  });

  const souls = (query.data ?? []) as {
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string | Date;
  }[];

  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <View style={[styles.columnDot, { backgroundColor: column.color }]} />
        <Text style={styles.columnLabel}>{column.label}</Text>
        <Text style={styles.columnCount}>{souls.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.columnBody}>
        {query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : souls.length === 0 ? (
          <Text style={styles.emptyText}>No souls in this stage.</Text>
        ) : (
          souls.map((s) => (
            <Card key={s.id} padding="md" style={styles.soulCard}>
              <View style={styles.soulRow}>
                <Avatar size="sm" firstName={s.firstName} lastName={s.lastName} />
                <View style={styles.soulText}>
                  <Text style={styles.soulName}>
                    {s.firstName} {s.lastName}
                  </Text>
                  <Text style={styles.soulMeta}>
                    Captured {formatShortDate(s.createdAt as string)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
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
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 2,
  },
  subTitle: { ...typography.screenTitle, color: colors.ink },
  subMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  columnsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  column: {
    width: 240,
    backgroundColor: colors.subtleLight,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,28,28,0.06)',
  },
  columnDot: { width: 8, height: 8, borderRadius: 4 },
  columnLabel: { ...typography.eyebrow, color: colors.ink, flex: 1 },
  columnCount: {
    ...typography.eyebrow,
    color: 'rgba(26,28,28,0.5)',
  },
  columnBody: { gap: spacing.sm, paddingBottom: spacing.md },
  soulCard: {},
  soulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  soulText: { flex: 1, gap: 2 },
  soulName: { ...typography.cardTitle, color: colors.ink, fontSize: 13 },
  soulMeta: { ...typography.meta, color: 'rgba(26,28,28,0.55)' },
  emptyText: {
    ...typography.meta,
    color: 'rgba(26,28,28,0.5)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
