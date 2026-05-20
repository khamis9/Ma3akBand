// Ma3akBand — partner simulator.
//
// The capstone proposal calls for two bracelets sharing live data. In the
// physical build only one band exists, so for the demo we simulate a second
// paired user. This module pushes scripted "partner" sensor readings into
// the sensor store at 2 Hz, exactly the same cadence the real band would.
//
// Scenarios:
//   - calm      : resting baseline, partner is fine
//   - stressed  : HR creeping up, GSR dropping
//   - distress  : composite — high HR, low GSR, agitated motion (fires alerts)
//   - impact    : single hard spike in jerk + accel std (then return to calm)
//
// Usage:
//   const sim = new PartnerSimulator();
//   sim.start('calm');
//   ...later...
//   sim.setScenario('distress');
//   sim.stop();

import { useSensorStore } from '../stores/sensorStore';

export type Scenario = 'calm' | 'stressed' | 'distress' | 'impact' | 'off';

interface Generator {
  next(t: number): { bpm: number; gsr: number; ax: number; ay: number; az: number };
}

function gauss(mu: number, sigma: number): number {
  // Box-Muller transform.
  const u = 1 - Math.random();
  const v = Math.random();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

class CalmGen implements Generator {
  next() {
    return {
      bpm: Math.round(gauss(74, 4)),
      gsr: Math.round(gauss(2900, 200)),
      ax: gauss(0.0, 0.15),
      ay: gauss(0.0, 0.15),
      az: gauss(9.8, 0.15),
    };
  }
}

class StressedGen implements Generator {
  private base = Date.now();
  next() {
    // Slowly drift HR up and GSR down.
    const t = (Date.now() - this.base) / 1000;
    const drift = Math.min(1, t / 30);
    return {
      bpm: Math.round(gauss(95 + 15 * drift, 5)),
      gsr: Math.round(gauss(1500 - 400 * drift, 200)),
      ax: gauss(0.0, 0.3),
      ay: gauss(0.0, 0.3),
      az: gauss(9.8, 0.3),
    };
  }
}

class DistressGen implements Generator {
  next() {
    // Sustained acute event — designed to fire both rule-based and model-based alerts.
    return {
      bpm: Math.round(gauss(135, 6)),
      gsr: Math.round(gauss(800, 150)),
      ax: gauss(0.5, 1.2),
      ay: gauss(0.5, 1.2),
      az: gauss(9.8, 1.5),
    };
  }
}

class ImpactGen implements Generator {
  private t0 = Date.now();
  next() {
    // First ~3 s is a sharp impact spike, then back to calm.
    const t = (Date.now() - this.t0) / 1000;
    if (t < 3) {
      return {
        bpm: Math.round(gauss(95, 8)),
        gsr: Math.round(gauss(2200, 400)),
        ax: gauss(4.0, 3.0),
        ay: gauss(-3.0, 3.0),
        az: gauss(14.0, 4.0),
      };
    }
    return new CalmGen().next();
  }
}

function makeGen(s: Scenario): Generator | null {
  switch (s) {
    case 'calm':     return new CalmGen();
    case 'stressed': return new StressedGen();
    case 'distress': return new DistressGen();
    case 'impact':   return new ImpactGen();
    case 'off':
    default:         return null;
  }
}

export class PartnerSimulator {
  private timer: any = null;
  private gen: Generator | null = null;
  private scenario: Scenario = 'off';

  start(scenario: Scenario = 'calm') {
    this.setScenario(scenario);
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 500);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setScenario(scenario: Scenario) {
    this.scenario = scenario;
    this.gen = makeGen(scenario);
  }

  getScenario(): Scenario {
    return this.scenario;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  private tick() {
    if (!this.gen) return;
    const reading = this.gen.next(Date.now());
    useSensorStore.getState().updateMyData({
      ...reading,
      anomaly: this.scenario === 'distress' || this.scenario === 'impact',
      recordedAt: new Date().toISOString(),
    });
  }
}

// Singleton — only one simulator at a time.
export const partnerSimulator = new PartnerSimulator();
