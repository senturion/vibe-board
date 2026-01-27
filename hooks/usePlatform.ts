'use client';

import { useState, useEffect } from 'react';
import { getPlatform, isNative, Platform } from '@/lib/platform';

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('web');
  const [native, setNative] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
    setNative(isNative());
    setReady(true);
  }, []);

  return {
    platform,
    isNative: native,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    ready,
  };
}
