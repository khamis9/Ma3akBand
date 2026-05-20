import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../../src/constants/colors';
import { useSupabaseSync } from '../../src/hooks/useSupabaseSync';

export default function AppLayout() {
  useSupabaseSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pair"
        options={{
          title: 'Pair',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="link-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
