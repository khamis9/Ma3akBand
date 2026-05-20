export const BPM_HIGH = 120;
export const BPM_LOW = 45;
export const GSR_STRESS = 1500;
export const MOTION_TIMEOUT_MS = 30000;

export function getStressLabel(gsr: number): string {
  if (gsr > 3000) return 'Calm';
  if (gsr > 2000) return 'Neutral';
  if (gsr > 1000) return 'Stressed';
  return 'High Stress';
}

export function getMotionLabel(az: number): string {
  if (Math.abs(az - 9.8) < 1.5) return 'Still';
  return 'Active';
}
