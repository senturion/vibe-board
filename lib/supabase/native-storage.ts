import { Preferences } from '@capacitor/preferences';

/**
 * Storage adapter for Supabase auth in Capacitor native apps.
 * Uses @capacitor/preferences for secure, persistent storage.
 */
export const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    await Preferences.remove({ key });
  },
};
