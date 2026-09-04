import { revalidatePath, revalidateTag } from "next/cache";
import type { Built } from "./submissions";
import { addPlayer, recordPayment, recordScore, type PaymentChange, type PlayerChange, type ScoreChange } from "./writes";

/** Write a change to the records and purge every cached page. Members' submissions and the admin's approvals both land here. */
export async function applyChange(built: Pick<Built, "kind" | "change">, by: string) {
  if (built.kind === "score") await recordScore(built.change as ScoreChange, by);
  else if (built.kind === "payment") await recordPayment(built.change as PaymentChange, by);
  else await addPlayer(built.change as PlayerChange, by);
  purge();
}
export function purge() {
  revalidateTag("sheet", { expire: 0 });
  revalidatePath("/", "layout");
}
