"use client";
import { useActionState, useState } from "react";
import { Camera, Save } from "lucide-react";
import { savePlayerAction, type ActionState } from "@/app/actions/admin";
import { FormStatus, inputClass, Select, Switch, fieldClass, hintClass } from "./controls";
import { PositionPicker } from "./position-picker";
import { btn } from "./button";
import { Avatar } from "./ui";

export type AdminPlayer = { name: string; nickname: string; positions: string[]; shirt: number | null; bio: string; photo: string | null };

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
  return (
    <form action={action} className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
      <input type="hidden" name="original" value={player.name} />
      <div className="flex flex-col items-center gap-3 sm:w-36">
        <Avatar name={player.name} photo={removePhoto ? undefined : preview ?? undefined} size={112} shirt={shirt ? Number(shirt) : null} />
        <label className={btn("secondary", "sm", "cursor-pointer")}>
          <Camera size={16} aria-hidden />{preview ? "Change photo" : "Add a photo"}
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPreview(URL.createObjectURL(f)); setRemovePhoto(false); } }} />
        </label>
        {preview && <Switch name="removePhoto" checked={removePhoto} onChange={setRemovePhoto} label="Remove photo" />}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={fieldClass}>
          <span className="eyebrow">Name</span>
          <input name="name" defaultValue={player.name} required minLength={2} maxLength={60} className={inputClass} />
          <span className={hintClass}>Changing it updates every match, payment and vote.</span>
        </label>
        <label className={fieldClass}><span className="eyebrow">Nickname (optional)</span><input name="nickname" defaultValue={player.nickname} maxLength={40} className={inputClass} /></label>
        <label className={fieldClass}>
          <span className="eyebrow">Shirt number (optional)</span>
          <input name="shirt" value={shirt} onChange={(e) => setShirt(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="1–99" className={`${inputClass} tabular`} />
          <span className={hintClass}>{clash ? <span className="text-loss">{clash} already wears {shirt}.</span> : null}</span>
        </label>
        <PositionPicker defaultValue={player.positions} />
        <label className={`${fieldClass} sm:col-span-2`}><span className="eyebrow">Bio (optional)</span><textarea name="bio" defaultValue={player.bio} maxLength={280} rows={2} className={`${inputClass} min-h-[4rem] resize-y`} /></label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending || Boolean(clash)} className={btn("primary")}><Save size={16} aria-hidden />{pending ? "Saving…" : "Save player"}</button>
          {state && <FormStatus tone={state.ok ? "ok" : "error"}>{state.message}</FormStatus>}
        </div>
      </div>
    </form>
  );
}
