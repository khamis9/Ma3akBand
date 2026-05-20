import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../src/stores/authStore';
import { C } from '../../src/constants/colors';

export default function SettingsScreen() {
  const { session, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Confirm',
        onPress: async () => {
          await signOut();
        },
        style: 'destructive',
      },
    ]);
  };

  const CardTitle = ({ title }: { title: string }) => (
    <Text
      style={{
        color: C.accent,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
      }}
    >
      {title}
    </Text>
  );

  const SettingRow = ({ icon, iconColor, text }: any) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={iconColor}
        style={{ marginRight: 12 }}
      />
      <Text style={{ color: C.text, fontSize: 14, flex: 1 }}>
        {text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: C.text, marginBottom: 24 }}>
          Settings
        </Text>

        {/* Account Card */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <CardTitle title="Account" />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name="person-circle"
              size={32}
              color={C.accent}
              style={{ marginRight: 12 }}
            />
            <Text style={{ color: C.text, fontSize: 14, flex: 1 }}>
              {session?.user?.email || 'user@example.com'}
            </Text>
          </View>
        </View>

        {/* Notifications Card */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <CardTitle title="Notifications" />
          <SettingRow
            icon="notifications"
            iconColor={C.accent2}
            text="SOS Alerts: Enabled"
          />
          <View style={{ marginBottom: 0 }}>
            <SettingRow
              icon="heart"
              iconColor={C.danger}
              text="Heart Rate Alerts: Enabled"
            />
          </View>
        </View>

        {/* Alert Thresholds Card */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <CardTitle title="Alert Thresholds" />
          <Text style={{ color: C.text, fontSize: 14, marginBottom: 8 }}>
            High BPM: &gt; 120
          </Text>
          <Text style={{ color: C.text, fontSize: 14, marginBottom: 8 }}>
            Low BPM: &lt; 45
          </Text>
          <Text style={{ color: C.text, fontSize: 14 }}>
            Stress GSR: &lt; 1500
          </Text>
        </View>

        {/* About Card */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <CardTitle title="About" />
          <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
            Ma3akBand
          </Text>
          <Text style={{ color: C.muted, fontSize: 14, marginBottom: 2 }}>
            Version 1.0.0
          </Text>
          <Text style={{ color: C.muted, fontSize: 14 }}>
            Final Year Capstone Project
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            backgroundColor: C.danger,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: C.bg,
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
