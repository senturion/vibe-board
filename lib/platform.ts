import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

export function getPlatform(): Platform {
  if (typeof window === 'undefined') return 'web';

  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as 'ios' | 'android';
  }

  return 'web';
}

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}
