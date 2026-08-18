import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import {
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { useAlertStore, type AlertButton } from '@/lib/alert';

export function AlertHost() {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const current = useAlertStore((s) => s.current);
  const hide = useAlertStore((s) => s.hide);
  const open = !!current;

  const buttons = current?.buttons ?? [{ label: 'OK', variant: 'primary' as const }];

  const runAction = async (btn: AlertButton) => {
    hide();
    try {
      await btn.onPress?.();
    } catch {
      // Callers own their errors — swallow here so a thrown handler doesn't
      // leak into an unhandled rejection.
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={open}
      onRequestClose={() => {
        // Android back button — treat as cancel/dismiss.
        const cancel = buttons.find((b) => b.variant === 'cancel');
        if (cancel) void runAction(cancel);
        else hide();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{current?.title}</Text>
          {current?.message ? (
            <Text style={styles.message}>{current.message}</Text>
          ) : null}
          <View
            style={[
              styles.buttonRow,
              buttons.length > 2 && styles.buttonColumn,
            ]}
          >
            {buttons.map((btn, i) => {
              const isDestructive = btn.variant === 'destructive';
              const isCancel = btn.variant === 'cancel';
              const isPrimary = !isDestructive && !isCancel;
              return (
                <Pressable
                  key={`${btn.label}-${i}`}
                  onPress={() => void runAction(btn)}
                  style={[
                    styles.button,
                    isPrimary && styles.buttonPrimary,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonCancel,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonLabel,
                      isPrimary && styles.buttonLabelPrimary,
                      isDestructive && styles.buttonLabelDestructive,
                      isCancel && styles.buttonLabelCancel,
                    ]}
                  >
                    {btn.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.cardTitle,
    color: c.ink,
  },
  message: {
    ...typography.body,
    color: 'rgba(26,28,28,0.7)',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  buttonColumn: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minWidth: 88,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: c.primary,
  },
  buttonDestructive: {
    backgroundColor: c.danger,
  },
  buttonCancel: {
    backgroundColor: c.subtle,
  },
  buttonLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  buttonLabelPrimary: { color: '#ffffff' },
  buttonLabelDestructive: { color: '#ffffff' },
  buttonLabelCancel: { color: c.ink },
});
}

