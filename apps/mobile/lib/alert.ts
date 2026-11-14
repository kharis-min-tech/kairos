import { create } from 'zustand';

export interface AlertButton {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'destructive' | 'cancel';
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertState {
  current: AlertConfig | null;
  show: (cfg: AlertConfig) => void;
  hide: () => void;
}

// Global alert store. Any component can call `alert.show({...})` to raise a
// design-system-themed modal — replaces React Native's stock `Alert.alert`,
// which uses each platform's native chrome (grey Android dialogs on our app).
// One <AlertHost /> mounted at the root reads this store and renders.
export const useAlertStore = create<AlertState>((set) => ({
  current: null,
  show: (cfg) => set({ current: cfg }),
  hide: () => set({ current: null }),
}));

export const alert = {
  show: (cfg: AlertConfig) => useAlertStore.getState().show(cfg),
  hide: () => useAlertStore.getState().hide(),
  /**
   * Info-only convenience: one OK button, no callback.
   */
  info: (title: string, message?: string) =>
    useAlertStore.getState().show({
      title,
      message,
      buttons: [{ label: 'OK', variant: 'primary' }],
    }),
  /**
   * Two-button confirm. Resolves true when confirm is tapped, false on cancel
   * or backdrop dismiss.
   */
  confirm: (opts: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }): Promise<boolean> =>
    new Promise((resolve) => {
      useAlertStore.getState().show({
        title: opts.title,
        message: opts.message,
        buttons: [
          {
            label: opts.cancelLabel ?? 'Cancel',
            variant: 'cancel',
            onPress: () => resolve(false),
          },
          {
            label: opts.confirmLabel ?? 'Confirm',
            variant: opts.destructive ? 'destructive' : 'primary',
            onPress: () => resolve(true),
          },
        ],
      });
    }),
};
