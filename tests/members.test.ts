import { describe, expect, it } from "vitest";
import { groupMembers, memberFor, ownerOf, validEmail, type Member } from "@/lib/members";

const members: Member[] = [
  { player: "Isaac Mond", emails: ["sacdpuntas@gmail.com", "isaacjlmond@gmail.com"], admin: true },
  { player: "Phil Knott", emails: ["philknott1997@hotmail.com"] },
];

describe("members", () => {
  it("matches an address regardless of case and whitespace", () => {
    expect(memberFor("  PhilKnott1997@Hotmail.com ", members)?.player).toBe("Phil Knott");
    expect(memberFor("isaacjlmond@gmail.com", members)?.admin).toBe(true);
  });
  it("lets one player have several addresses", () => {
    for (const e of members[0].emails) expect(memberFor(e, members)?.player).toBe("Isaac Mond");
  });
  it("rejects anyone else, including near misses and blanks", () => {
    expect(memberFor("philknott1997@hotmail.co.uk", members)).toBeNull();
    expect(memberFor("", members)).toBeNull();
    expect(memberFor(null, members)).toBeNull();
    expect(memberFor("someone@example.com", [])).toBeNull();
  });
  it("groups database rows into one member per player, lower-cased and de-duplicated, admin if any row is", () => {
    const grouped = groupMembers([
      { email: "MaxCobain@live.com", player: "Max Cobain", admin: false },
      { email: "isaacjlmond@gmail.com", player: "Isaac Mond", admin: false },
      { email: "sacdpuntas@gmail.com", player: "Isaac Mond", admin: true },
      { email: "ISAACJLMOND@gmail.com", player: "Isaac Mond", admin: false },
    ]);
    expect(grouped.map((m) => m.player)).toEqual(["Isaac Mond", "Max Cobain"]);
    expect(grouped[0]).toEqual({ player: "Isaac Mond", emails: ["isaacjlmond@gmail.com", "sacdpuntas@gmail.com"], admin: true });
    expect(grouped[1].admin).toBeUndefined();
  });
  it("knows who already owns an address, and what counts as an address", () => {
    expect(ownerOf("philknott1997@hotmail.com", members)).toBe("Phil Knott");
    expect(ownerOf("nobody@example.com", members)).toBeNull();
    expect(validEmail("maxcobain@live.com")).toBe(true);
    expect(validEmail("max@live")).toBe(false);
    expect(validEmail("not an email")).toBe(false);
  });
});
