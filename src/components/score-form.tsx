"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, Copy, ExternalLink, Minus, Plus, Send } from "lucide-react";
import { Select } from "./controls";

export type SubmitFixture = { id: string; label: string; seasonId: string; gw: number; opponent: string; date: string | null; played: boolean; ourGoals: number | null; theirGoals: number | null; lineup: string[]; scorers: Record<string, number>; assists: Record<string, number>; motm: string | null };
type Result = { ok: boolean; error?: string; sent?: boolean; summary?: string; text?: string; edits?: { cell: string; value: string | number; what: string }[]; tab?: string | null; sheetUrl?: string };

function Counter({ value, onChange, max = 30, label }: { value: number; onChange: (v: number) => void; max?: number; label: string }) {
  return (
    <span className="inline-flex w-full max-w-[9rem] items-center justify-between rounded-lg border border-white/15 bg-white/5">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="focus-ring rounded-l-lg px-3 py-2.5 text-ash hover:text-cream"><Minus size={16} aria-hidden /></button>
      <span className="display tabular w-8 text-center text-2xl text-cream" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="focus-ring rounded-r-lg px-3 py-2.5 text-ash hover:text-cream"><Plus size={16} aria-hidden /></button>
    </span>
  );
}

export function ScoreForm({ fixtures, roster, initialMatch, webhook }: { fixtures: SubmitFixture[]; roster: string[]; initialMatch?: string; webhook: boolean }) {
  const first = fixtures.find((f) => f.id === initialMatch) ?? fixtures.find((f) => !f.played) ?? fixtures[0];
  const [matchId, setMatchId] = useState(first?.id ?? "");
  const fx = fixtures.find((f) => f.id === matchId);
  const [ours, setOurs] = useState(first?.ourGoals ?? 0);
  const [theirs, setTheirs] = useState(first?.theirGoals ?? 0);
  const [played, setPlayed] = useState<Set<string>>(new Set(first?.lineup ?? []));
  const [scorers, setScorers] = useState<Record<string, number>>(first?.scorers ?? {});
  const [assists, setAssists] = useState<Record<string, number>>(first?.assists ?? {});
  const [motm, setMotm] = useState(first?.motm ?? "");
  const [who, setWho] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const pick = (id: string) => { const f = fixtures.find((x) => x.id === id); setMatchId(id); setResult(null); if (f) { setOurs(f.ourGoals ?? 0); setTheirs(f.theirGoals ?? 0); setPlayed(new Set(f.lineup)); setScorers(f.scorers); setAssists(f.assists); setMotm(f.motm ?? ""); } };
  const goalsLogged = useMemo(() => Object.values(scorers).reduce((a, b) => a + b, 0), [scorers]);
  const assistsLogged = useMemo(() => Object.values(assists).reduce((a, b) => a + b, 0), [assists]);
  const togglePlayed = (n: string) => setPlayed((s) => { const next = new Set(s); if (next.has(n)) { next.delete(n); setScorers((sc) => { const c = { ...sc }; delete c[n]; return c; }); setAssists((as) => { const c = { ...as }; delete c[n]; return c; }); } else next.add(n); return next; });
  const setCount = (map: Record<string, number>, set: (m: Record<string, number>) => void, n: string, v: number) => { const c = { ...map }; if (v <= 0) delete c[n]; else c[n] = v; set(c); if (v > 0) setPlayed((s) => new Set(s).add(n)); };
  const problems: string[] = [];
  if (goalsLogged > ours) problems.push(`Scorers add up to ${goalsLogged}, but we scored ${ours}.`);
  if (assistsLogged > ours) problems.push("More assists than goals.");
  if (who.trim().length < 2) problems.push("Add your name.");
  if (!fx) problems.push("Pick a fixture.");
  const canSubmit = problems.length === 0 && !busy;

  const submit = async () => {
    if (!canSubmit || !fx) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ match: fx.id, ours, theirs, scorers, assists, played: [...played], motm: motm || null, submittedBy: who, note, website }) });
      setResult((await r.json()) as Result);
    } catch { setResult({ ok: false, error: "Couldn't reach the server. Try again." }); }
    setBusy(false);
  };
  const copy = async () => { if (!result?.text) return; try { await navigator.clipboard.writeText(result.text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  const playedList = roster.filter((n) => played.has(n));

  if (result?.ok) {
    return (
      <div className="card p-5 sm:p-6">
        <p className="eyebrow">{result.sent ? "Sent for approval" : "Ready to send"}</p>
        <h2 className="display mt-1 text-3xl text-cream">{result.summary}</h2>
        <p className="mt-2 text-sm text-ash">{result.sent ? "The admin has it and will update the records once it's checked. Nothing changes on the site until then." : "Nothing changes on the site until the admin approves it. Send the request on, or copy it, and they'll apply it in seconds."}</p>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-night/70 p-4 font-mono text-xs text-cream/90">{result.text}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(result.text ?? "")}`} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2.5 font-semibold text-night hover:bg-mint-soft"><Send size={16} aria-hidden />Send to the group chat</a>
          <button type="button" onClick={copy} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream hover:bg-white/10">{copied ? <Check size={16} className="text-mint-soft" aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? "Copied" : "Copy request"}</button>
          {result.sheetUrl && <a href={result.sheetUrl} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-cream hover:bg-white/10"><ExternalLink size={16} aria-hidden />Admin: open the records{result.tab ? ` (tab ${result.tab})` : ""}</a>}
          <button type="button" onClick={() => setResult(null)} className="focus-ring inline-flex items-center rounded-lg px-4 py-2.5 text-sm text-ash hover:text-cream">Edit</button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="card grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <Select label="Fixture" value={matchId} onChange={pick} options={fixtures.map((f) => ({ value: f.id, label: f.label }))} className="min-w-0" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 sm:gap-4">
          <div className="min-w-0"><p className="eyebrow mb-1 truncate">Hajduci</p><Counter value={ours} onChange={setOurs} label="Hajduci goals" /></div>
          <span className="display pb-2 text-3xl text-ash">–</span>
          <div className="min-w-0"><p className="eyebrow mb-1 truncate" title={fx?.opponent}>{fx?.opponent ?? "Them"}</p><Counter value={theirs} onChange={setTheirs} label="opponent goals" /></div>
        </div>
        {fx?.played && <p className="text-xs text-gold lg:col-span-2">This game already has a score ({fx.ourGoals}–{fx.theirGoals}). You&apos;re submitting a correction.</p>}
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="display text-2xl text-cream">Who played, who scored</h2><p className="text-xs text-ash">Tap a name to mark them as played, then add goals and assists. {goalsLogged}/{ours} goals accounted for.</p></div>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {roster.map((n) => { const on = played.has(n); return (
            <li key={n} className={clsx("flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors", on ? "border-mint/40 bg-mint/[0.08]" : "border-white/10")}>
              <button type="button" onClick={() => togglePlayed(n)} aria-pressed={on} className={clsx("focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-sm", on ? "text-cream" : "text-ash hover:text-cream")}><span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "border-mint bg-mint text-night" : "border-white/20")} aria-hidden>{on && <Check size={12} />}</span><span className="truncate">{n}</span></button>
              {on && <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-ash"><span>G</span><MiniCounter value={scorers[n] ?? 0} onChange={(v) => setCount(scorers, setScorers, n, v)} /><span className="ml-1">A</span><MiniCounter value={assists[n] ?? 0} onChange={(v) => setCount(assists, setAssists, n, v)} /></span>}
            </li>); })}
        </ul>
      </div>

      <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Select label="Man of the match (optional)" value={motm} onChange={setMotm} options={[{ value: "", label: "Nobody in particular" }, ...(playedList.length ? playedList : roster).map((n) => ({ value: n, label: n }))]} />
        <label className="flex flex-col gap-1 text-xs text-ash"><span className="eyebrow">Your name</span><input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={40} placeholder="So the admin knows who to blame" className="focus-ring rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-ash/60" /></label>
        <label className="flex flex-col gap-1 text-xs text-ash sm:col-span-2"><span className="eyebrow">Comment (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Anything worth remembering. Keep it clean-ish." className="focus-ring rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-ash/60" /></label>
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSubmit} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-mint px-5 py-3 font-semibold text-night transition-colors hover:bg-mint-soft disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} aria-hidden />{busy ? "Preparing…" : webhook ? "Submit for approval" : "Prepare the request"}</button>
        {problems.length > 0 && <p className="text-xs text-gold" role="status">{problems[0]}</p>}
        {result && !result.ok && <p className="text-xs text-[#ff9a9d]" role="alert">{result.error}</p>}
        <p className="ml-auto text-xs text-ash">Nothing is saved by this page. <Link href="/data" className="link">How the records work →</Link></p>
      </div>
    </form>
  );
}

function MiniCounter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/15 bg-white/5">
      <button type="button" aria-label="Fewer" onClick={() => onChange(Math.max(0, value - 1))} className="focus-ring rounded-l-md px-1.5 py-1 text-ash hover:text-cream"><Minus size={12} aria-hidden /></button>
      <span className="tabular w-5 text-center text-sm font-semibold text-cream">{value}</span>
      <button type="button" aria-label="More" onClick={() => onChange(Math.min(30, value + 1))} className="focus-ring rounded-r-md px-1.5 py-1 text-ash hover:text-cream"><Plus size={12} aria-hidden /></button>
    </span>
  );
}
