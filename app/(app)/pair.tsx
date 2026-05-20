import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { C } from '../../src/constants/colors';
import useBLE from '../../src/hooks/useBLE';

export default function PairScreen() {
  const { session } = useAuthStore();
  const [joinCode, setJoinCode] = useState('');
  const [paired, setPaired] = useState(false);
  const [pairError, setPairError] = useState('');
  const [loading, setLoading] = useState(false);

  const { isScanning, isConnected, startScan, disconnect, error: bleError } = useBLE();
  const [bandName, setBandName] = useState('Ma3akBand');
  const [showBandNaming, setShowBandNaming] = useState(false);
  const [savingBandName, setSavingBandName] = useState(false);

  const myCode = useMemo(
    () => Math.random().toString(36).substring(2, 8).toUpperCase(),
    []
  );

  const handleJoinPair = async () => {
    if (!joinCode.trim()) {
      setPairError('Please enter a code');
      return;
    }

    setPairError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('pairs')
        .select()
        .eq('invite_code', joinCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        setPairError('Code not found. Check with your partner.');
      } else {
        setPaired(true);
      }
    } catch (err) {
      setPairError('Code not found. Check with your partner.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBandName = async () => {
    setSavingBandName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ band_name: bandName })
        .eq('id', session?.user?.id);

      if (!error) {
        setShowBandNaming(false);
      }
    } catch (err) {
      console.error('Error saving band name:', err);
    } finally {
      setSavingBandName(false);
    }
  };

  const handleConnectBand = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await startScan();
      setShowBandNaming(true);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: C.text, marginBottom: 4 }}>
          Pair Bracelets
        </Text>
        <Text style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
          Connect with your support partner
        </Text>

        {/* Success Banner */}
        {paired && (
          <View
            style={{
              backgroundColor: C.success + '22',
              borderColor: C.success,
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color={C.success} style={{ marginRight: 12 }} />
            <Text style={{ color: C.success, fontWeight: 'bold', flex: 1 }}>
              ✅ Paired successfully!
            </Text>
          </View>
        )}

        {/* Card 1: Your Code */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              color: C.accent,
              fontSize: 11,
              fontWeight: 'bold',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Your Invite Code
          </Text>

          <View
            style={{
              backgroundColor: C.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 30,
                fontWeight: 'bold',
                color: C.accent,
                textAlign: 'center',
                letterSpacing: 8,
              }}
            >
              {myCode}
            </Text>
          </View>

          <Text
            style={{
              color: C.muted,
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            Share this with your partner
          </Text>
        </View>

        {/* Card 2: Join a Pair */}
        <View>
          <Text
            style={{
              color: C.accent,
              fontSize: 11,
              fontWeight: 'bold',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Join With Code
          </Text>

          <TextInput
            placeholder="Enter code"
            placeholderTextColor={C.muted}
            value={joinCode}
            onChangeText={(text) => {
              setJoinCode(text);
              setPairError('');
            }}
            autoCapitalize="characters"
            maxLength={8}
            style={{
              backgroundColor: C.card,
              color: C.text,
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              fontSize: 18,
              letterSpacing: 2,
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          />

          {pairError && (
            <Text
              style={{
                color: C.danger,
                marginBottom: 12,
                textAlign: 'center',
                fontSize: 14,
              }}
            >
              {pairError}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleJoinPair}
            disabled={loading || !joinCode.trim()}
            style={{
              backgroundColor: C.accent,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              opacity: loading || !joinCode.trim() ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.bg} />
            ) : (
              <Text
                style={{
                  color: C.bg,
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                Join Pair
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Card 3: Connect Band */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              color: C.accent,
              fontSize: 11,
              fontWeight: 'bold',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Connect Band
          </Text>

          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: isConnected ? C.success : C.muted,
                  marginRight: 12,
                }}
              />
              <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14 }}>
                {isConnected ? 'Band Connected' : 'Band Disconnected'}
              </Text>
            </View>

            {isScanning && (
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
                Scanning for Ma3akBand...
              </Text>
            )}

            {bleError && (
              <Text style={{ color: C.danger, fontSize: 12, marginBottom: 12 }}>
                {bleError}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleConnectBand}
            disabled={isScanning}
            style={{
              backgroundColor: isConnected ? C.danger : C.accent,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              opacity: isScanning ? 0.6 : 1,
            }}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={C.bg} />
            ) : (
              <Text
                style={{
                  color: C.bg,
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                {isConnected ? 'Disconnect Band' : 'Connect Band'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Band Naming Modal */}
        {showBandNaming && (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              padding: 20,
              marginTop: 24,
              borderColor: C.accent,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
              Name Your Band
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
              Give your wearable a custom name (optional)
            </Text>

            <TextInput
              placeholder="Ma3akBand"
              placeholderTextColor={C.muted}
              value={bandName}
              onChangeText={setBandName}
              style={{
                backgroundColor: C.primary,
                color: C.text,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                fontSize: 14,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowBandNaming(false)}
                style={{
                  flex: 1,
                  backgroundColor: C.muted,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: C.bg, fontWeight: 'bold' }}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveBandName}
                disabled={savingBandName}
                style={{
                  flex: 1,
                  backgroundColor: C.accent,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                  opacity: savingBandName ? 0.6 : 1,
                }}
              >
                {savingBandName ? (
                  <ActivityIndicator size="small" color={C.bg} />
                ) : (
                  <Text style={{ color: C.bg, fontWeight: 'bold' }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
