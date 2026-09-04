"use client";
import { useActionState, useState } from "react";
import { Camera, Check, Save } from "lucide-react";
import { saveProfile, type ProfileState } from "@/app/actions/profile";
import { inputClass } from "./controls";
import { Avatar } from "./ui";

export type ProfileInitial = { player: string; email: string; firstName: string; lastName: string; nickname: string; positions: string[]; shirt: number | null; bio: string; photo: string | null; takenShirts: Record<string, string> };
const POSITIONS = [["GK", "Goalkeeper"], ["DEF", "Defender"], ["MID", "Midfielder"], ["FWD", "Forward"]] as const;

/** The member's own details. Everything here lands on their players row in the records; first and last name go to WorkOS. */
export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, null);
  const [preview, setPreview] = useState<string | null>(initial.photo);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [shirt, setShirt] = useState(initial.shirt ? String(initial.shirt) : "");
  const clash = shirt && initial.takenShirts[shirt] && initial.takenShirts[shirt] !== initial.player ? initial.takenShirts[shirt] : null;
  const shown = state?.ok && state.photo !== undefined ? state.photo : preview;
  const label = "flex flex-col gap-1 text-xs text-ash";

  return (
    <form action={action} className="space-y-6">
      <div className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <div className="flex flex-col items-center gap-3 sm:w-40">
          <Avatar name={initial.player} photo={removePhoto ? undefined : shown ?? undefined} size={128} shirt={shirt ? Number(shirt) : null} />
          <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-cream hover:bg-white/10">
            <Camera size={16} aria-hidden />{shown ? "Change photo" : "Add a photo"}
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPreview(URL.createObjectURL(f)); setRemovePhoto(false); } }} />
          </label>
          {shown && <label className="flex items-center gap-2 text-xs text-ash"><input type="checkbox" name="removePhoto" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} className="accent-mint" />Remove photo</label>}
          <p className="text-center text-[11px] text-ash">JPEG, PNG or WebP, up to 5 MB. Square crops look best.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm text-ash">Playing as <span className="text-cream">{initial.player}</span> · signed in as <span className="text-cream">{initial.email}</span>. Your name in the records is set by the admin; ask them if it needs changing.</p>
          <label className={label}><span className="eyebrow">First name</span><input name="firstName" defaultValue={initial.firstName} maxLength={40} autoComplete="given-name" className={inputClass} /></label>
          <label className={label}><span className="eyebrow">Last name</span><input name="lastName" defaultValue={initial.lastName} maxLength={40} autoComplete="family-name" className={inputClass} /></label>
          <label className={label}><span className="eyebrow">Nickname</span><input name="nickname" defaultValue={initial.nickname} maxLength={40} placeholder="What the group chat calls you" className={inputClass} /></label>
          <label className={label}>
            <span className="eyebrow">Shirt number</span>
            <input name="shirt" value={shirt} onChange={(e) => setShirt(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="1 to 99" className={`${inputClass} tabular`} />
            <span className="min-h-[1.25rem] text-[11px] text-ash">{clash ? <span className="text-gold">{clash} already wears {shirt}.</span> : "Optional. Shows on your card and page."}</span>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="eyebrow mb-1">Positions</legend>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map(([code, name]) => (
                <label key={code} className="chip focus-within:ring-2 focus-within:ring-mint/60 cursor-pointer hover:border-white/25 has-[:checked]:border-mint/60 has-[:checked]:bg-mint/15 has-[:checked]:text-mint-soft">
                  <input type="checkbox" name="positions" value={code} defaultChecked={initial.positions.includes(code)} className="sr-only" />{code} <span className="font-normal text-ash">{name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className={`${label} sm:col-span-2`}><span className="eyebrow">Bio</span><textarea name="bio" defaultValue={initial.bio} maxLength={280} rows={3} placeholder="One or two lines for your player page. Keep it printable." className={`${inputClass} min-h-[5rem] resize-y`} /></label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || Boolean(clash)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-mint px-5 py-3 font-semibold text-night transition-colors hover:bg-mint-soft disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} aria-hidden />{pending ? "Saving…" : "Save changes"}</button>
        {state && <p role="status" className={`inline-flex items-center gap-1.5 text-sm ${state.ok ? "text-mint-soft" : "text-loss-soft"}`}>{state.ok && <Check size={16} aria-hidden />}{state.message}</p>}
      </div>
    </form>
  );
}
