import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, KeyRound } from 'lucide-react-native';
import {
  Button,
  Card,
  Input,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';
import { api } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

export default function ChangePassword() {  const { t } = useTranslation(['security', 'common']);

  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.auth.changePassword(data),
  });

  function clearError(key: string) {
    setErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!currentPassword) next['currentPassword'] = 'Enter your current password';
    if (!newPassword) next['newPassword'] = 'Choose a new password';
    else if (newPassword.length < 8)
      next['newPassword'] = 'At least 8 characters';
    if (newPassword && newPassword === currentPassword)
      next['newPassword'] = 'New password must differ from current';
    if (confirmPassword !== newPassword)
      next['confirmPassword'] = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    setServerError(null);
    if (!validate()) return;
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      alert.show({
        title: t('security:passwordChanged'),
        message: t('security:yourPasswordHasBeenUpdated'),
        buttons: [
          { label: 'OK', variant: 'primary', onPress: () => router.back() },
        ],
      });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : t('security:couldNotChangePasswordPleaseTry'),
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft color={c.ink} size={24} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('security:changePassword')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.introRow}>
            <View style={styles.introIcon}>
              <KeyRound color={c.primary} size={22} strokeWidth={1.5} />
            </View>
            <Text style={styles.introText}>{t('security:youllStaySignedInOnThis')}</Text>
          </View>

          <Card padding="md" style={{ gap: spacing.md }}>
            <Text style={styles.fieldLabel}>{t('security:currentPassword')}</Text>
            <Input
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                clearError('currentPassword');
              }}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              error={errors['currentPassword']}
            />

            <Text style={styles.fieldLabel}>{t('security:newPassword')}</Text>
            <Input
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                clearError('newPassword');
                clearError('confirmPassword');
              }}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              placeholder={t('security:atLeastCharacters')}
              error={errors['newPassword']}
            />

            <Text style={styles.fieldLabel}>{t('security:confirmNewPassword')}</Text>
            <Input
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                clearError('confirmPassword');
              }}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              error={errors['confirmPassword']}
            />
          </Card>

          {serverError ? <Text style={styles.errorLine}>{serverError}</Text> : null}

          <Button
            label={change.isPending ? t('auth:saving') : t('auth:changePassword')}
            variant="primary"
            size="lg"
            fullWidth
            loading={change.isPending}
            onPress={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  headerTitle: { ...typography.cardTitle, color: c.ink },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(93,63,211,0.06)',
    padding: spacing.md,
    borderRadius: radii.md,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(93,63,211,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    ...typography.meta,
    color: c.ink,
    flex: 1,
    lineHeight: 16,
  },
  fieldLabel: {
    ...typography.eyebrow,
    color: c.ink,
    opacity: 0.6,
  },
  errorLine: {
    ...typography.body,
    color: c.danger,
  },
});
}

