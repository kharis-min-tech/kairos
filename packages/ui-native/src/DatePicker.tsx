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
import { Calendar, ChevronDown } from 'lucide-react-native';
import { radii, spacing, typography } from './tokens';
import { useColors, useTheme, useThemedStyles, type ThemeColors } from './theme';

interface DatePickerProps {
  /** ISO date string `YYYY-MM-DD` (or empty). */
  value: string;
  onChange: (isoDate: string) => void;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Native date picker — Pressable field that opens the OS-native picker on
 * tap. Renders inline on iOS (below the field), modal-sheet on Android.
 * Value contract is ISO `YYYY-MM-DD` — matches server DTOs; the component
 * hides the JS-Date shuffling from callers.
 */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select a date',
  minimumDate,
  maximumDate,
  disabled = false,
  error,
  containerStyle,
}: DatePickerProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const { scheme } = useTheme();
  const [open, setOpen] = useState(false);

  const currentDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y!, m! - 1, d!);
    }
    return new Date();
  }, [value]);

  const displayLabel = value
    ? formatDisplay(value)
    : placeholder;

  function handleChange(event: DateTimePickerEvent, next?: Date) {
    // Android: the picker is a one-shot dialog; iOS keeps it inline.
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type !== 'set' || !next) return;
    }
    if (!next) return;
    const iso = toIso(next);
    onChange(iso);
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
        <Calendar
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
                  mode="date"
                  display="inline"
                  onChange={handleChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  themeVariant={scheme}
                  accentColor={c.primary}
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
            mode="date"
            display="default"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )
      ) : null}
    </View>
  );
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
