import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '❌ MISSING');
  console.error('EXPO_PUBLIC_SUPABASE_KEY:', supabaseAnonKey ? '✓' : '❌ MISSING');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key', {
  auth: {
    storage: {
      getItem: async (key: string) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch (err) {
          console.error('SecureStore getItem error:', err);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          return await SecureStore.setItemAsync(key, value);
        } catch (err) {
          console.error('SecureStore setItem error:', err);
        }
      },
      removeItem: async (key: string) => {
        try {
          return await SecureStore.deleteItemAsync(key);
        } catch (err) {
          console.error('SecureStore removeItem error:', err);
        }
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
