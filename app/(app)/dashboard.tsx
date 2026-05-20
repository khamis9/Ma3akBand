import { SafeAreaView, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSensorStore } from '../../src/stores/sensorStore';
import { useAuthStore } from '../../src/stores/authStore';
import { C } from '../../src/constants/colors';
import { getStressLabel, getMotionLabel } from '../../src/constants/thresholds';

export default function DashboardScreen() {
  const {
    myData,
    partnerData,
    lastAnomaly,
    clearAnomaly,
    isConnected,
    isPartnerConnected,
    isPaired,
    partnerName,
  } = useSensorStore();
  const { user } = useAuthStore();

  const myName = user?.username || 'You';
  const theirName = partnerName || 'Partner';

  const MetricBox = ({ icon, label, value, color }: any) => (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name={icon} size={24} color={color} style={{ marginBottom: 8 }} />
      <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>
        {value}
      </Text>
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );

  const StressBadge = ({ gsr }: any) => {
    const label = getStressLabel(gsr);
    let bgColor, textColor;

    if (label === 'Calm') {
      bgColor = C.success;
      textColor = C.bg;
    } else if (label === 'Neutral') {
      bgColor = C.card;
      textColor = C.accent;
    } else if (label === 'Stressed') {
      bgColor = C.card;
      textColor = C.warning;
    } else {
      bgColor = C.card;
      textColor = C.danger;
    }

    return (
      <View
        style={{
          backgroundColor: bgColor,
          borderColor: textColor,
          borderWidth: 1,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignSelf: 'flex-start',
          marginTop: 12,
        }}
      >
        <Text style={{ color: textColor, fontSize: 12, fontWeight: 'bold' }}>
          {label}
        </Text>
      </View>
    );
  };

  const SensorCard = ({ title, data }: any) => (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
        {title}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
        <MetricBox
          icon="heart"
          label="BPM"
          value={data.bpm > 0 ? data.bpm : '--'}
          color={C.danger}
        />
        <MetricBox
          icon="flash"
          label="GSR"
          value={data.gsr > 0 ? data.gsr : '--'}
          color={C.warning}
        />
        <MetricBox
          icon="walk"
          label="Motion"
          value={getMotionLabel(data.az)}
          color={C.accent2}
        />
      </View>

      <StressBadge gsr={data.gsr} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: C.text, marginBottom: 4 }}>
          Ma3akBand
        </Text>
        <Text style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
          Live Health Monitor
        </Text>

        {/* Room Name */}
        {isPaired && (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 14,
              alignSelf: 'flex-start',
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Ionicons name="people" size={14} color={C.accent} />
            <Text style={{ color: C.accent, fontWeight: 'bold', fontSize: 13 }}>
              {myName} & {theirName}
            </Text>
          </View>
        )}

        {/* Anomaly Alert Banner */}
        {lastAnomaly && (
          <View
            style={{
              backgroundColor: C.danger,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="warning" size={20} color={C.bg} style={{ marginRight: 12 }} />
              <Text style={{ color: C.bg, fontWeight: 'bold', flex: 1 }}>
                ⚠️ Your partner may need you right now!
              </Text>
            </View>
            <TouchableOpacity onPress={clearAnomaly}>
              <Ionicons name="close" size={20} color={C.bg} />
            </TouchableOpacity>
          </View>
        )}

        {/* My Data Card */}
        <SensorCard title={myName} data={myData} />

        {/* Partner Data Card */}
        <SensorCard title={theirName} data={partnerData} />

        {/* Connection Status Card */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>
            Connection Status
          </Text>

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
            <Text style={{ color: C.text, fontSize: 14 }}>
              Bracelet {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: isPartnerConnected ? C.success : isPaired ? C.warning : C.muted,
                marginRight: 12,
              }}
            />
            <Text style={{ color: C.text, fontSize: 14 }}>
              Partner {isPartnerConnected ? 'Live' : isPaired ? 'Paired' : 'Not Paired'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
