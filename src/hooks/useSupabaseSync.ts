import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useSensorStore } from '../stores/sensorStore';
import { AnomalyAlert, SensorData } from '../types';

const PAIR_SELECT = 'id,invite_code,user1_id,user2_id,created_at,paired_at';
const SENSOR_UPLOAD_INTERVAL_MS = 2000;

const toSensorData = (row: any): SensorData => ({
  userId: row.user_id || '',
  pairId: row.pair_id || '',
  bpm: Number(row.bpm || 0),
  gsr: Number(row.gsr || 0),
  ax: Number(row.ax || 0),
  ay: Number(row.ay || 0),
  az: Number(row.az || 0),
  anomaly: Boolean(row.anomaly),
  recordedAt: row.recorded_at || '',
});

const toAlert = (row: any): AnomalyAlert => ({
  id: row.id,
  pairId: row.pair_id,
  userId: row.user_id || '',
  type: row.type,
  severity: row.severity,
  message: row.message,
  timestamp: row.timestamp || new Date().toISOString(),
});

const isEmptySensorReading = (data: SensorData) =>
  !data.bpm && !data.gsr && !data.ax && !data.ay && !data.az;

export function useSupabaseSync() {
  const session = useAuthStore((state) => state.session);
  const myData = useSensorStore((state) => state.myData);
  const pairId = useSensorStore((state) => state.pairId);
  const partnerId = useSensorStore((state) => state.partnerId);
  const setPair = useSensorStore((state) => state.setPair);
  const resetPair = useSensorStore((state) => state.resetPair);
  const updatePartnerData = useSensorStore((state) => state.updatePartnerData);
  const setPartnerConnected = useSensorStore((state) => state.setPartnerConnected);
  const setPartnerName = useSensorStore((state) => state.setPartnerName);
  const triggerAnomaly = useSensorStore((state) => state.triggerAnomaly);
  const setRecentAlerts = useSensorStore((state) => state.setRecentAlerts);

  const lastUploadAtRef = useRef(0);
  const lastUploadSignatureRef = useRef('');

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      resetPair();
      return;
    }

    let cancelled = false;

    const loadPair = async () => {
      const { data, error } = await supabase
        .from('pairs')
        .select(PAIR_SELECT)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (cancelled) return;

      if (error) {
        console.warn('Pair load warning:', error.message);
        return;
      }

      const selectedPair = data?.find((pair: any) => pair.user2_id) || data?.[0];
      if (!selectedPair) {
        resetPair();
        return;
      }

      const selectedPartnerId =
        selectedPair.user1_id === userId ? selectedPair.user2_id : selectedPair.user1_id;

      setPair({
        pairId: selectedPair.id,
        partnerId: selectedPartnerId || null,
        inviteCode: selectedPair.invite_code,
        isPaired: Boolean(selectedPair.user2_id),
      });
    };

    loadPair();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, resetPair, setPair]);

  useEffect(() => {
    if (!partnerId) {
      setPartnerName(null);
      return;
    }
    supabase
      .from('users')
      .select('username,email')
      .eq('id', partnerId)
      .maybeSingle()
      .then(({ data }) => {
        const name = data?.username || data?.email?.split('@')[0] || null;
        setPartnerName(name);
      });
  }, [partnerId, setPartnerName]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !pairId) return;

    const loadLatestPartnerData = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('pair_id', pairId)
        .neq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        updatePartnerData(toSensorData(data));
        setPartnerConnected(true);
      }
    };

    const loadRecentAlerts = async () => {
      const { data, error } = await supabase
        .from('anomaly_alerts')
        .select('*')
        .eq('pair_id', pairId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (!error && data) {
        setRecentAlerts(data.map(toAlert));
      }
    };

    loadLatestPartnerData();
    loadRecentAlerts();

    const sensorChannel = supabase
      .channel(`sensor_data:${pairId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || row.user_id === userId) return;

          const sensorData = toSensorData(row);
          updatePartnerData(sensorData);
          setPartnerConnected(true);

          if (sensorData.anomaly) {
            triggerAnomaly({
              pairId,
              userId: sensorData.userId,
              type: 'high_hr',
              severity: 'high',
              timestamp: sensorData.recordedAt || new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    const alertChannel = supabase
      .channel(`anomaly_alerts:${pairId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anomaly_alerts',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || row.user_id === userId) return;
          triggerAnomaly(toAlert(row));
        }
      )
      .subscribe();

    const pairChannel = supabase
      .channel(`pairs:${pairId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pairs',
          filter: `id=eq.${pairId}`,
        },
        (payload) => {
          const row = payload.new as any;
          const selectedPartnerId = row.user1_id === userId ? row.user2_id : row.user1_id;
          setPair({
            pairId: row.id,
            partnerId: selectedPartnerId || null,
            inviteCode: row.invite_code,
            isPaired: Boolean(row.user2_id),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sensorChannel);
      supabase.removeChannel(alertChannel);
      supabase.removeChannel(pairChannel);
    };
  }, [
    pairId,
    partnerId,
    session?.user?.id,
    setPair,
    setPartnerConnected,
    setRecentAlerts,
    triggerAnomaly,
    updatePartnerData,
  ]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !pairId || isEmptySensorReading(myData)) return;

    const now = Date.now();
    if (now - lastUploadAtRef.current < SENSOR_UPLOAD_INTERVAL_MS) return;

    const payload = {
      user_id: userId,
      pair_id: pairId,
      bpm: Math.round(Number(myData.bpm || 0)),
      gsr: Math.round(Number(myData.gsr || 0)),
      ax: Number(myData.ax || 0),
      ay: Number(myData.ay || 0),
      az: Number(myData.az || 0),
      anomaly: Boolean(myData.anomaly),
    };

    const signature = JSON.stringify(payload);
    if (signature === lastUploadSignatureRef.current) return;

    lastUploadAtRef.current = now;
    lastUploadSignatureRef.current = signature;

    supabase
      .from('sensor_data')
      .insert(payload)
      .then(({ error }: { error: any }) => {
        if (error) {
          console.warn('Sensor upload warning:', error.message);
        }
      });
  }, [myData, pairId, session?.user?.id]);
}
