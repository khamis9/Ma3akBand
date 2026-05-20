import { SafeAreaView, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSensorStore } from '../../src/stores/sensorStore';
import { C } from '../../src/constants/colors';

export default function AlertsScreen() {
  const { lastAnomaly, recentAlerts, clearAnomaly } = useSensorStore();

  const getAlertIcon = (type: string) => {
    if (type === 'heart' || type === 'high_hr') return 'heart';
    if (type === 'flash' || type === 'low_gsr') return 'flash';
    if (type === 'body' || type === 'no_motion') return 'body';
    return 'alert-circle';
  };

  const getAlertTypeLabel = (type: string) => {
    if (type === 'high_hr') return 'High Heart Rate';
    if (type === 'low_gsr') return 'Elevated Stress';
    if (type === 'no_motion') return 'No Motion Detected';
    return type;
  };

  const formatAlertTime = (timestamp: string) => {
    const alertTime = new Date(timestamp).getTime();
    const diffMs = Date.now() - alertTime;
    const diffMin = Math.max(0, Math.round(diffMs / 60000));

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    return `${Math.round(diffMin / 60)} hr ago`;
  };

  const AlertCard = ({ type, time, severity, icon }: any) => {
    let severityColor = C.muted;
    if (severity === 'high') severityColor = C.danger;
    if (severity === 'medium') severityColor = C.warning;

    return (
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={icon}
          size={24}
          color={severityColor}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: 'bold', fontSize: 14 }}>
            {type}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            {time}
          </Text>
        </View>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: severityColor,
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: C.text, marginBottom: 4 }}>
          Alerts
        </Text>
        <Text style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
          Partner activity notifications
        </Text>

        {/* Live Alert */}
        {lastAnomaly && (
          <View
            style={{
              backgroundColor: C.danger + '22',
              borderColor: C.danger,
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name={getAlertIcon(lastAnomaly.type)}
              size={24}
              color={C.danger}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.danger, fontWeight: 'bold', fontSize: 14 }}>
                {getAlertTypeLabel(lastAnomaly.type)}
              </Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                Just now
              </Text>
            </View>
            <TouchableOpacity onPress={clearAnomaly}>
              <Ionicons name="close" size={20} color={C.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Activity Section */}
        <Text
          style={{
            color: C.muted,
            fontSize: 12,
            fontWeight: 'bold',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Recent Activity
        </Text>

        {recentAlerts.length === 0 ? (
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>
              No recent alerts
            </Text>
          </View>
        ) : (
          recentAlerts.map((alert, index) => (
            <AlertCard
              key={alert.id || `${alert.timestamp}-${index}`}
              type={getAlertTypeLabel(alert.type)}
              time={formatAlertTime(alert.timestamp)}
              severity={alert.severity}
              icon={getAlertIcon(alert.type)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
