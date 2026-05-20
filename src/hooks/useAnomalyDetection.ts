// Ma3akBand — anomaly-detection hook.
//
// Owns a single AnomalyDetector instance for the lifetime of the (app)
// navigator. Watches myData in the sensor store, runs the detector on every
// change, and on a real alert: (1) flips the local anomaly flag so the
// outgoing sensor_data row is marked, (2) inserts a row into anomaly_alerts
// so the *partner's* app receives the realtime push via the existing channel
// in useSupabaseSync.

import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useSensorStore } from '../stores/sensorStore';
import { AnomalyDetector } from '../ml/anomalyDetector';

const MIN_INSERT_GAP_MS = 5_000; // never insert two DB rows within 5 s

export function useAnomalyDetection() {
  const session = useAuthStore((s) => s.session);
  const myData = useSensorStore((s) => s.myData);
  const pairId = useSensorStore((s) => s.pairId);
  const isConnected = useSensorStore((s) => s.isConnected);
  const updateMyData = useSensorStore((s) => s.updateMyData);
  const triggerAnomaly = useSensorStore((s) => s.triggerAnomaly);

  // Hold the detector in a ref so it survives re-renders. useMemo is fine
  // too, but a ref makes it impossible for React to silently rebuild it.
  const detectorRef = useRef<AnomalyDetector | null>(null);
  if (detectorRef.current === null) {
    detectorRef.current = new AnomalyDetector();
  }

  const lastInsertAtRef = useRef(0);
  const lastSignatureRef = useRef<string>('');

  // Reset detector when the band disconnects so stale data doesn't leak.
  useEffect(() => {
    if (!isConnected) detectorRef.current?.reset();
  }, [isConnected]);

  // Run detection on each myData update. We compare a signature so a no-op
  // store update doesn't double-fire.
  useEffect(() => {
    const det = detectorRef.current;
    if (!det) return;

    const sig = `${myData.bpm}|${myData.gsr}|${myData.ax}|${myData.ay}|${myData.az}`;
    if (sig === lastSignatureRef.current) return;
    lastSignatureRef.current = sig;

    // Skip empty packets (initial state before first BLE notification).
    if (!myData.bpm && !myData.gsr && !myData.ax && !myData.ay && !myData.az) return;

    const result = det.ingest({
      bpm: myData.bpm,
      gsr: myData.gsr,
      ax: myData.ax,
      ay: myData.ay,
      az: myData.az,
      t: Date.now(),
    });

    // Always mirror the anomaly flag onto myData so the periodic sensor_data
    // upload in useSupabaseSync ships it. We only flip it on, never off, to
    // avoid flapping inside a single distress event.
    if (result.anomaly && !myData.anomaly) {
      updateMyData({ anomaly: true });
    }

    if (!result.alert) return;

    // Local UI buzz immediately.
    const userId = session?.user?.id;
    const localAlert = {
      pairId: pairId || undefined,
      userId: userId || '',
      type: result.alert.type,
      severity: result.alert.severity,
      message: result.alert.message,
      timestamp: new Date().toISOString(),
    };
    triggerAnomaly(localAlert);

    // Persist + push to partner via Supabase realtime. Only insert if we have
    // a session AND a pair, otherwise the RLS policy would reject us anyway.
    const now = Date.now();
    if (
      userId &&
      pairId &&
      now - lastInsertAtRef.current >= MIN_INSERT_GAP_MS
    ) {
      lastInsertAtRef.current = now;
      supabase
        .from('anomaly_alerts')
        .insert({
          pair_id: pairId,
          user_id: userId,
          type: result.alert.type,
          severity: result.alert.severity,
          message: result.alert.message,
        })
        .then(({ error }: { error: any }) => {
          if (error) console.warn('Alert insert warning:', error.message);
        });
    }

    // After a few seconds of "calm", clear the anomaly flag so future
    // packets aren't all marked.
    setTimeout(() => {
      const cur = useSensorStore.getState().myData;
      if (cur.anomaly) updateMyData({ anomaly: false });
    }, 8_000);
  }, [myData, pairId, session?.user?.id, triggerAnomaly, updateMyData]);
}
