export type Element = "fire" | "ice" | "chaos";
export type ChaosType = "link" | "echo" | "dual";
export type EdgeKind = "adj" | "ice" | "chaos" | "wild";
export interface Edge { a: number; b: number; kind: EdgeKind }

export const ROWS = 5;
export const COLS = 8;
export const MAX_PICKS = 10;
export const DRAW_COUNT = 10;
export const CHAOS_CHANCE = 0.1;

export const rc = (n: number): [number, number] => [Math.floor((n - 1) / COLS), (n - 1) % COLS];
export const num = (r: number, c: number) => r * COLS + c + 1;
const dist = (a: number, b: number) => {
  const [r1, c1] = rc(a);
  const [r2, c2] = rc(b);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
};

type Rng = () => number;
function sample(count: number, rng: Rng, pool = Array.from({ length: 40 }, (_, i) => i + 1)) {
  const p = [...pool];
  const out: number[] = [];
  while (out.length < count && p.length) out.push(p.splice(Math.floor(rng() * p.length), 1)[0]!);
  return out;
}

export function genElements(rng: Rng = Math.random): Record<number, Element> {
  const s = sample(8, rng);
  const el: Record<number, Element> = {};
  s.forEach((n, i) => (el[n] = i < 3 ? "fire" : i < 6 ? "ice" : "chaos"));
  return el;
}
export const drawNumbers = (rng: Rng = Math.random) => sample(DRAW_COUNT, rng);
export const randomPicks = (count: number, rng: Rng = Math.random, pool?: number[]) => sample(count, rng, pool);

// Base paytable: PAY[picks][hits] = multiplier of stake
export const PAY: Record<number, number[]> = {
  1: [0, 2.5],
  2: [0, 1, 6],
  3: [0, 0, 2, 16],
  4: [0, 0, 1, 4, 40],
  5: [0, 0, 0.5, 2, 12, 120],
  6: [0, 0, 0, 1.5, 4, 30, 300],
  7: [0, 0, 0, 1, 2, 10, 80, 600],
  8: [0, 0, 0, 0.5, 2, 6, 30, 200, 1200],
  9: [0, 0, 0, 0, 1.5, 4, 15, 80, 500, 2500],
  10: [0, 0, 0, 0, 1, 3, 8, 40, 200, 1000, 5000],
};
export const basePay = (picks: number, hits: number) => (picks ? PAY[picks]?.[hits] ?? 0 : 0);
export const chainBase = (len: number) => (len < 2 ? 0 : len === 2 ? 1 : len === 3 ? 2.5 : 5 * 2 ** (len - 4));

export interface Chain { cells: number[]; length: number; fires: number; duals: number; iceBridges: number; base: number; fireMult: number; echo: number; bonus: number }
export interface Result {
  drawn: number[]; hits: number[]; blueHits: number[]; redHits: number[]; dualHits: number[];
  edges: Edge[]; chains: Chain[]; isolated: number[];
  bluePay: number; redPay: number; chainBonus: number;
  chaos: ChaosType | null; chaosNote: string; chaosBonus: number;
  totalBet: number; totalWin: number; overdrive: boolean;
}

export function evaluate(opts: {
  blue: number[]; red: number[]; drawn: number[]; elements: Record<number, Element>; stake: number; chaos?: ChaosType | null;
}): Result {
  const { blue, red, drawn, elements, stake } = opts;
  const chaos = opts.chaos ?? null;
  const d = new Set(drawn);
  const blueHits = blue.filter((n) => d.has(n));
  const redHits = red.filter((n) => d.has(n));
  const dualHits = blueHits.filter((n) => redHits.includes(n));
  const hits = [...new Set([...blueHits, ...redHits])].sort((a, b) => a - b);
  const hs = new Set(hits);

  const parent = new Map<number, number>(hits.map((h) => [h, h]));
  const find = (x: number): number => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  const edges: Edge[] = [];
  const link = (a: number, b: number, kind: EdgeKind) => { edges.push({ a, b, kind }); parent.set(find(a), find(b)); };
  const comps = () => {
    const m = new Map<number, number[]>();
    hits.forEach((h) => { const r = find(h); m.set(r, [...(m.get(r) ?? []), h]); });
    return [...m.values()];
  };

  for (const h of hits) {
    const [r, c] = rc(h);
    if (c + 1 < COLS && hs.has(num(r, c + 1))) link(h, num(r, c + 1), "adj");
    if (r + 1 < ROWS && hs.has(num(r + 1, c))) link(h, num(r + 1, c), "adj");
    // ICE passive bridge over exactly one empty ICE cell
    if (c + 2 < COLS && hs.has(num(r, c + 2)) && elements[num(r, c + 1)] === "ice" && !hs.has(num(r, c + 1))) link(h, num(r, c + 2), "ice");
    if (r + 2 < ROWS && hs.has(num(r + 2, c)) && elements[num(r + 1, c)] === "ice" && !hs.has(num(r + 1, c))) link(h, num(r + 2, c), "ice");
  }

  const nearest = (from: number[], to: number[]) => {
    let best: [number, number] | null = null, bd = Infinity;
    for (const a of from) for (const b of to) if (dist(a, b) < bd) { bd = dist(a, b); best = [a, b]; }
    return best;
  };

  // CHAOS: isolated chaos hit joins nearest chain; chaos hit in a chain pulls the nearest isolated hit
  for (const h of hits.filter((x) => elements[x] === "chaos")) {
    const cs = comps();
    const mine = cs.find((c) => c.includes(h))!;
    const chainCells = cs.filter((c) => c.length > 1 && c !== mine).flat();
    const isolated = cs.filter((c) => c.length === 1 && c !== mine).flat();
    const p = mine.length === 1 ? nearest([h], chainCells.length ? chainCells : isolated) : nearest(mine, isolated);
    if (p) link(p[0], p[1], "chaos");
  }

  let chaosNote = "";
  if (chaos === "link") {
    const cs = comps().sort((a, b) => b.length - a.length);
    const chains = cs.filter((c) => c.length > 1);
    let p: [number, number] | null = null;
    if (chains.length >= 2) p = nearest(chains[0]!, chains[1]!);
    else if (cs.length >= 2) p = nearest(cs[0]!, cs.slice(1).flat());
    if (p) { link(p[0], p[1], "wild"); chaosNote = `Wild Link fused ${p[0]} ↔ ${p[1]}`; }
    else chaosNote = "Wild Link found nothing to connect";
  }

  const chains: Chain[] = comps().filter((c) => c.length > 1).map((cells) => {
    const fires = cells.filter((x) => elements[x] === "fire").length;
    const duals = cells.filter((x) => dualHits.includes(x)).length;
    const iceBridges = edges.filter((e) => e.kind === "ice" && cells.includes(e.a)).length;
    const base = chainBase(cells.length);
    const fireMult = 2 ** fires;
    return { cells: cells.sort((a, b) => a - b), length: cells.length, fires, duals, iceBridges, base, fireMult, echo: 1, bonus: 0 };
  });
  const calc = (c: Chain) => (c.bonus = c.base * (1 + 0.5 * c.duals) * c.fireMult * c.echo * stake);
  chains.forEach(calc);
  const isolated = comps().filter((c) => c.length === 1).flat();

  let chaosBonus = 0;
  if (chaos === "echo") {
    const fireChains = chains.filter((c) => c.fires > 0).sort((a, b) => b.bonus - a.bonus);
    const elemChains = chains.filter((c) => c.iceBridges > 0).sort((a, b) => b.bonus - a.bonus);
    if (fireChains[0]) { fireChains[0].echo = 2; calc(fireChains[0]); chaosNote = "Wild Echo re-ignited FIRE ×2"; }
    else if (elemChains[0]) { elemChains[0].echo = 1.5; calc(elemChains[0]); chaosNote = "Wild Echo re-froze ICE bridge ×1.5"; }
    else { chaosBonus = 2 * stake; chaosNote = "Wild Echo: no element active, consolation 2×"; }
  }
  const pickedBoth = blue.length > 0 && red.length > 0;
  if (chaos === "dual") {
    if (pickedBoth && blueHits.length >= 2 && redHits.length >= 2) {
      chaosBonus = (5 + 5 * dualHits.length) * stake;
      chaosNote = `Dual Overdrive! Both layers ≥2 hits (+${dualHits.length} dual)`;
    } else chaosNote = "Dual Overdrive failed: need ≥2 Blue AND ≥2 Red hits";
  }

  const bluePay = basePay(blue.length, blueHits.length) * stake;
  const redPay = basePay(red.length, redHits.length) * stake;
  const chainBonus = chains.reduce((s, c) => s + c.bonus, 0);
  const totalBet = stake * ((blue.length ? 1 : 0) + (red.length ? 1 : 0));
  const totalWin = round(bluePay + redPay + chainBonus + chaosBonus);
  const maxChain = Math.max(0, ...chains.map((c) => c.length));
  const overdrive = !!chaos || maxChain >= 4 || dualHits.length >= 2 || (totalBet > 0 && totalWin >= 15 * totalBet);

  return { drawn, hits, blueHits, redHits, dualHits, edges, chains, isolated, bluePay: round(bluePay), redPay: round(redPay), chainBonus: round(chainBonus), chaos, chaosNote, chaosBonus: round(chaosBonus), totalBet, totalWin, overdrive };
}
const round = (x: number) => Math.round(x * 100) / 100;
