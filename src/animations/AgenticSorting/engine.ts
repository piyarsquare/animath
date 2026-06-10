/**
 * Agentic Sorting — pure simulation engine.
 *
 * The array is modeled "cell-view" (after Zhang, Goldstein & Levin 2025,
 * arXiv:2401.05375): every element is an autonomous **agent** that runs its own
 * local rule (its *algotype*) and decides, on its own, whether to swap with a
 * neighbor. There is no top-down sorter. Order — when it appears — is emergent.
 *
 * `step()` is a pure reducer: `step(state, rand) -> state`. It never mutates its
 * input. Randomness is injected as a `rand: () => number` so a seeded PRNG makes
 * a whole run reproducible, and so the engine is testable in isolation.
 */

export type AgentType =
  | 'standard'
  | 'blindDate'
  | 'nomadic'
  | 'patrolling'
  | 'perfectionist';

export const AGENT_TYPE_LIST: AgentType[] = [
  'standard', 'blindDate', 'nomadic', 'patrolling', 'perfectionist',
];

/** Which way an agent wants order to run. +1 = ascending (smaller on the left),
 *  -1 = descending (larger on the left). In the faithful "selfish" mode every
 *  agent shares +1; the animath-original "phase separation" mode mixes both. */
export type Objective = 1 | -1;

export interface Agent {
  id: number;
  value: number;
  type: AgentType;
  objective: Objective;
  /** Patrolling heading (unused by other types). */
  dir: 1 | -1;
  /** Defective / "frozen" cell: never acts and cannot be moved — an obstacle the
   *  others must sort around. */
  frozen: boolean;
}

export interface SimState {
  agents: Agent[];
  cycles: number;
  wakeups: number;
  swaps: number;
}

export type Weights = Record<AgentType, number>;

/** Seeded PRNG (mulberry32) — kept local so the app stays self-contained. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenerateConfig {
  count: number;
  weights: Weights;
  /** 'uniform' → every agent ascending; 'split' → a fraction sort descending. */
  objectiveMode: 'uniform' | 'split';
  /** Share of agents that sort descending, 0..1 (only used in 'split'). */
  descShare: number;
  /** Share of agents that are frozen/defective, 0..1. */
  frozenShare: number;
}

/** Build a fresh population. Deterministic for a given `rand`. */
export function generate(cfg: GenerateConfig, rand: () => number): SimState {
  const { count, weights, objectiveMode, descShare, frozenShare } = cfg;
  const total = AGENT_TYPE_LIST.reduce((s, t) => s + Math.max(0, weights[t]), 0) || 1;

  const agents: Agent[] = Array.from({ length: count }, (_, i): Agent => {
    // weighted algotype pick
    let r = rand() * total;
    let type: AgentType = 'standard';
    for (const t of AGENT_TYPE_LIST) {
      const w = Math.max(0, weights[t]);
      if (r < w) { type = t; break; }
      r -= w;
    }
    const objective: Objective =
      objectiveMode === 'split' && rand() < descShare ? -1 : 1;
    return {
      id: i,
      value: Math.floor(rand() * 201) - 100,
      type,
      objective,
      dir: rand() > 0.5 ? 1 : -1,
      frozen: rand() < frozenShare,
    };
  });

  return { agents, cycles: 0, wakeups: 0, swaps: 0 };
}

/** Does agent `a` want to swap with neighbor `nb`, given which side `a` is on? */
function wantsSwap(a: Agent, nb: Agent, aIsLeft: boolean): boolean {
  const leftVal = aIsLeft ? a.value : nb.value;
  const rightVal = aIsLeft ? nb.value : a.value;
  // ascending wants left ≤ right (swap if left > right); descending is the mirror.
  return a.objective === 1 ? leftVal > rightVal : leftVal < rightVal;
}

/**
 * The agent's local rule. Returns the index it wants to swap into (or -1).
 * May mutate `agents[i].dir` (patrolling reverses its heading) — `agents` is a
 * fresh clone owned by `step`, so this stays pure with respect to the input.
 */
function propose(agents: Agent[], i: number, rand: () => number): number {
  const a = agents[i];
  const n = agents.length;

  switch (a.type) {
    // Bubble-style: a random adjacent neighbor.
    case 'standard': {
      const j = rand() > 0.5 ? i + 1 : i - 1;
      if (j < 0 || j >= n) return -1;
      return wantsSwap(a, agents[j], i < j) ? j : -1;
    }
    // Randomized compare-swap: a partner anywhere in the array.
    case 'blindDate': {
      const j = Math.floor(rand() * n);
      if (j === i) return -1;
      return wantsSwap(a, agents[j], i < j) ? j : -1;
    }
    // Insertion-style drift: only ever inspects the neighbor behind it.
    case 'nomadic': {
      const j = i - 1;
      if (j < 0) return -1;
      return wantsSwap(a, agents[j], i < j) ? j : -1;
    }
    // Cocktail-shaker: keep a heading; swap on contact, else reverse.
    case 'patrolling': {
      const j = i + a.dir;
      if (j < 0 || j >= n) { a.dir = (a.dir * -1) as 1 | -1; return -1; }
      if (wantsSwap(a, agents[j], i < j)) return j;
      a.dir = (a.dir * -1) as 1 | -1;
      return -1;
    }
    // Selection-style: scan the right tail for the extreme value and pull it in.
    case 'perfectionist': {
      let best = -1;
      for (let t = i + 1; t < n; t++) {
        if (agents[t].frozen) continue;
        if (best === -1 ||
            (a.objective === 1
              ? agents[t].value < agents[best].value
              : agents[t].value > agents[best].value)) best = t;
      }
      if (best === -1) return -1;
      const better = a.objective === 1
        ? agents[best].value < a.value
        : agents[best].value > a.value;
      return better ? best : -1;
    }
  }
  return -1;
}

/**
 * Advance one cycle. A random subset of (non-frozen) agents wakes, each proposes
 * a swap, and proposals are applied with **deterministic collision resolution**:
 * processed in `from`-index order, a swap commits only if neither cell has
 * already moved this tick and neither is frozen. This matters under divergent
 * objectives, where two agents can target the same cell in one tick.
 */
export function step(state: SimState, rand: () => number, wakeFraction = 0.15): SimState {
  const n = state.agents.length;
  if (n === 0) return state;

  const agents = state.agents.map(a => ({ ...a }));
  const k = Math.max(1, Math.floor(n * wakeFraction));

  // pick k distinct, non-frozen wake indices
  const wake: number[] = [];
  const seen = new Set<number>();
  let guard = 0;
  while (wake.length < k && guard < n * 4) {
    guard++;
    const idx = Math.floor(rand() * n);
    if (seen.has(idx)) continue;
    seen.add(idx);
    if (agents[idx].frozen) continue;
    wake.push(idx);
  }

  const proposals: { from: number; to: number }[] = [];
  let wakeups = 0;
  for (const i of wake) {
    wakeups++;
    const to = propose(agents, i, rand);
    if (to >= 0 && to < n && to !== i && !agents[to].frozen) {
      proposals.push({ from: i, to });
    }
  }

  proposals.sort((p, q) => p.from - q.from);
  const touched = new Set<number>();
  let swaps = 0;
  for (const { from, to } of proposals) {
    if (touched.has(from) || touched.has(to)) continue;
    const tmp = agents[from];
    agents[from] = agents[to];
    agents[to] = tmp;
    touched.add(from);
    touched.add(to);
    swaps++;
  }

  return {
    agents,
    cycles: state.cycles + 1,
    wakeups: state.wakeups + wakeups,
    swaps: state.swaps + swaps,
  };
}
