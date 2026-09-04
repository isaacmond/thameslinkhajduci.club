import { describe, expect, it } from "vitest";
import { MEMBERS, memberFor, mergeMembers, ownerOf, validEmail } from "@/lib/members";

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

describe("merging the admin-managed list", () => {
  it("adds addresses to a known player and appends unknown players", () => {
    const merged = mergeMembers(MEMBERS, [{ player: "phil knott", emails: ["Phil.Work@Example.com"] }, { player: "Max Cobain", emails: ["maxcobain@live.com"] }]);
    expect(memberFor("phil.work@example.com", merged)?.player).toBe("Phil Knott");
    expect(memberFor("philknott1997@hotmail.com", merged)?.player).toBe("Phil Knott");
    expect(memberFor("MaxCobain@live.com", merged)?.player).toBe("Max Cobain");
    expect(merged.length).toBe(MEMBERS.length + 1);
  });
  it("does not duplicate an address already present and never drops admin", () => {
    const merged = mergeMembers(MEMBERS, [{ player: "Isaac Mond", emails: ["ISAACJLMOND@gmail.com"] }]);
    expect(merged.find((m) => m.player === "Isaac Mond")!.emails.length).toBe(2);
    expect(merged.find((m) => m.player === "Isaac Mond")!.admin).toBe(true);
  });
  it("knows who already owns an address, and what counts as an address", () => {
    expect(ownerOf("philknott1997@hotmail.com", MEMBERS)).toBe("Phil Knott");
    expect(ownerOf("nobody@example.com", MEMBERS)).toBeNull();
    expect(validEmail("maxcobain@live.com")).toBe(true);
    expect(validEmail("max@live")).toBe(false);
    expect(validEmail("not an email")).toBe(false);
  });
});
