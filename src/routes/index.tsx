import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Snowflake, Zap, Shuffle, Trash2, Gauge, Sparkles } from "lucide-react";
import {
  COLS, ROWS, MAX_PICKS, CHAOS_CHANCE, rc, genElements, drawNumbers, randomPicks, evaluate, basePay,
  type Element, type ChaosType, type Result,
} from "@/lib/keno";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KENO: Chain Reactor — Chaos Overdrive" },
      { name: "description", content: "Dual Blue/Red keno with Fire, Ice and Chaos elements, chain reactions and the Chaos Ball bonus." },
      { property: "og:title", content: "KENO: Chain Reactor — Chaos Overdrive" },
      { property: "og:description", content: "Neon dual keno demo with chain reactions and Overdrive finale." },
    ],
  }),
  component: Game,
});

type Phase = "idle" | "draw" | "reaction" | "chaosball" | "overdrive" | "result";
const STAKES = [0.5, 1, 2, 5, 10, 25];
const PHASE_LABEL: Record<Phase, string> = {
  idle: "PLACE YOUR PICKS", draw: "01 — THE DRAW", reaction: "02 — THE REACTION",
  chaosball: "★ CHAOS BALL ★", overdrive: "03 — OVERDRIVE", result: "ROUND COMPLETE",
};
const CHAOS_LABEL: Record<ChaosType, string> = { link: "WILD LINK", echo: "WILD ECHO", dual: "DUAL OVERDRIVE" };
const EL_ICON = { fire: Flame, ice: Snowflake, chaos: Zap } as const;
const EL_TEXT: Record<Element, string> = { fire: "text-fire", ice: "text-ice", chaos: "text-chaos" };
const EDGE_STROKE = { adj: "var(--neon-fuse)", ice: "var(--ice)", chaos: "var(--chaos)", wild: "var(--fire)" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => n.toFixed(2);

function Game() {
  const [elements, setElements] = useState<Record<number, Element>>({});
  useEffect(() => setElements(genElements()), []);
  const [blue, setBlue] = useState<number[]>([]);
  const [red, setRed] = useState<number[]>([]);
  const [side, setSide] = useState<"blue" | "red">("blue");
  const [stake, setStake] = useState(1);
  const [balance, setBalance] = useState(1000);
  const [phase, setPhase] = useState<Phase>("idle");
  const [drawn, setDrawn] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [turbo, setTurbo] = useState(false);
  const [force, setForce] = useState<"off" | "random" | ChaosType>("off");
  const [history, setHistory] = useState<{ bet: number; win: number; chaos: ChaosType | null }[]>([]);
  const turboRef = useRef(turbo);
  turboRef.current = turbo;

  const busy = phase !== "idle" && phase !== "result";
  const totalBet = stake * ((blue.length ? 1 : 0) + (red.length ? 1 : 0));
  const canPlay = !busy && phase === "idle" && totalBet > 0 && balance >= totalBet;
  const t = (ms: number) => sleep(turboRef.current ? ms * 0.3 : ms);

  const toggle = (n: number) => {
    if (busy) return;
    if (phase === "result") nextRound(false);
    const [list, set] = side === "blue" ? [blue, setBlue] : [red, setRed];
    if (list.includes(n)) set(list.filter((x) => x !== n));
    else if (list.length < MAX_PICKS) set([...list, n]);
  };

  const nextRound = (reroll = true) => {
    setDrawn([]); setResult(null); setPhase("idle");
    if (reroll) setElements(genElements());
  };

  const preset = (kind: "mirror" | "split" | "hunter") => {
    if (busy) return;
    if (phase === "result") nextRound();
    if (kind === "mirror") { const p = randomPicks(10); setBlue(p); setRed([...p]); }
    if (kind === "split") {
      const left: number[] = [], right: number[] = [];
      for (let n = 1; n <= 40; n++) (rc(n)[1] < COLS / 2 ? left : right).push(n);
      setBlue(randomPicks(6, Math.random, left)); setRed(randomPicks(6, Math.random, right));
    }
    if (kind === "hunter") {
      const fire = Object.keys(elements).map(Number).filter((n) => elements[n] === "fire");
      const ice = Object.keys(elements).map(Number).filter((n) => elements[n] === "ice");
      const rest = (taken: number[]) => Array.from({ length: 40 }, (_, i) => i + 1).filter((n) => !taken.includes(n));
      const b = [...fire, ...ice];
      setBlue([...b, ...randomPicks(7 - b.length, Math.random, rest(b))]);
      // red flanks the ice bridges (the cells around each ICE) for chain potential
      const flank = [...new Set(ice.flatMap((n) => { const [r, c] = rc(n); return [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c]].filter(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS).map(([y, x]) => y * COLS + x + 1); }))].filter((n) => !ice.includes(n));
      const r = randomPicks(Math.min(5, flank.length), Math.random, flank);
      setRed([...r, ...randomPicks(7 - r.length, Math.random, rest(r))]);
    }
  };

  const play = async () => {
    if (!canPlay) return;
    setBalance((b) => b - totalBet);
    setResult(null); setDrawn([]);
    setPhase("draw");
    const d = drawNumbers();
    for (const n of d) { await t(380); setDrawn((p) => [...p, n]); }
    const types: ChaosType[] = ["link", "echo", "dual"];
    const chaos: ChaosType | null =
      force === "off" ? (Math.random() < CHAOS_CHANCE ? types[Math.floor(Math.random() * 3)] : null)
      : force === "random" ? types[Math.floor(Math.random() * 3)] : force;
    const res = evaluate({ blue, red, drawn: d, elements, stake, chaos });
    await t(400);
    setResult(res); setPhase("reaction");
    await t(1800);
    if (chaos) { setPhase("chaosball"); await t(2400); }
    if (res.overdrive) { setPhase("overdrive"); await t(2600); }
    setBalance((b) => Math.round((b + res.totalWin) * 100) / 100);
    setHistory((h) => [{ bet: res.totalBet, win: res.totalWin, chaos }, ...h].slice(0, 8));
    setPhase("result");
  };

  const showWild = phase === "chaosball" || phase === "overdrive" || phase === "result";
  const edges = result ? result.edges.filter((e) => e.kind !== "wild" || showWild) : [];
  const chainCells = useMemo(() => new Set(result?.chains.flatMap((c) => c.cells) ?? []), [result]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-wider md:text-4xl">
            <span className="text-neon-blue">KENO</span><span className="text-muted-foreground">:</span>{" "}
            <span className="text-neon-fuse drop-shadow-[0_0_12px_var(--neon-fuse)]">CHAIN REACTOR</span>
          </h1>
          <p className="font-display text-xs tracking-[0.4em] text-neon-red">CHAOS OVERDRIVE · DEMO</p>
        </div>
        <div className="flex gap-3">
          <Stat label="BALANCE" value={fmt(balance)} />
          <Stat label="TOTAL BET" value={fmt(totalBet)} />
          <Stat label="LAST WIN" value={fmt(phase === "result" ? result?.totalWin ?? 0 : 0)} accent />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className={`font-display text-sm tracking-[0.3em] ${phase === "overdrive" ? "text-fire animate-pulse" : phase === "chaosball" ? "text-chaos animate-pulse" : "text-primary"}`}>
              {PHASE_LABEL[phase]}
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`flex h-8 w-8 items-center justify-center rounded-full border font-display text-xs ${drawn[i] ? "animate-pop border-primary bg-secondary text-foreground shadow-[0_0_10px_var(--neon-fuse)]" : "border-border text-muted-foreground"}`}>
                  {drawn[i] ?? ""}
                </div>
              ))}
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed ${result?.chaos && showWild ? "animate-pop border-chaos bg-chaos text-background" : "border-border text-muted-foreground"}`}>
                <Zap className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border border-border bg-card/60 p-3 shadow-[0_0_40px_-10px_var(--neon-fuse)] backdrop-blur">
            <div className="relative">
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
                  <Cell key={n} n={n} el={elements[n]} blue={blue.includes(n)} red={red.includes(n)} drawn={drawn.includes(n)} inChain={chainCells.has(n)} reacting={!!result} onClick={() => toggle(n)} />
                ))}
              </div>
              {result && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 500" preserveAspectRatio="none">
                  {edges.map((e, i) => {
                    const [r1, c1] = rc(e.a); const [r2, c2] = rc(e.b);
                    return (
                      <line key={i + e.kind} x1={c1 * 100 + 50} y1={r1 * 100 + 50} x2={c2 * 100 + 50} y2={r2 * 100 + 50}
                        stroke={EDGE_STROKE[e.kind]} strokeWidth={e.kind === "wild" ? 8 : 5} strokeLinecap="round"
                        strokeDasharray={e.kind === "chaos" ? "6 10" : undefined}
                        className="animate-arc" style={{ filter: `drop-shadow(0 0 6px ${EDGE_STROKE[e.kind]})`, animationDelay: `${i * 0.08}s` }} />
                    );
                  })}
                </svg>
              )}
            </div>

            {phase === "chaosball" && result?.chaos && (
              <Overlay>
                <div className="animate-zoomin text-center">
                  <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-chaos text-background shadow-[0_0_60px_var(--chaos)]"><Zap className="h-14 w-14" /></div>
                  <div className="font-display text-xs tracking-[0.5em] text-muted-foreground">11TH BALL</div>
                  <div className="font-display text-4xl font-black text-chaos">{CHAOS_LABEL[result.chaos]}</div>
                  <div className="mt-2 text-lg">{result.chaosNote}</div>
                </div>
              </Overlay>
            )}
            {phase === "overdrive" && result && (
              <Overlay>
                <div className="animate-zoomin text-center">
                  <div className="font-display text-sm tracking-[0.6em] text-fire">OVERDRIVE</div>
                  <div className="font-display text-6xl font-black text-foreground drop-shadow-[0_0_25px_var(--neon-fuse)] md:text-7xl">{fmt(result.totalWin)}</div>
                  <div className="mt-2 font-display text-neon-fuse">{result.totalBet ? `×${(result.totalWin / result.totalBet).toFixed(1)}` : ""} WIN REVEAL</div>
                </div>
              </Overlay>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Legend icon={<Flame className="h-4 w-4 text-fire" />} text="FIRE: chain bonus ×2 per fire hit" />
            <Legend icon={<Snowflake className="h-4 w-4 text-ice" />} text="ICE: bridges one empty ICE gap" />
            <Legend icon={<Zap className="h-4 w-4 text-chaos" />} text="CHAOS: links isolated hit to nearest chain" />
          </div>

          {phase === "result" && result && <Summary r={result} />}
        </section>

        <aside className="space-y-4">
          <Panel title="CHOOSE YOUR SIDE">
            <div className="grid grid-cols-2 gap-2">
              {(["blue", "red"] as const).map((s) => {
                const list = s === "blue" ? blue : red;
                const active = side === s;
                const col = s === "blue" ? "border-neon-blue text-neon-blue" : "border-neon-red text-neon-red";
                return (
                  <button key={s} onClick={() => setSide(s)} className={`rounded-lg border-2 p-3 text-left transition ${active ? `${col} bg-secondary shadow-[0_0_18px_-4px_currentColor]` : "border-border text-muted-foreground"}`}>
                    <div className="font-display text-sm font-bold">{s.toUpperCase()}</div>
                    <div className="text-xs">{list.length}/{MAX_PICKS} picks</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <SmallBtn onClick={() => { if (!busy) { side === "blue" ? setBlue(randomPicks(6)) : setRed(randomPicks(6)); if (phase === "result") nextRound(false); } }}><Shuffle className="h-3.5 w-3.5" /> Random {side}</SmallBtn>
              <SmallBtn onClick={() => { if (!busy) { setBlue([]); setRed([]); } }}><Trash2 className="h-3.5 w-3.5" /> Clear</SmallBtn>
            </div>
          </Panel>

          <Panel title="SMART PRESETS">
            <div className="space-y-2">
              <PresetBtn onClick={() => preset("mirror")} name="FULL MIRROR" tag="High volatility" desc="Same 10 numbers on Blue & Red" />
              <PresetBtn onClick={() => preset("split")} name="SPLIT / DIVIDE" tag="Balanced" desc="Blue left half, Red right half" />
              <PresetBtn onClick={() => preset("hunter")} name="ELEMENT HUNTER" tag="Tactical" desc="Targets active Fire & Ice cells" />
            </div>
          </Panel>

          <Panel title="STAKE PER SIDE">
            <div className="grid grid-cols-6 gap-1">
              {STAKES.map((s) => (
                <button key={s} disabled={busy} onClick={() => setStake(s)} className={`rounded-md border py-1.5 font-display text-xs ${stake === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>{s}</button>
              ))}
            </div>
          </Panel>

          {phase === "result" ? (
            <button onClick={() => nextRound()} className="w-full rounded-xl border-2 border-primary py-4 font-display text-lg font-black tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground">
              NEXT ROUND
            </button>
          ) : (
            <button onClick={play} disabled={!canPlay} className="w-full rounded-xl bg-gradient-to-r from-neon-blue via-neon-fuse to-neon-red py-4 font-display text-lg font-black tracking-widest text-background shadow-[0_0_30px_-5px_var(--neon-fuse)] transition hover:brightness-110 disabled:opacity-40">
              {busy ? "REACTING…" : balance < totalBet ? "NO BALANCE" : `PLAY · ${fmt(totalBet)}`}
            </button>
          )}

          <Panel title="TEST TOOLS">
            <label className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Gauge className="h-4 w-4" /> Turbo mode</span>
              <input type="checkbox" checked={turbo} onChange={(e) => setTurbo(e.target.checked)} className="h-4 w-4 accent-primary" />
            </label>
            <div className="mt-3 text-sm">
              <div className="mb-1 flex items-center gap-2"><Sparkles className="h-4 w-4 text-chaos" /> Force Chaos Ball</div>
              <div className="grid grid-cols-5 gap-1">
                {(["off", "random", "link", "echo", "dual"] as const).map((f) => (
                  <button key={f} onClick={() => setForce(f)} className={`rounded border py-1 text-xs uppercase ${force === f ? "border-chaos bg-chaos text-background" : "border-border"}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <SmallBtn onClick={() => !busy && setElements(genElements())}>Reroll elements</SmallBtn>
              <SmallBtn onClick={() => setBalance(1000)}>Reset balance</SmallBtn>
            </div>
          </Panel>

          {history.length > 0 && (
            <Panel title="HISTORY">
              <div className="space-y-1 text-sm">
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">bet {fmt(h.bet)}{h.chaos && <span className="ml-1 text-chaos">★</span>}</span>
                    <span className={h.win > h.bet ? "text-chaos" : h.win > 0 ? "text-foreground" : "text-muted-foreground"}>{fmt(h.win)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function Cell({ n, el, blue, red, drawn, inChain, reacting, onClick }: { n: number; el: Element | undefined; blue: boolean; red: boolean; drawn: boolean; inChain: boolean; reacting: boolean; onClick: () => void }) {
  const hitB = blue && drawn, hitR = red && drawn;
  const dual = hitB && hitR;
  const Icon = el ? EL_ICON[el] : null;
  let cls = "border-border bg-cell text-muted-foreground hover:border-primary/60";
  if (dual) cls = "border-neon-fuse bg-neon-fuse text-background shadow-[0_0_24px_var(--neon-fuse)] animate-pop";
  else if (hitB) cls = "border-neon-blue bg-neon-blue text-background shadow-[0_0_20px_var(--neon-blue)] animate-pop";
  else if (hitR) cls = "border-neon-red bg-neon-red text-background shadow-[0_0_20px_var(--neon-red)] animate-pop";
  else if (blue && red) cls = "border-neon-fuse bg-cell text-foreground ring-2 ring-neon-blue ring-offset-2 ring-offset-neon-red";
  else if (blue) cls = "border-neon-blue bg-cell text-neon-blue";
  else if (red) cls = "border-neon-red bg-cell text-neon-red";
  if (drawn && !blue && !red) cls = "border-border bg-secondary text-foreground/70 line-through";
  return (
    <button onClick={onClick} className={`relative flex aspect-square items-center justify-center rounded-lg border-2 font-display text-lg font-bold transition-all md:text-2xl ${cls} ${reacting && (blue || red) && drawn && !inChain ? "opacity-70" : ""} ${inChain ? "z-10 scale-105" : ""}`}>
      {n}
      {Icon && el && <Icon className={`absolute right-1 top-1 h-3.5 w-3.5 md:h-4 md:w-4 ${hitB || hitR ? "text-background" : EL_TEXT[el]}`} />}
      {el && !drawn && <span className={`absolute inset-x-2 bottom-1 h-0.5 rounded ${el === "fire" ? "bg-fire" : el === "ice" ? "bg-ice" : "bg-chaos"}`} />}
    </button>
  );
}

function Summary({ r }: { r: Result }) {
  const bp = (picks: number, hits: number) => basePay(picks, hits);
  const nb = r.blueHits.length, nr = r.redHits.length;
  return (
    <div className="mt-5 rounded-2xl border border-border bg-card/70 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-sm tracking-[0.3em] text-primary">ROUND SUMMARY</h3>
        <div className="font-display text-2xl font-black">{fmt(r.totalWin)} <span className="text-sm text-muted-foreground">/ bet {fmt(r.totalBet)}</span></div>
      </div>
      <div className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
        <Row k={<span className="text-neon-blue">Blue hits {nb}</span>} v={fmt(r.bluePay)} />
        <Row k={<span className="text-neon-red">Red hits {nr}</span>} v={fmt(r.redPay)} />
        <Row k={<span className="text-neon-fuse">Dual hits {r.dualHits.length} {r.dualHits.length ? `(${r.dualHits.join(", ")})` : ""}</span>} v="" />
        <Row k={<span>Isolated hits {r.isolated.length}</span>} v="" />
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {r.chains.length === 0 && <div className="text-muted-foreground">No chains formed.</div>}
        {r.chains.map((c, i) => (
          <Row key={i} k={<span>Chain L{c.length} [{c.cells.join("·")}] — base {c.base}×{c.duals ? ` · dual +${c.duals * 50}%` : ""}{c.fires ? <span className="text-fire"> · fire ×{c.fireMult}</span> : ""}{c.iceBridges ? <span className="text-ice"> · {c.iceBridges} ice bridge</span> : ""}{c.echo > 1 ? <span className="text-chaos"> · echo ×{c.echo}</span> : ""}</span>} v={fmt(c.bonus)} />
        ))}
        {r.chaos && <Row k={<span className="text-chaos">★ {CHAOS_LABEL[r.chaos]}: {r.chaosNote}</span>} v={fmt(r.chaosBonus)} />}
      </div>
      <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
        Base {fmt(r.bluePay + r.redPay)} + chains {fmt(r.chainBonus)} + chaos {fmt(r.chaosBonus)} = <span className="text-foreground">{fmt(r.totalWin)}</span>
        {" · "}Paytable 10-pick: 5 hits ×{bp(10, 5)}, 6 hits ×{bp(10, 6)}
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: React.ReactNode; v: string }) => (
  <div className="flex justify-between gap-3"><span>{k}</span><span className="font-display">{v}</span></div>
);
const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="rounded-xl border border-border bg-card/70 px-4 py-2 text-right">
    <div className="text-[10px] tracking-[0.3em] text-muted-foreground">{label}</div>
    <div className={`font-display text-lg font-bold ${accent ? "text-chaos" : ""}`}>{value}</div>
  </div>
);
const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card/70 p-4">
    <div className="mb-3 font-display text-[11px] tracking-[0.3em] text-muted-foreground">{title}</div>
    {children}
  </div>
);
const SmallBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs hover:bg-accent">{children}</button>
);
const PresetBtn = ({ onClick, name, tag, desc }: { onClick: () => void; name: string; tag: string; desc: string }) => (
  <button onClick={onClick} className="w-full rounded-lg border border-border p-2.5 text-left transition hover:border-primary hover:bg-accent">
    <div className="flex justify-between"><span className="font-display text-xs font-bold">{name}</span><span className="text-xs text-primary">{tag}</span></div>
    <div className="text-xs text-muted-foreground">{desc}</div>
  </button>
);
const Legend = ({ icon, text }: { icon: React.ReactNode; text: string }) => <span className="flex items-center gap-1.5">{icon}{text}</span>;
const Overlay = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">{children}</div>
);
