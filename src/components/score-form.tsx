"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ClipboardList, Minus, Plus, Send } from "lucide-react";
import { MAX_RINGERS, pickRegulars } from "@/lib/ringers";
import { fmtDate, fmtMoney } from "@/lib/stats";
import { FormStatus, inputClass, Select, Switch, fieldClass } from "./controls";
import { btn } from "./button";
import { SummaryCard } from "./summary-card";
import { SubmissionResult, type SubmitResult } from "./submission-result";
import { SignedInNote, type SignedIn } from "./signed-in-note";
import { PollButton } from "./poll-button";
import { SectionTitle, Tick } from "./ui";

/**
 * `lineup` is who the records say played (roster players only); `ringers` how many outsiders played alongside them (a count, never names), with `ringerGoals`/`ringerAssists`; `expected` is the admin's team sheet, used to pre-tick names when there is no recorded line-up yet.
 * For a fixture typed Forfeit the line-up is the players charged for the pitch, and `matchCost` is what they split.
 * `priorApps` counts each roster player's appearances in the league games before this one that make up the ringer-levy window (nine when this game joins the window itself, `counted`; ten for a friendly), so the form can show which absent regulars pick up a ringer's share.
 */
export type SubmitFixture = { id: string; label: string; seasonId: string; gw: number; opponent: string; date: string | null; played: boolean; ourGoals: number | null; theirGoals: number | null; lineup: string[]; ringers: number; ringerGoals: number; ringerAssists: number; expected: string[]; scorers: Record<string, number>; assists: Record<string, number>; motm: string | null; type: string | null; matchCost: number; kickOff: string | null; priorApps: Record<string, number>; counted: boolean };

/** The recorded line-up when there is one, otherwise the team sheet: the best guess at who played. */
const startingLineup = (f: SubmitFixture | undefined) => (f ? (f.lineup.length ? f.lineup : f.expected) : []);
const sameSet = (a: Set<string>, b: string[]) => a.size === b.length && b.every((n) => a.has(n));
const isForfeit = (f: SubmitFixture | undefined) => /forfeit/i.test(f?.type ?? "");
/** The league's usual award when a side does not turn up. */
const AWARDED = { ours: 0, theirs: 8 };

function Counter({ value, onChange, max = 30, label }: { value: number; onChange: (v: number) => void; max?: number; label: string }) {
  return (
    <span className="flex h-control w-full max-w-[9rem] items-center justify-between rounded-lg border border-ink/15 bg-ink/5">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="focus-ring flex h-full items-center rounded-l-lg px-3 text-muted hover:text-ink"><Minus size={16} aria-hidden /></button>
      <span className="tabular w-8 text-center text-xl font-semibold leading-none text-ink" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="focus-ring flex h-full items-center rounded-r-lg px-3 text-muted hover:text-ink"><Plus size={16} aria-hidden /></button>
    </span>
  );
}

/** Short date for the board's time column ("4 Sep"), or "TBC" when the fixture has none. */
const shortDate = (iso: string | null) => fmtDate(iso, { day: "numeric", month: "short" });

export function ScoreForm({ fixtures, roster, initialMatch, webhook, signedIn = null }: { fixtures: SubmitFixture[]; roster: string[]; initialMatch?: string; webhook: boolean; signedIn?: SignedIn | null }) {
  const first = fixtures.find((f) => f.id === initialMatch) ?? fixtures.find((f) => !f.played) ?? fixtures[0];
  const [matchId, setMatchId] = useState(first?.id ?? "");
  const fx = fixtures.find((f) => f.id === matchId);
  const [forfeit, setForfeit] = useState(isForfeit(first));
  const [ours, setOurs] = useState(first?.ourGoals ?? 0);
  const [theirs, setTheirs] = useState(first?.theirGoals ?? 0);
  // For a forfeit the ticks mean "charged for the pitch", so a recorded forfeit keeps its payers and a new one starts with nobody on the hook.
  const [played, setPlayed] = useState<Set<string>>(new Set(isForfeit(first) ? first?.lineup : startingLineup(first)));
  const [ringers, setRingers] = useState(isForfeit(first) ? 0 : first?.ringers ?? 0);
  const [ringerGoals, setRingerGoals] = useState(isForfeit(first) ? 0 : first?.ringerGoals ?? 0);
  const [ringerAssists, setRingerAssists] = useState(isForfeit(first) ? 0 : first?.ringerAssists ?? 0);
  /** The night's ringers from a fixture, or none (a forfeit, or nothing recorded). */
  const resetRingers = (f: SubmitFixture | undefined) => { const keep = f && !isForfeit(f); setRingers(keep ? f.ringers : 0); setRingerGoals(keep ? f.ringerGoals : 0); setRingerAssists(keep ? f.ringerAssists : 0); };
  const [scorers, setScorers] = useState<Record<string, number>>(first?.scorers ?? {});
  const [assists, setAssists] = useState<Record<string, number>>(first?.assists ?? {});
  const [motm, setMotm] = useState(first?.motm ?? "");
  const [who, setWho] = useState(signedIn?.player ?? "");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const pick = (id: string) => { const f = fixtures.find((x) => x.id === id); setMatchId(id); setResult(null); if (f) { const ff = isForfeit(f); setForfeit(ff); setOurs(f.ourGoals ?? 0); setTheirs(f.theirGoals ?? 0); setPlayed(new Set(ff ? f.lineup : startingLineup(f))); resetRingers(f); setScorers(f.scorers); setAssists(f.assists); setMotm(f.motm ?? ""); } };
  /** Flipping to a forfeit clears the football (scorers, assists, MOTM) and starts the bill from the recorded payers or nobody; flipping back restores the fixture's line-up. */
  const toggleForfeit = (on: boolean) => {
    setForfeit(on); setScorers({}); setAssists({}); setMotm(""); resetRingers(on ? undefined : fx);
    if (on) { const recorded = isForfeit(fx) && fx!.played; setOurs(recorded ? fx!.ourGoals ?? AWARDED.ours : AWARDED.ours); setTheirs(recorded ? fx!.theirGoals ?? AWARDED.theirs : AWARDED.theirs); setPlayed(new Set(isForfeit(fx) ? fx!.lineup : [])); }
    else { setOurs(fx?.ourGoals ?? 0); setTheirs(fx?.theirGoals ?? 0); setPlayed(new Set(startingLineup(fx))); if (fx && !isForfeit(fx)) { setScorers(fx.scorers); setAssists(fx.assists); setMotm(fx.motm ?? ""); } }
  };
  const goalsLogged = useMemo(() => Object.values(scorers).reduce((a, b) => a + b, ringerGoals), [scorers, ringerGoals]);
  const assistsLogged = useMemo(() => Object.values(assists).reduce((a, b) => a + b, ringerAssists), [assists, ringerAssists]);
  const togglePlayed = (n: string) => setPlayed((s) => { const next = new Set(s); if (next.has(n)) { next.delete(n); setScorers((sc) => { const c = { ...sc }; delete c[n]; return c; }); setAssists((as) => { const c = { ...as }; delete c[n]; return c; }); } else next.add(n); return next; });
  const setCount = (map: Record<string, number>, set: (m: Record<string, number>) => void, n: string, v: number) => { const c = { ...map }; if (v <= 0) delete c[n]; else c[n] = v; set(c); if (v > 0) setPlayed((s) => new Set(s).add(n)); };
  /** No ringers, no ringer goals or assists. */
  const setRingerCount = (n: number) => { setRingers(n); if (!n) { setRingerGoals(0); setRingerAssists(0); } };
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
      const r = await fetch("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ match: fx.id, ours, theirs, scorers: forfeit ? {} : scorers, assists: forfeit ? {} : assists, played: [...played], ringers: forfeit ? 0 : ringers, ringerGoals: forfeit ? 0 : ringerGoals, ringerAssists: forfeit ? 0 : ringerAssists, motm: forfeit ? null : motm || null, forfeit, submittedBy: who, note, website }) });
      setResult((await r.json()) as SubmitResult);
    } catch { setResult({ ok: false, error: "Couldn't reach the server. Try again." }); }
    setBusy(false);
  };
  const playedList = roster.filter((n) => played.has(n));
  // Who picks up the ringers' share: the regulars over the last ten league games who are not on the pitch tonight.
  const heads = played.size + ringers;
  const levyCounts: Record<string, number> = { ...(fx?.priorApps ?? {}) };
  for (const n of played) delete levyCounts[n];
  const regulars = ringers ? pickRegulars(levyCounts) : [];
  const perHead = heads > 0 ? (fx?.matchCost ?? 0) / heads : 0;
  const levyTotal = perHead * ringers, levyEach = regulars.length ? levyTotal / regulars.length : 0;
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
      <SubmissionResult result={result} onEdit={() => setResult(null)} extra={nextUp && <PollButton fixture={nextUp} label={`Ask who's playing ${nextUp.seasonId === "FR" ? "the friendly" : `GW${nextUp.gw}`} v ${nextUp.opponent}`} size="sm" />}>
        {fx && <SummaryCard className="mt-4" label={`${fx.seasonId === "FR" ? "Friendly" : `${fx.seasonId} · GW${fx.gw}`} · ${shortDate(fx.date)}`} title={forfeit ? `Forfeit v ${fx.opponent}` : `Hajduci ${ours}–${theirs} ${fx.opponent}`} detail={result.applied ? "Recorded" : "Waiting for the admin to approve"} />}
      </SubmissionResult>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="card card-pad grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <Select label="Fixture" value={matchId} onChange={pick} options={fixtures.map((f) => ({ value: f.id, label: f.label }))} className="min-w-0" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 text-xs sm:gap-4">
          <div className="min-w-0"><p className="eyebrow mb-1 truncate">Hajduci</p><Counter value={ours} onChange={setOurs} label="Hajduci goals" /></div>
          <span className="flex h-control items-center text-2xl text-muted">–</span>
          <div className="min-w-0"><p className="eyebrow mb-1 truncate" title={fx?.opponent}>{fx?.opponent ?? "Them"}</p><Counter value={theirs} onChange={setTheirs} label="opponent goals" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 lg:col-span-2">
          <Switch checked={forfeit} onChange={toggleForfeit} label={<span className={clsx(forfeit && "text-ink")}>Forfeit, no match played</span>} />
          {forfeit && <p className="text-xs text-muted">Enter the score the league awarded, usually {AWARDED.theirs}–{AWARDED.ours}.</p>}
        </div>
        {fx?.played && <FormStatus tone="error" className="lg:col-span-2">This game already has {isForfeit(fx) ? "a forfeit" : "a score"} recorded{isForfeit(fx) ? "" : ` (${fx.ourGoals}–${fx.theirGoals})`}. This will replace it.</FormStatus>}
      </div>

      {forfeit ? (
        <div className="card card-pad">
          <SectionTitle sub={`Tick who shares the ${pitch > 0 ? `${fmtMoney(pitch)} ` : ""}pitch fee.`}>Pitch fees</SectionTitle>
          <p className={clsx("well mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-xs", played.size ? "text-ink/90" : "text-muted")} role="status">
            <span>{played.size ? <>{played.size} player{played.size === 1 ? "" : "s"}{pitch > 0 && <>, <span className="text-ink">{fmtMoney(each)} each</span></>}.</> : <>No one ticked{fx?.seasonId !== "FR" ? ", so the pitch stays with whoever paid for it" : ""}.</>}</span>
            {fx && fx.expected.length > 0 && !sameSet(played, fx.expected) && <button type="button" onClick={() => setPlayed(new Set(fx.expected))} className="focus-ring link ml-auto text-xs">Tick the whole team sheet</button>}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((n) => { const on = played.has(n); return (
              <li key={n} className={clsx("flex items-center gap-2 rounded-xl border pr-3 transition-colors", on ? "chip-on" : "chip-off border-ink/10")}>
                <button type="button" onClick={() => togglePlayed(n)} aria-pressed={on} className="focus-ring flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-xl py-2.5 pl-3 text-left text-sm hover:text-ink"><Tick on={on} /><span className="truncate">{n}</span></button>
                {on && pitch > 0 && <span className="tabular shrink-0 text-xs text-muted">{fmtMoney(each)}</span>}
              </li>); })}
          </ul>
        </div>
      ) : (
      <div className="card card-pad">
        <SectionTitle sub={<>Tap the players who played, then add goals and assists. {goalsLogged} of {ours} goals assigned.</>}>Line-up</SectionTitle>
        {fromSheet && (
          <p className="well mb-3 flex flex-wrap items-start gap-x-2 gap-y-1 px-3 py-2 text-xs text-ink/90" role="status">
            <span className="icon-line text-accent" aria-hidden><ClipboardList size={14} /></span>
            <span className="min-w-0 flex-1">{matchesSheet ? <>Ticked from the expected squad of {fx!.expected.length}. Untick anyone who didn&apos;t play.</> : <>Started from the expected squad of {fx!.expected.length}, since edited.</>}</span>
            {!matchesSheet && <button type="button" onClick={() => { setPlayed(new Set(fx!.expected)); setScorers({}); setAssists({}); setMotm(""); }} className="focus-ring link ml-auto text-xs">Reset to the expected squad</button>}
          </p>
        )}
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {roster.map((n) => { const on = played.has(n); return (
            <li key={n} className={clsx("flex items-center gap-2 rounded-xl border pr-3 transition-colors", on ? "chip-on" : "chip-off border-ink/10")}>
              <button type="button" onClick={() => togglePlayed(n)} aria-pressed={on} className="focus-ring flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-xl py-2.5 pl-3 text-left text-sm hover:text-ink"><Tick on={on} /><span className="truncate">{n}</span></button>
              {on && <span className="eyebrow eyebrow-sm flex shrink-0 items-center gap-1"><span>G</span><MiniCounter label={`goals for ${n}`} value={scorers[n] ?? 0} onChange={(v) => setCount(scorers, setScorers, n, v)} /><span className="ml-1">A</span><MiniCounter label={`assists for ${n}`} value={assists[n] ?? 0} onChange={(v) => setCount(assists, setAssists, n, v)} /></span>}
            </li>); })}
        </ul>
        <div className="mt-5 border-t border-ink/10 pt-4">
          <SectionTitle as="h3" size="sm" sub={<>How many players came from outside the squad, and what they scored. They don&apos;t pay; their share goes to the regulars who weren&apos;t playing.</>}>Ringers</SectionTitle>
          <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2", ringers ? "chip-on" : "chip-off border-ink/10")}>
            <span className="eyebrow eyebrow-sm flex items-center gap-1.5"><span>Ringers</span><MiniCounter label="ringers" value={ringers} max={MAX_RINGERS} onChange={setRingerCount} /></span>
            {ringers > 0 && <span className="eyebrow eyebrow-sm flex items-center gap-1"><span>G</span><MiniCounter label="goals by ringers" value={ringerGoals} onChange={setRingerGoals} /><span className="ml-1">A</span><MiniCounter label="assists by ringers" value={ringerAssists} onChange={setRingerAssists} /></span>}
          </div>
          {ringers > 0 && (
            <p className="well mt-3 px-3 py-2 text-xs text-ink/90" role="status">
              {heads} players{pitch > 0 && <>, {fmtMoney(perHead)} each</>}. The {ringers === 1 ? "ringer's" : `${ringers} ringers'`} {pitch > 0 ? fmtMoney(levyTotal) : "share"} {regulars.length ? <>is split between {regulars.length} regular{regulars.length === 1 ? "" : "s"} who {regulars.length === 1 ? "wasn't" : "weren't"} playing{pitch > 0 && <>, <span className="text-ink">{fmtMoney(levyEach)} each</span></>}: {regulars.join(", ")}.</> : <>stays with whoever paid for the pitch.</>}
            </p>
          )}
        </div>
      </div>
      )}

      <div className="card card-pad grid grid-cols-1 gap-4 sm:grid-cols-2">
        {forfeit ? <label className={fieldClass}><span className="eyebrow">Why (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputClass} /></label> : <Select label={fx?.seasonId === "FR" || fx?.type ? "Man of the match (optional)" : "Man of the match (optional, the players vote)"} value={motm} onChange={setMotm} options={[{ value: "", label: "Not chosen" }, ...(playedList.length ? playedList : roster).map((n) => ({ value: n, label: n }))]} />}
        {signedIn ? <SignedInNote signedIn={signedIn} /> : <label className={fieldClass}><span className="eyebrow">Your name</span><input value={who} onChange={(e) => setWho(e.target.value)} required maxLength={40} placeholder="Your name" className={inputClass} /></label>}
        {!forfeit && <label className={`${fieldClass} sm:col-span-2`}><span className="eyebrow">Comment (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="A line about the match" className={inputClass} /></label>}
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!canSubmit} className={btn("primary", "md")}><Send size={16} aria-hidden />{busy ? (signedIn?.direct ? "Recording…" : "Preparing…") : forfeit ? `${verb} the forfeit` : signedIn?.direct ? "Record the result" : webhook ? "Submit for approval" : "Prepare the request"}</button>
        {problems.length > 0 && <FormStatus tone="error">{problems[0]}</FormStatus>}
        {result && !result.ok && <FormStatus tone="error" role="alert">{result.error}</FormStatus>}
        <p className="ml-auto text-xs text-muted">{signedIn?.direct ? "Recorded straight away." : "Sent to the admin for approval."}</p>
      </div>
    </form>
  );
}


function MiniCounter({ label, value, onChange, max = 30 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  const btn = "focus-ring inline-flex items-center justify-center px-1.5 py-1 text-muted hover:text-ink [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:p-0";
  return (
    <span className="inline-flex items-center rounded-md border border-ink/15 bg-ink/5">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className={`${btn} rounded-l-md`}><Minus size={12} aria-hidden /></button>
      <span className="tabular w-5 text-center text-sm font-semibold tracking-normal text-ink">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className={`${btn} rounded-r-md`}><Plus size={12} aria-hidden /></button>
    </span>
  );
}
