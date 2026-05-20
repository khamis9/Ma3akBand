export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Pair {
  id: string;
  inviteCode: string;
  user1Id: string;
  user2Id: string;
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
  userId: string;
  type: 'high_hr' | 'low_gsr' | 'no_motion';
  severity: 'low' | 'high';
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
