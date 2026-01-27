import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.vibeboard.ios',
  appName: 'Vibe Board',
  webDir: 'out',
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    Haptics: {},
  },
};

export default config;
