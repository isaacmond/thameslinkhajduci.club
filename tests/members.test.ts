import { describe, expect, it } from "vitest";
import { MEMBERS, memberFor } from "@/lib/members";

describe("members allowlist", () => {
  it("matches an address regardless of case and whitespace", () => {
    expect(memberFor("  PhilKnott1997@Hotmail.com ")?.player).toBe("Phil Knott");
    expect(memberFor("isaacjlmond@gmail.com")?.admin).toBe(true);
  });
  it("lets one player have several addresses", () => {
    const isaac = MEMBERS.find((m) => m.player === "Isaac Mond")!;
    expect(isaac.emails.length).toBeGreaterThan(1);
    for (const e of isaac.emails) expect(memberFor(e)?.player).toBe("Isaac Mond");
  });
  it("rejects anyone else, including near misses and blanks", () => {
    expect(memberFor("philknott1997@hotmail.co.uk")).toBeNull();
    expect(memberFor("someone@example.com")).toBeNull();
    expect(memberFor("")).toBeNull();
    expect(memberFor(null)).toBeNull();
  });
  it("accepts extra members passed in (the MEMBERS_JSON shape)", () => {
    const extra = [...MEMBERS, { player: "Seb Burgess", emails: ["seb@example.com"] }];
    expect(memberFor("SEB@example.com", extra)?.player).toBe("Seb Burgess");
  });
});
