import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X as XIcon } from 'lucide-react-native';
import {
  spacing,
  typography,
  radii,
  useThemedStyles,
  type ThemeColors,
  useColors,
} from '@kairos/ui-native';

/**
 * Reusable QR scanner sheet. Handles permission gating, per-scan debounce,
 * and standardised cancel. The caller is responsible for parsing + validating
 * the raw payload. Two shapes we currently support:
 *   - `kairos://member/{memberId}`       — admin scanner reads a member ID
 *   - `kairos://check-in/{sid}/{token}`  — member scanner reads a QR token
 *
 * onScan contract: return `true` (or a Promise resolving to `true`) to signal
 * a valid payload — the parent typically closes the modal in response. Return
 * `false` for anything the parent doesn't recognise; the scanner stays open,
 * flashes a brief "Not recognised" hint, and resumes scanning. This matches
 * the industry norm (WhatsApp, banking QR pay flows, etc.) where the scanner
 * doesn't quit on random QR codes in the frame.
 */
export function QrScannerModal({
  visible,
  onClose,
  onScan,
  title,
  hint,
  rejectionMessage = 'Not a Kairos code. Keep scanning',
}: {
  visible: boolean;
  onClose: () => void;
  onScan: (payload: string) => boolean | Promise<boolean>;
  title: string;
  hint?: string;
  /** Toast shown briefly when a scanned QR is rejected. Defaults to a
   *  generic "keep scanning" nudge. */
  rejectionMessage?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  // Short-lived per-payload lock so a stable QR in view doesn't fire onScan
  // dozens of times per second. Cleared on rejection so scanning resumes.
  const decodedRef = useRef(false);
  const [decoding, setDecoding] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const rejectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset all local state every time the sheet re-opens.
  useEffect(() => {
    if (visible) {
      decodedRef.current = false;
      setDecoding(false);
      setRejection(null);
      if (rejectionTimerRef.current) {
        clearTimeout(rejectionTimerRef.current);
        rejectionTimerRef.current = null;
      }
    }
  }, [visible]);

  // Unmount cleanup for the toast timer.
  useEffect(
    () => () => {
      if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const showRejectionFlash = useCallback(() => {
    setRejection(rejectionMessage);
    if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
    rejectionTimerRef.current = setTimeout(() => {
      setRejection(null);
      rejectionTimerRef.current = null;
    }, 2200);
  }, [rejectionMessage]);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (decodedRef.current) return;
      decodedRef.current = true;
      setDecoding(true);
      Promise.resolve(onScan(data))
        .then((accepted) => {
          if (accepted) {
            // Parent will close via `visible` prop; leave the lock set so we
            // don't fire again in the tail of the close animation.
            return;
          }
          // Rejected — keep the scanner open. Wait a beat before releasing the
          // lock so the same in-frame QR doesn't immediately re-fire onScan
          // (which would spam the toast).
          setDecoding(false);
          showRejectionFlash();
          setTimeout(() => {
            decodedRef.current = false;
          }, 1500);
        })
        .catch(() => {
          // Same debounce on unexpected errors — treat as reject to keep the
          // scanner alive rather than trapping the user.
          setDecoding(false);
          showRejectionFlash();
          setTimeout(() => {
            decodedRef.current = false;
          }, 1500);
        });
    },
    [onScan, showRejectionFlash],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <XIcon color={c.ink} size={20} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {!permission ? (
            <ActivityIndicator color={c.primary} />
          ) : !permission.granted ? (
            <View style={styles.permissionBlock}>
              <Text style={styles.permissionTitle}>Camera permission needed</Text>
              <Text style={styles.permissionMeta}>
                {permission.canAskAgain
                  ? 'Tap allow so we can scan the QR code.'
                  : `Enable camera access for Kairos in ${Platform.OS === 'ios' ? 'Settings' : 'App info'} to scan.`}
              </Text>
              {permission.canAskAgain ? (
                <Pressable style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnLabel}>Allow camera</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={decoding ? undefined : handleBarcode}
              />
              {/* Framing corners for the user */}
              <View pointerEvents="none" style={styles.frame} />
              {decoding ? (
                <View style={styles.decodingPill}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.decodingLabel}>Reading…</Text>
                </View>
              ) : rejection ? (
                <View style={styles.rejectionPill}>
                  <Text style={styles.rejectionLabel}>{rejection}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    title: { ...typography.cardTitle, color: c.ink },
    hint: { ...typography.meta, color: c.inkMuted, marginTop: 2 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    body: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
    permissionBlock: {
      padding: spacing.xl,
      gap: spacing.sm,
      alignItems: 'center',
    },
    permissionTitle: { ...typography.cardTitle, color: c.ink, textAlign: 'center' },
    permissionMeta: {
      ...typography.body,
      color: c.inkMuted,
      textAlign: 'center',
    },
    permissionBtn: {
      marginTop: spacing.sm,
      backgroundColor: '#5D3FD3',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
    },
    permissionBtnLabel: {
      color: '#ffffff',
      fontWeight: '600',
    },
    cameraWrap: {
      flex: 1,
      position: 'relative',
      backgroundColor: '#000000',
      overflow: 'hidden',
    },
    frame: {
      position: 'absolute',
      alignSelf: 'center',
      top: '25%',
      width: 260,
      height: 260,
      borderRadius: radii.lg,
      borderColor: 'rgba(255,255,255,0.85)',
      borderWidth: 2,
    },
    decodingPill: {
      position: 'absolute',
      bottom: spacing.xl,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    decodingLabel: { color: '#ffffff', fontWeight: '600' },
    rejectionPill: {
      position: 'absolute',
      bottom: spacing.xl,
      alignSelf: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(225,29,72,0.85)',
    },
    rejectionLabel: { color: '#ffffff', fontWeight: '600' },
  });
}
