"use client";
import { useActionState, useState } from "react";
import { Camera, Check, Save } from "lucide-react";
import { savePlayerAction, type ActionState } from "@/app/actions/admin";
import { inputClass, Select } from "./controls";
import { btn } from "./button";
import { Avatar } from "./ui";

export type AdminPlayer = { name: string; nickname: string; positions: string[]; shirt: number | null; bio: string; photo: string | null };
const POSITIONS = [["GK", "Goalkeeper"], ["DEF", "Defender"], ["MID", "Midfielder"], ["FWD", "Forward"]] as const;

/** Pick any player and edit their details. A new name is carried through every match, payment and vote. */
export function PlayersAdmin({ players }: { players: AdminPlayer[] }) {
  const [selected, setSelected] = useState(players[0]?.name ?? "");
  const p = players.find((x) => x.name === selected);
  return (
    <div className="space-y-5">
      <Select label="Player" value={selected} onChange={setSelected} options={players.map((x) => ({ value: x.name, label: x.name }))} className="max-w-sm" />
      {p && <PlayerEditor key={p.name} player={p} takenShirts={Object.fromEntries(players.filter((x) => x.shirt !== null && x.name !== p.name).map((x) => [String(x.shirt), x.name]))} onRenamed={setSelected} />}
    </div>
  );
}

function PlayerEditor({ player, takenShirts, onRenamed }: { player: AdminPlayer; takenShirts: Record<string, string>; onRenamed: (name: string) => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const r = await savePlayerAction(prev, form);
    const name = String(form.get("name") ?? "").trim();
    if (r?.ok && name && name !== player.name) onRenamed(name);
    return r;
  }, null);
  const [preview, setPreview] = useState<string | null>(player.photo);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [shirt, setShirt] = useState(player.shirt ? String(player.shirt) : "");
  const clash = shirt ? takenShirts[shirt] : undefined;
  const label = "flex flex-col gap-1 text-xs text-muted";
  return (
    <form action={action} className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
      <input type="hidden" name="original" value={player.name} />
      <div className="flex flex-col items-center gap-3 sm:w-36">
        <Avatar name={player.name} photo={removePhoto ? undefined : preview ?? undefined} size={112} shirt={shirt ? Number(shirt) : null} />
        <label className={btn("secondary", "xs", "cursor-pointer")}>
          <Camera size={14} aria-hidden />{preview ? "Change photo" : "Add a photo"}
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPreview(URL.createObjectURL(f)); setRemovePhoto(false); } }} />
        </label>
        {preview && <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="removePhoto" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} className="accent-accent" />Remove photo</label>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          <span className="eyebrow">Name</span>
          <input name="name" defaultValue={player.name} required minLength={2} maxLength={60} className={inputClass} />
          <span className="text-[11px] text-muted">Changing it updates every match, payment and vote.</span>
        </label>
        <label className={label}><span className="eyebrow">Nickname</span><input name="nickname" defaultValue={player.nickname} maxLength={40} className={inputClass} /></label>
        <label className={label}>
          <span className="eyebrow">Shirt number</span>
          <input name="shirt" value={shirt} onChange={(e) => setShirt(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="1 to 99" className={`${inputClass} tabular`} />
          <span className="min-h-[1.25rem] text-[11px]">{clash ? <span className="text-loss">{clash} already wears {shirt}.</span> : <span className="text-muted">Optional</span>}</span>
        </label>
        <fieldset>
          <legend className="eyebrow mb-1">Positions</legend>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map(([code, name]) => (
              <label key={code} className="chip cursor-pointer bg-surface hover:border-ink/25 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper">
                <input type="checkbox" name="positions" value={code} defaultChecked={player.positions.includes(code)} className="sr-only" />{name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className={`${label} sm:col-span-2`}><span className="eyebrow">Bio</span><textarea name="bio" defaultValue={player.bio} maxLength={280} rows={2} className={`${inputClass} min-h-[4rem] resize-y`} /></label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending || Boolean(clash)} className={btn("primary")}><Save size={16} aria-hidden />{pending ? "Saving…" : "Save player"}</button>
          {state && <p role="status" className={`inline-flex items-center gap-1.5 text-sm ${state.ok ? "text-accent" : "text-loss"}`}>{state.ok && <Check size={16} aria-hidden />}{state.message}</p>}
        </div>
      </div>
    </form>
  );
}
