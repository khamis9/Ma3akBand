import { create } from 'zustand';
import { SensorData, AnomalyAlert, defaultSensorData } from '../types';

interface SensorState {
  myData: SensorData;
  partnerData: SensorData;
  isConnected: boolean;
  isPartnerConnected: boolean;
  pairId: string | null;
  partnerId: string | null;
  inviteCode: string | null;
  isPaired: boolean;
  lastAnomaly: AnomalyAlert | null;
  recentAlerts: AnomalyAlert[];
  updateMyData: (data: Partial<SensorData>) => void;
  updatePartnerData: (data: Partial<SensorData>) => void;
  setConnected: (val: boolean) => void;
  setPartnerConnected: (val: boolean) => void;
  setPair: (pair: {
    pairId: string | null;
    partnerId?: string | null;
    inviteCode?: string | null;
    isPaired?: boolean;
  }) => void;
  triggerAnomaly: (alert: AnomalyAlert) => void;
  setRecentAlerts: (alerts: AnomalyAlert[]) => void;
  resetPair: () => void;
  clearAnomaly: () => void;
}

export const useSensorStore = create<SensorState>((set) => ({
  myData: defaultSensorData,
  partnerData: defaultSensorData,
  isConnected: false,
  isPartnerConnected: false,
  pairId: null,
  partnerId: null,
  inviteCode: null,
  isPaired: false,
  lastAnomaly: null,
  recentAlerts: [],

  updateMyData: (data: Partial<SensorData>) => {
    set((state) => ({
      myData: { ...state.myData, ...data },
    }));
  },

  updatePartnerData: (data: Partial<SensorData>) => {
    set((state) => ({
      partnerData: { ...state.partnerData, ...data },
    }));
  },

  setConnected: (val: boolean) => {
    set({ isConnected: val });
  },

  setPartnerConnected: (val: boolean) => {
    set({ isPartnerConnected: val });
  },

  setPair: (pair) => {
    set((state) => ({
      pairId: pair.pairId,
      partnerId: pair.partnerId ?? state.partnerId,
      inviteCode: pair.inviteCode ?? state.inviteCode,
      isPaired: pair.isPaired ?? state.isPaired,
    }));
  },

  triggerAnomaly: (alert: AnomalyAlert) => {
    set((state) => ({
      lastAnomaly: alert,
      recentAlerts: [alert, ...state.recentAlerts].slice(0, 20),
    }));
  },

  setRecentAlerts: (alerts: AnomalyAlert[]) => {
    set({ recentAlerts: alerts });
  },

  resetPair: () => {
    set({
      pairId: null,
      partnerId: null,
      inviteCode: null,
      isPaired: false,
      isPartnerConnected: false,
      partnerData: defaultSensorData,
      recentAlerts: [],
      lastAnomaly: null,
    });
  },

  clearAnomaly: () => {
    set({ lastAnomaly: null });
  },
}));
