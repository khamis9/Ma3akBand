import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/stores/authStore';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, initialize } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initialize().then(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!initialized || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)/dashboard');
    }
  }, [session, initialized, isLoading, segments]);

  if (!initialized || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#A78BFA" />
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
