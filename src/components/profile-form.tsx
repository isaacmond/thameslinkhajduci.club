"use client";
import { useActionState, useState } from "react";
import { Camera, Save } from "lucide-react";
import { saveProfile, type ProfileState } from "@/app/actions/profile";
import { FormStatus, inputClass, Switch } from "./controls";
import { PositionPicker } from "./position-picker";
import { btn } from "./button";
import { Avatar } from "./ui";

export type ProfileInitial = { player: string; email: string; firstName: string; lastName: string; nickname: string; positions: string[]; shirt: number | null; bio: string; photo: string | null; takenShirts: Record<string, string> };

/** The member's own details. Everything here lands on their players row in the records; first and last name go to WorkOS. */
export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, null);
  const [preview, setPreview] = useState<string | null>(initial.photo);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [shirt, setShirt] = useState(initial.shirt ? String(initial.shirt) : "");
  const clash = shirt && initial.takenShirts[shirt] && initial.takenShirts[shirt] !== initial.player ? initial.takenShirts[shirt] : null;
  const shown = state?.ok && state.photo !== undefined ? state.photo : preview;
  const label = "flex flex-col gap-1 text-xs text-muted";

  return (
    <form action={action} className="space-y-6">
      <div className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <div className="flex flex-col items-center gap-3 sm:w-40">
          <Avatar name={initial.player} photo={removePhoto ? undefined : shown ?? undefined} size={128} shirt={shirt ? Number(shirt) : null} />
          <label className={btn("secondary", "sm", "cursor-pointer")}>
            <Camera size={16} aria-hidden />{shown ? "Change photo" : "Add a photo"}
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPreview(URL.createObjectURL(f)); setRemovePhoto(false); } }} />
          </label>
          {shown && <Switch name="removePhoto" checked={removePhoto} onChange={setRemovePhoto} label="Remove photo" />}
          <p className="text-center text-[11px] text-muted">JPEG, PNG or WebP, up to 5 MB. Square crops look best.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm text-muted">Playing as <span className="text-ink">{initial.player}</span> · signed in as <span className="text-ink">{initial.email}</span>. Your name in the records is set by the admin; ask them if it needs changing.</p>
          <label className={label}><span className="eyebrow">First name</span><input name="firstName" defaultValue={initial.firstName} maxLength={40} autoComplete="given-name" className={inputClass} /></label>
          <label className={label}><span className="eyebrow">Last name</span><input name="lastName" defaultValue={initial.lastName} maxLength={40} autoComplete="family-name" className={inputClass} /></label>
          <label className={label}><span className="eyebrow">Nickname (optional)</span><input name="nickname" defaultValue={initial.nickname} maxLength={40} placeholder="What the group chat calls you" className={inputClass} /></label>
          <label className={label}>
            <span className="eyebrow">Shirt number (optional)</span>
            <input name="shirt" value={shirt} onChange={(e) => setShirt(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="1–99" className={`${inputClass} tabular`} />
            <span className="min-h-[1.25rem] text-[11px] text-muted">{clash ? <span className="text-loss">{clash} already wears {shirt}.</span> : "Shows on your card and page."}</span>
          </label>
          <PositionPicker defaultValue={initial.positions} className="sm:col-span-2" />
          <label className={`${label} sm:col-span-2`}><span className="eyebrow">Bio (optional)</span><textarea name="bio" defaultValue={initial.bio} maxLength={280} rows={3} placeholder="One or two lines for your player page." className={`${inputClass} min-h-[5rem] resize-y`} /></label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || Boolean(clash)} className={btn("primary", "md")}><Save size={16} aria-hidden />{pending ? "Saving…" : "Save changes"}</button>
        {state && <FormStatus tone={state.ok ? "ok" : "error"}>{state.message}</FormStatus>}
      </div>
    </form>
  );
}
