import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/stores/authStore';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, initialize } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize()
      .then(() => setInitialized(true))
      .catch((err) => {
        console.error('❌ FATAL: Root layout initialization failed:', err);
        setError(err instanceof Error ? err.message : String(err));
        setInitialized(true); // Mark as done so we show error screen
      });
  }, []);

  useEffect(() => {
    if (!initialized || isLoading) return;
    if (error) return; // Don't navigate if there's an error

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)/dashboard');
    }
  }, [session, initialized, isLoading, segments, error]);

  // Error screen
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F1A', padding: 16 }}>
        <ScrollView contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
          <Text style={{ color: '#DC2626', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
            ❌ App Initialization Error
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14, marginBottom: 8, fontFamily: 'monospace' }}>
            {error}
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 20 }}>
            Check that your Supabase credentials are correct in the environment variables.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // Loading screen
  if (!initialized || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={{ color: '#A78BFA', marginTop: 12 }}>Initializing...</Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}
