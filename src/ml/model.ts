// Ma3akBand — trained-model inference (logistic regression / softmax MLP).
//
// We train a small multi-class classifier offline in Python (see
// `ml-training/train.py`) and export the weights to `model.json`. At app
// startup we load that file and run a forward pass on every feature window.
//
// The exported format is intentionally minimal so we don't have to ship a
// TensorFlow.js runtime — the whole inference is two matrix-vector mults.
//
//   {
//     "version": 1,
//     "classes":  ["normal", "stress", "impact", "distress"],
//     "features": ["bpm", "bpmZ", ...],         // same order as MODEL_FEATURES
//     "scaler":   { "mean": [...], "scale": [...] },
//     "layers":   [
//       { "W": [[...], ...], "b": [...], "act": "relu" },
//       { "W": [[...], ...], "b": [...], "act": "softmax" }
//     ]
//   }
//
// For a single logistic-regression model, just one layer with act="softmax".

import modelJson from './model.json';

export type ClassName = 'normal' | 'stress' | 'impact' | 'distress';

interface Layer {
  W: number[][];   // [out, in]
  b: number[];     // [out]
  act: 'relu' | 'softmax' | 'sigmoid' | 'linear';
}

interface ModelArtifact {
  version: number;
  classes: ClassName[];
  features: string[];
  scaler: { mean: number[]; scale: number[] };
  layers: Layer[];
}

const model = modelJson as ModelArtifact;

function standardize(x: number[]): number[] {
  const { mean, scale } = model.scaler;
  const out = new Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const s = scale[i] || 1;
    out[i] = (x[i] - mean[i]) / s;
  }
  return out;
}

function matvec(W: number[][], x: number[], b: number[]): number[] {
  const out = new Array(W.length);
  for (let i = 0; i < W.length; i++) {
    let s = b[i] || 0;
    const row = W[i];
    const n = Math.min(row.length, x.length);
    for (let j = 0; j < n; j++) s += row[j] * x[j];
    out[i] = s;
  }
  return out;
}

function applyActivation(z: number[], act: Layer['act']): number[] {
  if (act === 'relu') return z.map((v) => (v > 0 ? v : 0));
  if (act === 'sigmoid') return z.map((v) => 1 / (1 + Math.exp(-v)));
  if (act === 'linear') return z;
  // softmax
  const m = Math.max(...z);
  const ex = z.map((v) => Math.exp(v - m));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((v) => v / s);
}

export interface ModelPrediction {
  /** Top-1 class label. */
  label: ClassName;
  /** Probability of the top-1 class. */
  confidence: number;
  /** Full probability distribution, keyed by class. */
  probs: Record<ClassName, number>;
}

/** Forward pass: feature vector → class probabilities. */
export function predict(x: number[]): ModelPrediction {
  let h = standardize(x);
  for (const layer of model.layers) {
    h = applyActivation(matvec(layer.W, h, layer.b), layer.act);
  }
  const probs = {} as Record<ClassName, number>;
  let bestI = 0;
  for (let i = 0; i < model.classes.length; i++) {
    probs[model.classes[i]] = h[i] ?? 0;
    if ((h[i] ?? 0) > (h[bestI] ?? 0)) bestI = i;
  }
  return {
    label: model.classes[bestI],
    confidence: h[bestI] ?? 0,
    probs,
  };
}

export const MODEL_INFO = {
  version: model.version,
  classes: model.classes,
  features: model.features,
};
