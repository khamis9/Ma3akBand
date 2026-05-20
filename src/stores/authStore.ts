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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    try {
      console.log('🔐 Initializing auth...');
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('✓ Auth initialized, session:', sessionData.session ? 'found' : 'empty');
      set({ session: sessionData.session });

      supabase.auth.onAuthStateChange((_event, newSession) => {
        console.log('🔄 Auth state changed:', _event);
        set({ session: newSession });
      });
    } catch (err) {
      console.error('❌ Initialize auth error:', err);
      throw err; // Re-throw so root layout knows initialization failed
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        set({ error: error.message });
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
