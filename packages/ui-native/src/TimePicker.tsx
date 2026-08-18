import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Clock, ChevronDown } from 'lucide-react-native';
import { radii, spacing, typography } from './tokens';
import { useColors, useThemedStyles, type ThemeColors } from './theme';

interface TimePickerProps {
  /** `HH:MM` or `HH:MM:SS` string (or empty). Component returns `HH:MM`. */
  value: string;
  onChange: (hhmm: string) => void;
  label?: string;
  placeholder?: string;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  disabled?: boolean;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Native time picker — same shape as DatePicker. Value contract is `HH:MM`
 * 24-hour so it round-trips cleanly to Postgres `time` and the DTOs the
 * server expects.
 */
export function TimePicker({
  value,
  onChange,
  label,
  placeholder = 'Select a time',
  minuteInterval = 5,
  disabled = false,
  error,
  containerStyle,
}: TimePickerProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [open, setOpen] = useState(false);

  const currentDate = useMemo(() => {
    const now = new Date();
    if (value && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
      const [h, m] = value.split(':').map(Number);
      now.setHours(h!, m!, 0, 0);
    } else {
      now.setMinutes(0, 0, 0);
    }
    return now;
  }, [value]);

  const displayLabel = value ? formatDisplay(value) : placeholder;

  function handleChange(event: DateTimePickerEvent, next?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type !== 'set' || !next) return;
    }
    if (!next) return;
    onChange(toHhMm(next));
  }

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => (disabled ? undefined : setOpen(true))}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} — ${displayLabel}` : displayLabel}
        style={[
          styles.field,
          disabled && styles.fieldDisabled,
          error ? styles.fieldError : null,
        ]}
      >
        <Clock
          color={value ? c.primary : c.inkFaded}
          size={16}
          strokeWidth={1.5}
        />
        <Text
          style={value ? styles.valueText : styles.placeholderText}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <ChevronDown color={c.inkFaded} size={14} strokeWidth={1.5} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open ? (
        Platform.OS === 'ios' ? (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setOpen(false)}
          >
            <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
              <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                <View style={styles.sheetHandle} />
                <DateTimePicker
                  value={currentDate}
                  mode="time"
                  display="spinner"
                  onChange={handleChange}
                  minuteInterval={minuteInterval}
                  themeVariant="light"
                />
                <Pressable style={styles.doneButton} onPress={() => setOpen(false)}>
                  <Text style={styles.doneLabel}>Done</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={currentDate}
            mode="time"
            is24Hour
            display="default"
            onChange={handleChange}
            minuteInterval={minuteInterval}
          />
        )
      ) : null}
    </View>
  );
}

function toHhMm(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    label: {
      ...typography.eyebrow,
      color: c.ink,
      opacity: 0.6,
      marginBottom: spacing.xs,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
    },
    fieldDisabled: { backgroundColor: c.subtle, opacity: 0.7 },
    fieldError: { borderColor: c.danger, borderWidth: 1.5 },
    valueText: {
      flex: 1,
      ...typography.body,
      color: c.ink,
    },
    placeholderText: {
      flex: 1,
      ...typography.body,
      color: c.inkFaded,
    },
    errorText: {
      ...typography.meta,
      color: c.danger,
      marginTop: spacing.xs,
    },
    backdrop: {
      flex: 1,
      backgroundColor: c.scrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      alignItems: 'stretch',
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.inkGhost,
    },
    doneButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    doneLabel: {
      ...typography.button,
      color: c.primary,
    },
  });
}
