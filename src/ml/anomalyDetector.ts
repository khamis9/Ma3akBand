// Ma3akBand — anomaly detector.
//
// Architecture: rule-based "fast path" (interpretable, defensible to a panel)
// fused with a trained classifier "slow path" (handles composite patterns that
// no single threshold catches). The schema currently constrains alert.type to
// one of {'high_hr', 'low_gsr', 'no_motion'}, so we map every internal class
// back to those three buckets and use `severity` ∈ {low, medium, high} to
// communicate confidence/intent.
//
// We also implement a small debouncer so a single 1-second BPM spike doesn't
// fire 4 alerts before it returns to baseline.

import { FeatureBuffer, FeatureVector, toModelInput, SensorPacket } from './features';
import { predict, ModelPrediction, ClassName } from './model';
import { BPM_HIGH, BPM_LOW, GSR_STRESS, MOTION_TIMEOUT_MS } from '../constants/thresholds';

export type AlertType = 'high_hr' | 'low_gsr' | 'no_motion';
export type Severity = 'low' | 'medium' | 'high';

export interface DetectionResult {
  /** Was an anomaly detected on this packet? */
  anomaly: boolean;
  /** The alert that should be sent, if any. */
  alert: {
    type: AlertType;
    severity: Severity;
    message: string;
  } | null;
  /** Numeric risk score in [0, 1]; useful for UI bars. */
  riskScore: number;
  /** Most likely physiological state from the trained model. */
  prediction: ModelPrediction | null;
  /** The raw feature snapshot — useful for debugging / charts. */
  features: FeatureVector;
}

interface DetectorOptions {
  /** Re-arm cooldown between alerts of the same type (ms). */
  cooldownMs?: number;
  /** Disable the trained-model path entirely (fall back to rules only). */
  rulesOnly?: boolean;
  /** Override BPM bounds for testing. */
  bpmHigh?: number;
  bpmLow?: number;
  /** Override GSR low threshold for testing. */
  gsrStress?: number;
}

export class AnomalyDetector {
  private buffer = new FeatureBuffer();
  private lastFireAt: Partial<Record<AlertType, number>> = {};
  private lastMotionAt: number = Date.now();
  private opts: Required<DetectorOptions>;

  constructor(opts: DetectorOptions = {}) {
    this.opts = {
      cooldownMs: opts.cooldownMs ?? 30_000,   // one alert per type per 30 s
      rulesOnly: opts.rulesOnly ?? false,
      bpmHigh: opts.bpmHigh ?? BPM_HIGH,
      bpmLow: opts.bpmLow ?? BPM_LOW,
      gsrStress: opts.gsrStress ?? GSR_STRESS,
    };
  }

  reset(): void {
    this.buffer.reset();
    this.lastFireAt = {};
    this.lastMotionAt = Date.now();
  }

  /** Main entry point — call on every incoming sensor packet. */
  ingest(p: SensorPacket): DetectionResult {
    const features = this.buffer.push(p);
    const now = p.t ?? Date.now();

    // Track movement for the "no_motion" watchdog.
    const moved =
      features.accelMagStd > 0.3 || features.jerkPeak > 1.0 || features.stillness < 0.6;
    if (moved) this.lastMotionAt = now;

    // --- Trained-model prediction ---
    let prediction: ModelPrediction | null = null;
    if (!this.opts.rulesOnly && features.samples >= 4) {
      try {
        prediction = predict(toModelInput(features));
      } catch (err) {
        // Model file missing or malformed — fail silently and rely on rules.
        prediction = null;
      }
    }

    // --- Risk score combines model probabilities with rule margins ---
    const risk = this.computeRisk(features, prediction, now);

    // --- Choose an alert (with cooldown) ---
    const alert = this.chooseAlert(features, prediction, now);
    if (alert) {
      this.lastFireAt[alert.type] = now;
    }

    return {
      anomaly: alert !== null,
      alert,
      riskScore: risk,
      prediction,
      features,
    };
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private inCooldown(type: AlertType, now: number): boolean {
    const last = this.lastFireAt[type] ?? 0;
    return now - last < this.opts.cooldownMs;
  }

  private chooseAlert(
    f: FeatureVector,
    pred: ModelPrediction | null,
    now: number,
  ): DetectionResult['alert'] {
    // 1) Hard physiological rules first — most interpretable.
    if (f.bpm > 0 && f.bpm >= this.opts.bpmHigh && !this.inCooldown('high_hr', now)) {
      return {
        type: 'high_hr',
        severity: f.bpm >= this.opts.bpmHigh + 30 ? 'high' : 'medium',
        message: `Heart rate spiked to ${f.bpm} bpm`,
      };
    }
    if (f.bpm > 0 && f.bpm <= this.opts.bpmLow && !this.inCooldown('high_hr', now)) {
      return {
        type: 'high_hr',  // schema only has 'high_hr' for HR anomalies
        severity: 'high',
        message: `Heart rate dropped to ${f.bpm} bpm`,
      };
    }
    if (
      f.gsr > 0 &&
      f.gsr < this.opts.gsrStress &&
      f.gsrDelta < -200 &&
      !this.inCooldown('low_gsr', now)
    ) {
      return {
        type: 'low_gsr',
        severity: f.gsr < this.opts.gsrStress / 2 ? 'high' : 'medium',
        message: 'High stress detected (GSR drop)',
      };
    }
    if (
      now - this.lastMotionAt > MOTION_TIMEOUT_MS &&
      f.samples >= 4 &&
      !this.inCooldown('no_motion', now)
    ) {
      return {
        type: 'no_motion',
        severity: 'low',
        message: 'No movement detected for a while',
      };
    }

    // 2) Trained-model "composite distress" — fires only when rules missed it.
    if (pred && pred.confidence >= 0.7 && pred.label !== 'normal') {
      const map: Record<ClassName, AlertType | null> = {
        normal: null,
        stress: 'low_gsr',
        impact: 'high_hr',
        distress: 'high_hr',
      };
      const type = map[pred.label];
      if (type && !this.inCooldown(type, now)) {
        return {
          type,
          severity: pred.label === 'distress' ? 'high' : 'medium',
          message: `Composite ${pred.label} pattern (model conf ${(pred.confidence * 100).toFixed(0)}%)`,
        };
      }
    }

    return null;
  }

  private computeRisk(
    f: FeatureVector,
    pred: ModelPrediction | null,
    now: number,
  ): number {
    // Rule margins normalised to [0,1].
    const hrPart = f.bpm > 0
      ? Math.max(
          0,
          (f.bpm - this.opts.bpmHigh) / 60,
          (this.opts.bpmLow - f.bpm) / 30,
        )
      : 0;
    const gsrPart =
      f.gsr > 0 ? Math.max(0, (this.opts.gsrStress - f.gsr) / this.opts.gsrStress) : 0;
    const motionPart =
      now - this.lastMotionAt > MOTION_TIMEOUT_MS
        ? Math.min(1, (now - this.lastMotionAt - MOTION_TIMEOUT_MS) / MOTION_TIMEOUT_MS)
        : 0;
    const ruleRisk = clamp01(Math.max(hrPart, gsrPart, motionPart));

    // Model risk = 1 - p(normal).
    const modelRisk = pred ? 1 - (pred.probs.normal ?? 0) : 0;

    // Take the max so any single confident signal can drive the bar up.
    return Math.max(ruleRisk, modelRisk);
  }
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
