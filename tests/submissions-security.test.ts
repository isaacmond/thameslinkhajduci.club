import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { sheetHealth } from "@/lib/health";
import { parseWorkbook, photoAllowed, rejectedPhotos } from "@/lib/sheet";
import { originAllowed } from "@/lib/submissions";

describe("originAllowed", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("accepts same-origin browser requests", () => {
    expect(originAllowed(h({ "sec-fetch-site": "same-origin", origin: "https://thameslinkhajduci.club", host: "thameslinkhajduci.club" }))).toBe(true);
    expect(originAllowed(h({ "sec-fetch-site": "none", origin: "https://thameslinkhajduci.club", "x-forwarded-host": "thameslinkhajduci.club", host: "lambda.internal" }))).toBe(true);
    expect(originAllowed(h({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(originAllowed(h({ origin: "https://ThamesLinkHajduci.club", "x-forwarded-host": "thameslinkhajduci.club" }))).toBe(true);
  });
  it("accepts requests that carry no browser provenance at all (curl, scripts)", () => {
    expect(originAllowed(h({ host: "thameslinkhajduci.club" }))).toBe(true);
    expect(originAllowed(h({}))).toBe(true);
  });
  it("refuses cross-site requests", () => {
    expect(originAllowed(h({ "sec-fetch-site": "cross-site", origin: "https://thameslinkhajduci.club", host: "thameslinkhajduci.club" }))).toBe(false);
    expect(originAllowed(h({ "sec-fetch-site": "same-site", host: "thameslinkhajduci.club" }))).toBe(false);
    expect(originAllowed(h({ origin: "https://evil.example", host: "thameslinkhajduci.club" }))).toBe(false);
    expect(originAllowed(h({ origin: "https://thameslinkhajduci.club.evil.example", host: "thameslinkhajduci.club" }))).toBe(false);
    expect(originAllowed(h({ origin: "http://localhost:3000", host: "localhost:3001" }))).toBe(false);
    expect(originAllowed(h({ origin: "null", host: "thameslinkhajduci.club" }))).toBe(false);
    expect(originAllowed(h({ origin: "not a url", host: "thameslinkhajduci.club" }))).toBe(false);
    expect(originAllowed(h({ origin: "https://thameslinkhajduci.club" }))).toBe(false); // nothing to compare against
  });
});

describe("photoAllowed", () => {
  it("takes bundled player files and https links only", () => {
    for (const s of ["/players/seb-burgess.jpg", "/players/x-1.jpeg", "/players/a.png", "/players/a.webp", "https://example.com/p.jpg"]) expect(photoAllowed(s)).toBe(true);
    for (const s of ["/players/../../etc/passwd", "/players/Seb.jpg", "/crest.png", "players/a.jpg", "http://example.com/p.jpg", "file:///etc/passwd", "//evil.example/p.jpg", "/players/a.svg", "javascript:alert(1)", ""]) expect(photoAllowed(s)).toBe(false);
  });
});

describe("Squad tab photos", () => {
  const workbook = (rows: (string | null)[][]) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Squad");
    return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  };
  it("drops anything that is not a /players file or an https link, and tells the admin", () => {
    const data = parseWorkbook(workbook([["Player", "Photo"], ["Seb Burgess", "/players/../../etc/passwd"], ["Phil Knott", "https://example.com/phil.jpg"], ["Isaac Mond", "/players/isaac-mond.jpg"], ["Sam Holt", null]]));
    expect([...rejectedPhotos.entries()]).toEqual([["Seb Burgess", "/players/../../etc/passwd"]]);
    const issues = sheetHealth(data, "2026-06-01").issues.filter((i) => i.key.startsWith("photo-rejected:"));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "low", key: "photo-rejected:seb-burgess", href: "/squad/seb-burgess" });
    expect(issues[0].message).toContain("/players/../../etc/passwd");
  });
  it("forgets rejections when the next workbook is clean", () => {
    parseWorkbook(workbook([["Player", "Photo"], ["Seb Burgess", "/players/seb-burgess.jpg"]]));
    expect(rejectedPhotos.size).toBe(0);
  });
});
