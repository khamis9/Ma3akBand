import { create } from 'zustand';
import { SensorData, AnomalyAlert, defaultSensorData } from '../types';

interface SensorState {
  myData: SensorData;
  partnerData: SensorData;
  isConnected: boolean;
  lastAnomaly: AnomalyAlert | null;
  updateMyData: (data: Partial<SensorData>) => void;
  updatePartnerData: (data: Partial<SensorData>) => void;
  setConnected: (val: boolean) => void;
  triggerAnomaly: (alert: AnomalyAlert) => void;
  clearAnomaly: () => void;
}

export const useSensorStore = create<SensorState>((set) => ({
  myData: defaultSensorData,
  partnerData: defaultSensorData,
  isConnected: false,
  lastAnomaly: null,

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

  triggerAnomaly: (alert: AnomalyAlert) => {
    set({ lastAnomaly: alert });
  },

  clearAnomaly: () => {
    set({ lastAnomaly: null });
  },
}));
