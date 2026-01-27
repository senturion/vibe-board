import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';

/**
 * Haptic feedback service - provides native haptic feedback on iOS/Android.
 * All methods are no-ops on web, so they can be called unconditionally.
 */
export const haptics = {
  /**
   * Light tap - for selections, toggles, minor interactions
   */
  light: async () => {
    if (!isNative()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Silently fail if haptics unavailable
    }
  },

  /**
   * Medium tap - for drag start, button press, confirmations
   */
  medium: async () => {
    if (!isNative()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Silently fail if haptics unavailable
    }
  },

  /**
   * Heavy tap - for drop actions, major state changes
   */
  heavy: async () => {
    if (!isNative()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Silently fail if haptics unavailable
    }
  },

  /**
   * Success feedback - task completed, goal achieved, habit logged
   */
  success: async () => {
    if (!isNative()) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Silently fail if haptics unavailable
    }
  },

  /**
   * Warning feedback - approaching deadline, streak at risk
   */
  warning: async () => {
    if (!isNative()) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // Silently fail if haptics unavailable
    }
  },

  /**
   * Error feedback - failed action, validation error
   */
  error: async () => {
    if (!isNative()) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Silently fail if haptics unavailable
    }
  },

  /**
   * Selection change - scrolling through picker options
   */
  selection: async () => {
    if (!isNative()) return;
    try {
      await Haptics.selectionChanged();
    } catch {
      // Silently fail if haptics unavailable
    }
  },
};
