/**
 * Round-robin strategy tournament with parallel workers and confidence intervals.
 *
 *   npm run tournament -- --games 6 --jobs 4
 *   npm run tournament -- --games 6 --timeLimit 900 --out docs/balance/limit15
 *   npm run tournament -- --only std2_mix_4L,rush1_mix_2L,defenseOnly --games 20
 *
 * Every pairing is played `games` times per side assignment (so 2*games games per pairing).
 * Games that hit `--limit` seconds without a winner count as draws.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRATEGIES, STRATEGY_SPECS } from '../sim/ai/strategies';
import type { Job, PairResult } from './worker';

interface Args {
  games: number;
  jobs: number;
  limit: number;
  timeLimit: number | null;
  only: string[] | null;
  out: string | null;
  seed: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { games: 6, jobs: 4, limit: 1800, timeLimit: null, only: null, out: null, seed: 4242 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--games': a.games = Number(v); i++; break;
      case '--jobs': a.jobs = Number(v); i++; break;
      case '--limit': a.limit = Number(v); i++; break;
      case '--timeLimit': a.timeLimit = Number(v); i++; break;
      case '--only': a.only = v.split(','); i++; break;
      case '--out': a.out = v; i++; break;
      case '--seed': a.seed = Number(v); i++; break;
    }
  }
  return a;
}

/** Wilson score interval for a binomial proportion. */
function wilson(wins: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = wins / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function runWorker(job: Job): Promise<PairResult[]> {
  return new Promise((resolve, reject) => {
    const workerPath = fileURLToPath(new URL('./worker.ts', import.meta.url));
    const child = spawn(process.execPath, ['--import', 'tsx', workerPath, JSON.stringify(job)], { stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    child.stdout.on('data', (d) => (buf += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`worker exited with ${code}`));
      resolve(buf.split('\n').filter(Boolean).map((l) => JSON.parse(l) as PairResult));
    });
  });
}

interface Row {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  winRate: number;
  ci: [number, number];
  avgDuration: number;
  worst: { vs: string; rate: number } | null;
  best: { vs: string; rate: number } | null;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const ids = (args.only ?? Object.keys(STRATEGIES)).filter((id) => {
    if (!STRATEGIES[id]) console.error(`unknown strategy ${id}`);
    return !!STRATEGIES[id];
  });
  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);

  const t0 = Date.now();
  console.error(`${ids.length} strategies, ${pairs.length} pairings, ${pairs.length * args.games * 2} games, ${args.jobs} workers`);

  // Interleave pairs across workers so slow (stalemate-prone) pairings spread out.
  const chunks: [string, string][][] = Array.from({ length: args.jobs }, () => []);
  pairs.forEach((p, i) => chunks[i % args.jobs].push(p));
  const results = (
    await Promise.all(
      chunks
        .filter((c) => c.length > 0)
        .map((c) => runWorker({ pairs: c, games: args.games, limit: args.limit, timeLimit: args.timeLimit, seedBase: args.seed })),
    )
  ).flat();

  // Aggregate.
  const matrix = new Map<string, Map<string, { w: number; l: number; d: number }>>();
  for (const id of ids) matrix.set(id, new Map());
  const rows = new Map<string, Row>();
  for (const id of ids) {
    rows.set(id, { id, name: STRATEGIES[id].name, wins: 0, losses: 0, draws: 0, games: 0, winRate: 0, ci: [0, 0], avgDuration: 0, worst: null, best: null });
  }
  const durations = new Map<string, number[]>();
  for (const r of results) {
    matrix.get(r.a)!.set(r.b, { w: r.aWins, l: r.bWins, d: r.draws });
    matrix.get(r.b)!.set(r.a, { w: r.bWins, l: r.aWins, d: r.draws });
    for (const [id, w, l] of [[r.a, r.aWins, r.bWins], [r.b, r.bWins, r.aWins]] as [string, number, number][]) {
      const row = rows.get(id)!;
      row.wins += w;
      row.losses += l;
      row.draws += r.draws;
      row.games += w + l + r.draws;
      (durations.get(id) ?? durations.set(id, []).get(id)!).push(...r.durations);
    }
  }
  for (const row of rows.values()) {
    row.winRate = row.games ? row.wins / row.games : 0;
    row.ci = wilson(row.wins, row.games);
    const d = durations.get(row.id) ?? [];
    row.avgDuration = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
    for (const [vs, m] of matrix.get(row.id)!) {
      const n = m.w + m.l + m.d;
      const rate = n ? m.w / n : 0;
      if (!row.worst || rate < row.worst.rate) row.worst = { vs, rate };
      if (!row.best || rate > row.best.rate) row.best = { vs, rate };
    }
  }
  const ranked = [...rows.values()].sort((a, b) => b.winRate - a.winRate);

  // Report.
  const lines: string[] = [];
  const mode = args.timeLimit ? `${args.timeLimit / 60}분 제한` : `무제한 (${args.limit / 60}분 후 무승부)`;
  lines.push(`# 전략 토너먼트 결과 — ${mode}`);
  lines.push('');
  lines.push(`- 전략 ${ids.length}개, 총 ${pairs.length * args.games * 2}판 (매치업당 ${args.games * 2}판, 진영 교대)`);
  lines.push(`- 승률 신뢰구간: Wilson 95%. seed ${args.seed}.`);
  lines.push('');
  lines.push('| # | 전략 | 승률 | 95% CI | 승-패-무 | 평균 시간 | 최악의 상대 (승률) | 최고의 상대 (승률) |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  ranked.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.name} \`${r.id}\` | ${(r.winRate * 100).toFixed(1)}% | ${(r.ci[0] * 100).toFixed(0)}–${(r.ci[1] * 100).toFixed(0)}% | ${r.wins}-${r.losses}-${r.draws} | ${(r.avgDuration / 60).toFixed(1)}분 | ${r.worst ? `${r.worst.vs} (${(r.worst.rate * 100).toFixed(0)}%)` : ''} | ${r.best ? `${r.best.vs} (${(r.best.rate * 100).toFixed(0)}%)` : ''} |`,
    );
  });
  lines.push('');
  lines.push('## 상위 8개 상호 승률 (행 기준 승률 %)');
  lines.push('');
  const top = ranked.slice(0, 8).map((r) => r.id);
  lines.push(`| | ${top.map((id) => `\`${id}\``).join(' | ')} |`);
  lines.push(`| --- | ${top.map(() => '---').join(' | ')} |`);
  for (const a of top) {
    const cells = top.map((b) => {
      if (a === b) return '—';
      const m = matrix.get(a)!.get(b)!;
      const n = m.w + m.l + m.d;
      return n ? `${((m.w / n) * 100).toFixed(0)}` : '';
    });
    lines.push(`| \`${a}\` | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push(`실행 시간 ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const report = lines.join('\n');
  console.log(report);
  if (args.out) {
    mkdirSync(dirname(args.out + '.md'), { recursive: true });
    writeFileSync(args.out + '.md', report + '\n');
    writeFileSync(
      args.out + '.json',
      JSON.stringify({ args, specs: STRATEGY_SPECS.filter((s) => ids.includes(s.id)), ranked, matrix: Object.fromEntries([...matrix].map(([k, v]) => [k, Object.fromEntries(v)])) }, null, 2),
    );
    console.error(`wrote ${args.out}.md / .json`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
