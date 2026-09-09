/**
 * Tournament worker process. Receives a JSON job on argv[2] and prints one JSON line per pairing.
 * Spawned by tournament.ts; not meant to be run by hand.
 */
import { AiController } from '../sim/ai/controller';
import { PROFILES } from '../sim/ai/profiles';
import { STRATEGIES } from '../sim/ai/strategies';
import { TICK_DT } from '../sim/config';
import { createGame } from '../sim/state';
import { step } from '../sim/step';

export interface Job {
  pairs: [string, string][];
  games: number;
  limit: number;
  timeLimit: number | null;
  seedBase: number;
}

export interface PairResult {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  draws: number;
  durations: number[];
}

const ALL = { ...PROFILES, ...STRATEGIES };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function playOne(aId: string, bId: string, seed: number, limit: number, timeLimit: number | null): { winner: 0 | 1 | 'draw'; t: number } {
  const state = createGame({ seed, timeLimit, resourceMult: [1, 1] });
  const a = new AiController(0, ALL[aId], state.rng.int(1 << 30));
  const b = new AiController(1, ALL[bId], state.rng.int(1 << 30));
  while (state.winner === null && state.t < limit) {
    a.update(state);
    b.update(state);
    step(state, TICK_DT);
  }
  return { winner: state.winner === null ? 'draw' : state.winner, t: state.t };
}

const job: Job = JSON.parse(process.argv[2]);
for (const [a, b] of job.pairs) {
  const r: PairResult = { a, b, aWins: 0, bWins: 0, draws: 0, durations: [] };
  const pairSeed = (job.seedBase + hash(a < b ? a + b : b + a)) >>> 0;
  for (let g = 0; g < job.games; g++) {
    const seed = (pairSeed + g * 7919) >>> 0;
    // Play both side assignments with the same seed so side effects cancel out.
    const r1 = playOne(a, b, seed, job.limit, job.timeLimit);
    const r2 = playOne(b, a, seed, job.limit, job.timeLimit);
    for (const [res, aIsSide0] of [[r1, true], [r2, false]] as [typeof r1, boolean][]) {
      r.durations.push(res.t);
      if (res.winner === 'draw') r.draws++;
      else if ((res.winner === 0) === aIsSide0) r.aWins++;
      else r.bWins++;
    }
  }
  process.stdout.write(JSON.stringify(r) + '\n');
}
