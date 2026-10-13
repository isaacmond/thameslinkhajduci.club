"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, ClipboardList, Minus, Plus, Send, UserPlus, X } from "lucide-react";
import { pickRegulars } from "@/lib/ringers";
import { inputClass, Select, Switch } from "./controls";
import { btn } from "./button";
import { SummaryCard } from "./summary-card";
import { SubmissionResult, type SubmitResult } from "./submission-result";
import { SignedInNote, type SignedIn } from "./signed-in-note";
import { PollButton } from "./poll-button";

/**
 * `lineup` is who the records say played (roster players only); `ringers` the outsiders recorded alongside them; `expected` is the admin's team sheet, used to pre-tick names when there is no recorded line-up yet.
 * For a fixture typed Forfeit the line-up is the players charged for the pitch, and `matchCost` is what they split.
 * `priorApps` counts each roster player's appearances in the league games before this one that make up the ringer-levy window (nine when this game joins the window itself, `counted`; ten for a friendly), so the form can show which absent regulars pick up a ringer's share.
 */
export type SubmitFixture = { id: string; label: string; seasonId: string; gw: number; opponent: string; date: string | null; played: boolean; ourGoals: number | null; theirGoals: number | null; lineup: string[]; ringers: string[]; expected: string[]; scorers: Record<string, number>; assists: Record<string, number>; motm: string | null; type: string | null; matchCost: number; kickOff: string | null; priorApps: Record<string, number>; counted: boolean };

/** The recorded line-up when there is one, otherwise the team sheet: the best guess at who played. */
const startingLineup = (f: SubmitFixture | undefined) => (f ? (f.lineup.length ? f.lineup : f.expected) : []);
const sameSet = (a: Set<string>, b: string[]) => a.size === b.length && b.every((n) => a.has(n));
const isForfeit = (f: SubmitFixture | undefined) => /forfeit/i.test(f?.type ?? "");
/** The league's usual award when a side does not turn up. */
const AWARDED = { ours: 0, theirs: 8 };
const pounds = (n: number) => `£${n.toFixed(2)}`;

function Counter({ value, onChange, max = 30, label }: { value: number; onChange: (v: number) => void; max?: number; label: string }) {
  return (
    <span className="flex h-[38px] w-full max-w-[9rem] items-center justify-between rounded-lg border border-ink/15 bg-ink/5">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="focus-ring flex h-full items-center rounded-l-lg px-3 text-muted hover:text-ink"><Minus size={16} aria-hidden /></button>
      <span className="display tabular w-8 text-center text-2xl leading-none translate-y-[0.05em] text-ink" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="focus-ring flex h-full items-center rounded-r-lg px-3 text-muted hover:text-ink"><Plus size={16} aria-hidden /></button>
    </span>
  );
}

/** Short date for the board's time column ("4 Sept"), or a shrug when the fixture has none. */
const shortDate = (iso: string | null) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "TBC");

export function ScoreForm({ fixtures, roster, initialMatch, webhook, signedIn = null }: { fixtures: SubmitFixture[]; roster: string[]; initialMatch?: string; webhook: boolean; signedIn?: SignedIn | null }) {
  const first = fixtures.find((f) => f.id === initialMatch) ?? fixtures.find((f) => !f.played) ?? fixtures[0];
  const [matchId, setMatchId] = useState(first?.id ?? "");
  const fx = fixtures.find((f) => f.id === matchId);
  const [forfeit, setForfeit] = useState(isForfeit(first));
  const [ours, setOurs] = useState(first?.ourGoals ?? 0);
  const [theirs, setTheirs] = useState(first?.theirGoals ?? 0);
  // For a forfeit the ticks mean "charged for the pitch", so a recorded forfeit keeps its payers and a new one starts with nobody on the hook.
  const [played, setPlayed] = useState<Set<string>>(new Set(isForfeit(first) ? first?.lineup : startingLineup(first)));
  const [ringers, setRingers] = useState<string[]>(isForfeit(first) ? [] : first?.ringers ?? []);
  const [ringerName, setRingerName] = useState("");
  const [scorers, setScorers] = useState<Record<string, number>>(first?.scorers ?? {});
  const [assists, setAssists] = useState<Record<string, number>>(first?.assists ?? {});
  const [motm, setMotm] = useState(first?.motm ?? "");
  const [who, setWho] = useState(signedIn?.player ?? "");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const pick = (id: string) => { const f = fixtures.find((x) => x.id === id); setMatchId(id); setResult(null); if (f) { const ff = isForfeit(f); setForfeit(ff); setOurs(f.ourGoals ?? 0); setTheirs(f.theirGoals ?? 0); setPlayed(new Set(ff ? f.lineup : startingLineup(f))); setRingers(ff ? [] : f.ringers); setRingerName(""); setScorers(f.scorers); setAssists(f.assists); setMotm(f.motm ?? ""); } };
  /** Flipping to a forfeit clears the football (scorers, assists, MOTM) and starts the bill from the recorded payers or nobody; flipping back restores the fixture's line-up. */
  const toggleForfeit = (on: boolean) => {
    setForfeit(on); setScorers({}); setAssists({}); setMotm(""); setRingers(on ? [] : fx?.ringers ?? []); setRingerName("");
    if (on) { const recorded = isForfeit(fx) && fx!.played; setOurs(recorded ? fx!.ourGoals ?? AWARDED.ours : AWARDED.ours); setTheirs(recorded ? fx!.theirGoals ?? AWARDED.theirs : AWARDED.theirs); setPlayed(new Set(isForfeit(fx) ? fx!.lineup : [])); }
    else { setOurs(fx?.ourGoals ?? 0); setTheirs(fx?.theirGoals ?? 0); setPlayed(new Set(startingLineup(fx))); if (fx && !isForfeit(fx)) { setScorers(fx.scorers); setAssists(fx.assists); setMotm(fx.motm ?? ""); } }
  };
  const goalsLogged = useMemo(() => Object.values(scorers).reduce((a, b) => a + b, 0), [scorers]);
  const assistsLogged = useMemo(() => Object.values(assists).reduce((a, b) => a + b, 0), [assists]);
  const togglePlayed = (n: string) => setPlayed((s) => { const next = new Set(s); if (next.has(n)) { next.delete(n); setScorers((sc) => { const c = { ...sc }; delete c[n]; return c; }); setAssists((as) => { const c = { ...as }; delete c[n]; return c; }); } else next.add(n); return next; });
  const setCount = (map: Record<string, number>, set: (m: Record<string, number>) => void, n: string, v: number) => { const c = { ...map }; if (v <= 0) delete c[n]; else c[n] = v; set(c); if (v > 0 && !ringers.includes(n)) setPlayed((s) => new Set(s).add(n)); };
  const dropCounts = (n: string) => { setScorers((sc) => { const c = { ...sc }; delete c[n]; return c; }); setAssists((as) => { const c = { ...as }; delete c[n]; return c; }); };
  /** A ringer typed in: trimmed, one space between words; a roster name moves that player over to the ringers rather than listing them twice. */
  const addRinger = () => {
    const typed = ringerName.replace(/\s+/g, " ").trim();
    if (typed.length < 2) return;
    const onRoster = roster.find((r) => r.toLowerCase() === typed.toLowerCase());
    const name = onRoster ?? typed;
    if (ringers.some((r) => r.toLowerCase() === name.toLowerCase())) { setRingerName(""); return; }
    if (onRoster) setPlayed((s) => { const next = new Set(s); next.delete(onRoster); return next; });
    setRingers((r) => [...r, name]); setRingerName("");
  };
  const removeRinger = (n: string) => { setRingers((r) => r.filter((x) => x !== n)); dropCounts(n); if (motm === n) setMotm(""); };
  const problems: string[] = [];
  if (!forfeit && goalsLogged > ours) problems.push(`Scorers add up to ${goalsLogged}, but we scored ${ours}.`);
  if (!forfeit && assistsLogged > ours) problems.push("More assists than goals.");
  if (!signedIn && who.trim().length < 2) problems.push("Add your name.");
  if (!fx) problems.push("Pick a fixture.");
  const canSubmit = problems.length === 0 && !busy;

  const submit = async () => {
    if (!canSubmit || !fx) return;
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ match: fx.id, ours, theirs, scorers: forfeit ? {} : scorers, assists: forfeit ? {} : assists, played: [...played], ringers: forfeit ? [] : ringers, motm: forfeit ? null : motm || null, forfeit, submittedBy: who, note, website }) });
      setResult((await r.json()) as SubmitResult);
    } catch { setResult({ ok: false, error: "Couldn't reach the server. Try again." }); }
    setBusy(false);
  };
  const playedList = [...roster.filter((n) => played.has(n)), ...ringers];
  // Who picks up the ringers' share: the regulars over the last ten league games who are not on the pitch tonight.
  const heads = played.size + ringers.length;
  const levyCounts: Record<string, number> = { ...(fx?.priorApps ?? {}) };
  for (const n of played) delete levyCounts[n];
  const regulars = ringers.length ? pickRegulars(levyCounts) : [];
  const perHead = heads > 0 ? (fx?.matchCost ?? 0) / heads : 0;
  const levyTotal = perHead * ringers.length, levyEach = regulars.length ? levyTotal / regulars.length : 0;
  // The team sheet is a proposal: say where the ticks came from, and offer the way back once the reporter has changed them.
  const fromSheet = Boolean(fx && !forfeit && !fx.lineup.length && fx.expected.length);
  const matchesSheet = fromSheet && sameSet(played, fx!.expected);
  const pitch = fx?.matchCost ?? 0;
  const each = played.size > 0 ? pitch / played.size : 0;
  const verb = signedIn?.direct ? "Record" : webhook ? "Submit" : "Prepare";

  if (result?.ok) {
    // The game is in; the next job is finding out who is free for the one after it.
    const nextUp = fx ? fixtures.filter((f) => !f.played && !isForfeit(f) && f.id !== fx.id && (f.date ?? "9999") >= (fx.date ?? "")).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))[0] : undefined;
    return (
      <SubmissionResult result={result} onEdit={() => setResult(null)} extra={nextUp && <PollButton fixture={nextUp} label={`Ask who's playing ${nextUp.seasonId === "FR" ? "the friendly" : `GW${nextUp.gw}`} v ${nextUp.opponent}`} className="h-[2.375rem] px-4 text-sm" />}>
        {fx && <SummaryCard className="mt-4" label={`${fx.seasonId === "FR" ? "Friendly" : `${fx.seasonId} · GW${fx.gw}`} · ${shortDate(fx.date)}`} title={forfeit ? `Forfeit v ${fx.opponent}` : `Hajduci ${ours}–${theirs} ${fx.opponent}`} detail={result.applied ? "Recorded" : "Waiting for the admin to approve"} />}
      </SubmissionResult>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="card grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <Select label="Fixture" value={matchId} onChange={pick} options={fixtures.map((f) => ({ value: f.id, label: f.label }))} className="min-w-0" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 text-xs sm:gap-4">
          <div className="min-w-0"><p className="eyebrow mb-1 truncate">Hajduci</p><Counter value={ours} onChange={setOurs} label="Hajduci goals" /></div>
          <span className="display flex h-[38px] items-center text-3xl text-muted">–</span>
          <div className="min-w-0"><p className="eyebrow mb-1 truncate" title={fx?.opponent}>{fx?.opponent ?? "Them"}</p><Counter value={theirs} onChange={setTheirs} label="opponent goals" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 lg:col-span-2">
          <Switch checked={forfeit} onChange={toggleForfeit} label={<span className={clsx(forfeit && "text-ink")}>Forfeit, no match played</span>} />
          {forfeit && <p className="text-xs text-muted">Enter the score the league awarded, usually {AWARDED.theirs}–{AWARDED.ours}.</p>}
        </div>
        {fx?.played && <p className="text-xs text-gold lg:col-span-2">This game already has {isForfeit(fx) ? "a forfeit" : "a score"} recorded{isForfeit(fx) ? "" : ` (${fx.ourGoals}–${fx.theirGoals})`}. This will replace it.</p>}
      </div>

      {forfeit ? (
        <div className="card p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="display text-2xl leading-none text-ink">Pitch charges</h2><p className="text-xs text-muted">Tick who shares the {pitch > 0 ? pounds(pitch) : ""} pitch fee.</p></div>
          <p className={clsx("mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-xs", played.size ? "border-ink/10 bg-sunken/60 text-ink/90" : "border-ink/10 bg-sunken/40 text-muted")} role="status">
            <span>{played.size ? <>{played.size} player{played.size === 1 ? "" : "s"}{pitch > 0 && <>, <span className="text-ink">{pounds(each)} each</span></>}.</> : <>No one ticked{fx?.seasonId !== "FR" ? ", so the pitch stays with whoever booked it" : ""}.</>}</span>
            {fx && fx.expected.length > 0 && !sameSet(played, fx.expected) && <button type="button" onClick={() => setPlayed(new Set(fx.expected))} className="focus-ring link ml-auto text-xs">Tick the whole team sheet</button>}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((n) => { const on = played.has(n); return (
              <li key={n} className={clsx("flex items-center gap-2 rounded-xl border pr-3 transition-colors", on ? "border-accent/40 bg-accent/[0.06]" : "border-ink/10 bg-surface")}>
                <button type="button" onClick={() => togglePlayed(n)} aria-pressed={on} className={clsx("focus-ring flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-xl py-2.5 pl-3 text-left text-sm", on ? "text-ink" : "text-muted hover:text-ink")}><span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "border-accent bg-accent text-paper" : "border-ink/20")} aria-hidden>{on && <Check size={12} />}</span><span className="truncate">{n}</span></button>
                {on && pitch > 0 && <span className="tabular shrink-0 text-xs text-muted">{pounds(each)}</span>}
              </li>); })}
          </ul>
        </div>
      ) : (
      <div className="card p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="display text-2xl leading-none text-ink">Line-up</h2><p className="text-xs text-muted">Tap the players who played, then add goals and assists. {goalsLogged} of {ours} goals assigned.</p></div>
        {fromSheet && (
          <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-sunken/60 px-3 py-2 text-xs text-ink/90" role="status">
            <ClipboardList size={14} className="shrink-0 text-accent" aria-hidden />
            <span>{matchesSheet ? <>Ticked from the expected squad of {fx!.expected.length}. Untick anyone who didn&apos;t play.</> : <>Started from the expected squad of {fx!.expected.length}, since edited.</>}</span>
            {!matchesSheet && <button type="button" onClick={() => { setPlayed(new Set(fx!.expected)); setScorers({}); setAssists({}); setMotm(""); }} className="focus-ring link ml-auto text-xs">Reset to the expected squad</button>}
          </p>
        )}
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {roster.map((n) => { const on = played.has(n); return (
            <li key={n} className={clsx("flex items-center gap-2 rounded-xl border pr-3 transition-colors", on ? "border-accent/40 bg-accent/[0.06]" : "border-ink/10 bg-surface")}>
              <button type="button" onClick={() => togglePlayed(n)} aria-pressed={on} className={clsx("focus-ring flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-xl py-2.5 pl-3 text-left text-sm", on ? "text-ink" : "text-muted hover:text-ink")}><span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "border-accent bg-accent text-paper" : "border-ink/20")} aria-hidden>{on && <Check size={12} />}</span><span className="truncate">{n}</span></button>
              {on && <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted"><span>G</span><MiniCounter label={`goals for ${n}`} value={scorers[n] ?? 0} onChange={(v) => setCount(scorers, setScorers, n, v)} /><span className="ml-1">A</span><MiniCounter label={`assists for ${n}`} value={assists[n] ?? 0} onChange={(v) => setCount(assists, setAssists, n, v)} /></span>}
            </li>); })}
        </ul>
        <div className="mt-5 border-t border-ink/10 pt-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h3 className="display text-xl leading-none text-ink">Ringers</h3><p className="text-xs text-muted">Players from outside the squad. They don&apos;t pay; their share goes to the regulars who weren&apos;t playing.</p></div>
          {ringers.length > 0 && (
            <ul className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {ringers.map((n) => (
                <li key={n} className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/[0.06] px-3 py-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink"><span className="chip shrink-0 text-[10px] text-muted">Ringer</span><span className="truncate">{n}</span></span>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted"><span>G</span><MiniCounter label={`goals for ${n}`} value={scorers[n] ?? 0} onChange={(v) => setCount(scorers, setScorers, n, v)} /><span className="ml-1">A</span><MiniCounter label={`assists for ${n}`} value={assists[n] ?? 0} onChange={(v) => setCount(assists, setAssists, n, v)} /></span>
                  <button type="button" onClick={() => removeRinger(n)} aria-label={`Remove ${n}`} className="focus-ring shrink-0 rounded-md p-1 text-muted hover:text-ink"><X size={14} aria-hidden /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted"><span className="eyebrow">Ringer&apos;s name</span><input value={ringerName} onChange={(e) => setRingerName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRinger(); } }} maxLength={40} placeholder="Full name" className={inputClass} /></label>
            <button type="button" onClick={addRinger} disabled={ringerName.trim().length < 2 || ringers.length >= 4} className={btn("secondary", "sm")}><UserPlus size={14} aria-hidden />Add ringer</button>
          </div>
          {ringers.length > 0 && (
            <p className="mt-3 rounded-lg bg-sunken/60 px-3 py-2 text-xs text-ink/90" role="status">
              {heads} players{pitch > 0 && <>, {pounds(perHead)} each</>}. {ringers.join(", ")}{ringers.length === 1 ? "'s" : "'"} {pitch > 0 ? pounds(levyTotal) : "share"} {regulars.length ? <>is split between {regulars.length} regular{regulars.length === 1 ? "" : "s"} who {regulars.length === 1 ? "wasn\u2019t" : "weren\u2019t"} playing{pitch > 0 && <>, <span className="text-ink">{pounds(levyEach)} each</span></>}: {regulars.join(", ")}.</> : <>stays with whoever booked the pitch.</>}
            </p>
          )}
        </div>
      </div>
      )}

      <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {forfeit ? <label className="flex flex-col gap-1 text-xs text-muted"><span className="eyebrow">Why</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Optional" className={inputClass} /></label> : <Select label={fx?.seasonId === "FR" || fx?.type ? "Man of the match (optional)" : "Man of the match (optional, the players vote)"} value={motm} onChange={setMotm} options={[{ value: "", label: "Not chosen" }, ...(playedList.length ? playedList : roster).map((n) => ({ value: n, label: n }))]} />}
        {signedIn ? <SignedInNote signedIn={signedIn} /> : <label className="flex flex-col gap-1 text-xs text-muted"><span className="eyebrow">Your name</span><input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={40} placeholder="Your name" className={inputClass} /></label>}
        {!forfeit && <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2"><span className="eyebrow">Comment (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="A line about the match" className={inputClass} /></label>}
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSubmit} className={btn("primary", "md")}><Send size={16} aria-hidden />{busy ? (signedIn?.direct ? "Recording…" : "Preparing…") : forfeit ? `${verb} the forfeit` : signedIn?.direct ? "Record the result" : webhook ? "Submit for approval" : "Prepare the request"}</button>
        {problems.length > 0 && <p className="text-xs text-gold" role="status">{problems[0]}</p>}
        {result && !result.ok && <p className="text-xs text-loss" role="alert">{result.error}</p>}
        <p className="ml-auto text-xs text-muted">{signedIn?.direct ? "Recorded straight away." : "Sent to the admin for approval."}</p>
      </div>
    </form>
  );
}

function MiniCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const btn = "focus-ring inline-flex items-center justify-center px-1.5 py-1 text-muted hover:text-ink [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:p-0";
  return (
    <span className="inline-flex items-center rounded-md border border-ink/15 bg-ink/5">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className={`${btn} rounded-l-md`}><Minus size={12} aria-hidden /></button>
      <span className="tabular w-5 text-center text-sm font-semibold text-ink">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(30, value + 1))} className={`${btn} rounded-r-md`}><Plus size={12} aria-hidden /></button>
    </span>
  );
}
