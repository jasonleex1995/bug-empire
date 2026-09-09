/**
 * Headless AI-vs-AI balance runner.
 *
 *   npm run sim -- --a balanced --b defenseOnly --games 30 --limit 1200
 *   npm run sim -- --matrix            # every profile against every other
 */
import { AiController } from '../sim/ai/controller';
import { PROFILES } from '../sim/ai/profiles';
import { TICK_DT } from '../sim/config';
import { createGame } from '../sim/state';
import { step } from '../sim/step';

interface Args {
  a: string;
  b: string;
  games: number;
  /** Hard stop in seconds so a stalemate cannot hang the runner. */
  limit: number;
  timeLimit: number | null;
  matrix: boolean;
  multA: number;
  multB: number;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { a: 'balanced', b: 'defenseOnly', games: 20, limit: 1800, timeLimit: null, matrix: false, multA: 1, multB: 1, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--a': args.a = v; i++; break;
      case '--b': args.b = v; i++; break;
      case '--games': args.games = Number(v); i++; break;
      case '--limit': args.limit = Number(v); i++; break;
      case '--timeLimit': args.timeLimit = Number(v); i++; break;
      case '--multA': args.multA = Number(v); i++; break;
      case '--multB': args.multB = Number(v); i++; break;
      case '--matrix': args.matrix = true; break;
      case '--verbose': args.verbose = true; break;
    }
  }
  return args;
}

interface MatchResult {
  winsA: number;
  winsB: number;
  draws: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  avgGasA: number;
  avgGasB: number;
}

function runMatch(a: string, b: string, games: number, limit: number, timeLimit: number | null, multA: number, multB: number, verbose: boolean): MatchResult {
  const pa = PROFILES[a];
  const pb = PROFILES[b];
  if (!pa || !pb) throw new Error(`unknown profile: ${!pa ? a : b}. Known: ${Object.keys(PROFILES).join(', ')}`);
  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let total = 0;
  let min = Infinity;
  let max = 0;
  let gasA = 0;
  let gasB = 0;
  for (let g = 0; g < games; g++) {
    const seed = 1000 + g;
    const state = createGame({ seed, timeLimit, resourceMult: [multA, multB] });
    const aiA = new AiController(0, pa, state.rng.int(1 << 30));
    const aiB = new AiController(1, pb, state.rng.int(1 << 30));
    while (state.winner === null && state.t < limit) {
      aiA.update(state);
      aiB.update(state);
      step(state, TICK_DT);
    }
    let w = state.winner;
    if (w === null) {
      const [p0, p1] = state.players;
      w = p0.castleHp > p1.castleHp ? 0 : p1.castleHp > p0.castleHp ? 1 : 'draw';
    }
    if (w === 0) winsA++;
    else if (w === 1) winsB++;
    else draws++;
    total += state.t;
    min = Math.min(min, state.t);
    max = Math.max(max, state.t);
    gasA += state.players[0].stats.gasEarned;
    gasB += state.players[1].stats.gasEarned;
    if (verbose) {
      const [p0, p1] = state.players;
      console.log(
        `  seed ${seed}: winner=${String(w)} t=${state.t.toFixed(0)}s castle=${p0.castleHp.toFixed(0)}/${p1.castleHp.toFixed(0)} ` +
          `kills=${p0.stats.kills}/${p1.stats.kills} gas=${p0.stats.gasEarned.toFixed(0)}/${p1.stats.gasEarned.toFixed(0)} modules=${state.modules.filter((m) => m.side === 0).length}/${state.modules.filter((m) => m.side === 1).length}`,
      );
    }
  }
  return { winsA, winsB, draws, avgDuration: total / games, minDuration: min, maxDuration: max, avgGasA: gasA / games, avgGasB: gasB / games };
}

function fmt(r: MatchResult, a: string, b: string): string {
  return `${a.padEnd(12)} vs ${b.padEnd(12)}  ${String(r.winsA).padStart(3)} - ${String(r.winsB).padStart(3)} (draw ${r.draws})  ` +
    `avg ${(r.avgDuration / 60).toFixed(1)}min [${(r.minDuration / 60).toFixed(1)}-${(r.maxDuration / 60).toFixed(1)}]  gas ${r.avgGasA.toFixed(0)}/${r.avgGasB.toFixed(0)}`;
}

const args = parseArgs(process.argv.slice(2));
const t0 = Date.now();
if (args.matrix) {
  const ids = Object.keys(PROFILES);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      console.log(fmt(runMatch(ids[i], ids[j], args.games, args.limit, args.timeLimit, 1, 1, false), ids[i], ids[j]));
    }
  }
  // Mirror matches show first-mover / lane-offset bias.
  for (const id of ids) console.log(fmt(runMatch(id, id, args.games, args.limit, args.timeLimit, 1, 1, false), id, id));
} else {
  console.log(fmt(runMatch(args.a, args.b, args.games, args.limit, args.timeLimit, args.multA, args.multB, args.verbose), args.a, args.b));
}
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
