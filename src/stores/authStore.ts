import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  ensureUserProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const toUser = (row: any, fallbackEmail = ''): User => ({
  id: row.id,
  email: row.email || fallbackEmail,
  username: row.username,
  bandName: row.band_name,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      set({ session: sessionData.session });
      await get().ensureUserProfile();

      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        set({ session: newSession });
        await get().ensureUserProfile();
      });
    } catch (err) {
      console.error('Initialize auth error:', err);
      throw err;
    }
  },

  ensureUserProfile: async () => {
    const currentSession = get().session;
    const authUser = currentSession?.user;

    if (!authUser) {
      set({ user: null });
      return;
    }

    const email = authUser.email || '';
    const username =
      authUser.user_metadata?.username ||
      authUser.user_metadata?.name ||
      email.split('@')[0] ||
      null;

    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(
          {
            id: authUser.id,
            email,
            username,
          },
          { onConflict: 'id' }
        )
        .select('id,email,username,band_name')
        .single();

      if (error) {
        console.warn('Profile sync warning:', error.message);
        set({
          user: {
            id: authUser.id,
            email,
            username,
            bandName: 'Ma3akBand',
          },
        });
        return;
      }

      set({ user: toUser(data, email) });
    } catch (err) {
      console.warn('Profile sync warning:', err);
      set({
        user: {
          id: authUser.id,
          email,
          username,
          bandName: 'Ma3akBand',
        },
      });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        set({ error: error.message });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign in failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email.split('@')[0],
          },
        },
      });
      if (error) {
        set({ error: error.message });
      } else if (data.session) {
        set({ session: data.session });
        await get().ensureUserProfile();
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign up failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
