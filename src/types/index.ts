export interface User {
  id: string;
  email: string;
  username?: string | null;
  bandName?: string | null;
}

export interface Pair {
  id: string;
  inviteCode: string;
  user1Id: string;
  user2Id?: string | null;
  createdAt?: string;
  pairedAt?: string | null;
}

export interface SensorData {
  userId: string;
  pairId: string;
  bpm: number;
  gsr: number;
  ax: number;
  ay: number;
  az: number;
  anomaly: boolean;
  recordedAt: string;
}

export interface AnomalyAlert {
  id?: string;
  pairId?: string;
  userId: string;
  type: 'high_hr' | 'low_gsr' | 'no_motion';
  severity: 'low' | 'medium' | 'high';
  message?: string | null;
  timestamp: string;
}

export const defaultSensorData: SensorData = {
  userId: '',
  pairId: '',
  bpm: 0,
  gsr: 0,
  ax: 0,
  ay: 0,
  az: 0,
  anomaly: false,
  recordedAt: '',
};
