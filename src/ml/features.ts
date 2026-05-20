// Ma3akBand — feature extraction for on-device anomaly detection.
//
// We treat the incoming sensor packets as a continuous time series and compute
// a small bag of features on a sliding window. Features are intentionally
// lightweight (pure arithmetic, no FFT) so they run inside the React Native JS
// thread without bogging the UI down — every packet arrives roughly every
// 500 ms from the band, so this runs at ~2 Hz.
//
// Conventions:
//   - bpm:  beats per minute (raw from MAX30102 firmware estimate)
//   - gsr:  raw 12-bit ADC value (4095 = dry / calm, 0 = wet / high arousal)
//   - ax/ay/az: m/s² gravity-included acceleration (MPU-6050 default)
//
// The feature vector returned by `extractFeatures` is the same shape we feed
// to the Python-trained logistic regression in `model.ts`, so do NOT change
// the order without re-training and re-exporting `model.json`.

export interface SensorPacket {
  bpm: number;
  gsr: number;
  ax: number;
  ay: number;
  az: number;
  // Optional timestamp in ms; if absent, the buffer assigns one.
  t?: number;
}

export interface FeatureVector {
  // Heart rate
  bpm: number;          // current
  bpmMean: number;      // window mean (skips zeros — "no finger" packets)
  bpmStd: number;       // window std-dev (zeros excluded)
  bpmZ: number;         // (current - baseline mean) / max(baseline std, 5)

  // GSR
  gsr: number;          // current
  gsrMean: number;
  gsrDelta: number;     // current - mean (negative = drop = arousal)
  gsrSlope: number;     // linear-regression slope across window (per-sample)

  // Accelerometer
  accelMag: number;     // |a| at current sample (m/s²)
  accelMagMean: number; // mean magnitude across window
  accelMagStd: number;  // std-dev of magnitude (movement intensity proxy)
  jerkPeak: number;     // max |a[t]-a[t-1]| in window — impact / sudden-motion proxy
  stillness: number;    // fraction of window samples within ±1.5 of 1g

  // Meta
  samples: number;      // how many samples are currently in the window
}

const WINDOW_MS = 10_000;   // 10 s — long enough to smooth, short enough to react
const MIN_SAMPLES = 4;      // before then we report degenerate stats

export class FeatureBuffer {
  private buf: SensorPacket[] = [];

  /** Push a new sample. Returns the current feature vector. */
  push(p: SensorPacket): FeatureVector {
    const t = p.t ?? Date.now();
    this.buf.push({ ...p, t });

    // Drop old samples outside the window.
    const cutoff = t - WINDOW_MS;
    while (this.buf.length > 0 && (this.buf[0].t ?? 0) < cutoff) {
      this.buf.shift();
    }

    return this.compute();
  }

  /** Reset the buffer — call on disconnect so stale data doesn't leak. */
  reset(): void {
    this.buf = [];
  }

  private compute(): FeatureVector {
    const n = this.buf.length;
    if (n === 0) return zeroFeatures();

    const last = this.buf[n - 1];

    // --- BPM stats (skip zero "no finger" readings) ---
    const bpms = this.buf.map((p) => p.bpm).filter((v) => v > 0);
    const bpmMean = bpms.length ? mean(bpms) : 0;
    const bpmStd = bpms.length > 1 ? std(bpms, bpmMean) : 0;
    const bpmZ = bpmStd > 0 ? (last.bpm - bpmMean) / Math.max(bpmStd, 5) : 0;

    // --- GSR stats ---
    const gsrs = this.buf.map((p) => p.gsr);
    const gsrMean = mean(gsrs);
    const gsrDelta = last.gsr - gsrMean;
    const gsrSlope = linearSlope(gsrs);

    // --- Accelerometer magnitude ---
    const mags = this.buf.map((p) => Math.hypot(p.ax, p.ay, p.az));
    const accelMag = mags[mags.length - 1];
    const accelMagMean = mean(mags);
    const accelMagStd = std(mags, accelMagMean);

    let jerkPeak = 0;
    for (let i = 1; i < mags.length; i++) {
      const d = Math.abs(mags[i] - mags[i - 1]);
      if (d > jerkPeak) jerkPeak = d;
    }

    // Stillness: fraction of samples whose total magnitude is close to gravity (~9.8).
    const stillCount = mags.filter((m) => Math.abs(m - 9.8) < 1.5).length;
    const stillness = mags.length > 0 ? stillCount / mags.length : 0;

    return {
      bpm: last.bpm,
      bpmMean,
      bpmStd,
      bpmZ: n >= MIN_SAMPLES ? bpmZ : 0,
      gsr: last.gsr,
      gsrMean,
      gsrDelta,
      gsrSlope,
      accelMag,
      accelMagMean,
      accelMagStd,
      jerkPeak,
      stillness,
      samples: n,
    };
  }
}

// --- helpers ---

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function std(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

/** Slope of a linear regression y = a*i + b over [0, N), per-sample. */
function linearSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (ys[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function zeroFeatures(): FeatureVector {
  return {
    bpm: 0, bpmMean: 0, bpmStd: 0, bpmZ: 0,
    gsr: 0, gsrMean: 0, gsrDelta: 0, gsrSlope: 0,
    accelMag: 0, accelMagMean: 0, accelMagStd: 0,
    jerkPeak: 0, stillness: 0,
    samples: 0,
  };
}

/**
 * Project features into the fixed order the trained model expects.
 * Keep this aligned with `feature_names` in ml-training/train.py.
 */
export const MODEL_FEATURES = [
  'bpm',
  'bpmZ',
  'bpmStd',
  'gsr',
  'gsrDelta',
  'gsrSlope',
  'accelMag',
  'accelMagStd',
  'jerkPeak',
  'stillness',
] as const;

export function toModelInput(f: FeatureVector): number[] {
  return MODEL_FEATURES.map((k) => f[k] as number);
}
