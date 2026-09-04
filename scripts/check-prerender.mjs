// Post-build guard: every page on this site reads the sheet, so every prerendered page must revalidate. A route whose
// initialRevalidateSeconds is false was frozen at build time and would show the build's numbers until the next deploy.
// The fix for that is `export const revalidate` on the segment (src/app/layout.tsx covers all of them).
// Runs as "postbuild"; when there is no manifest (next dev, tests) there is nothing to check.
import { existsSync, readFileSync } from "node:fs";

const file = ".next/prerender-manifest.json";
if (!existsSync(file)) { console.log("check-prerender: no .next/prerender-manifest.json, nothing to check"); process.exit(0); }
const manifest = JSON.parse(readFileSync(file, "utf8"));
const routes = Object.entries(manifest.routes ?? {});

// Not pages: the framework's error shells, static metadata files and generated images (those carry their own revalidate).
const EXEMPT = [
  /^\/_(not-found|global-error|error)$/,
  /^\/(robots\.txt|sitemap(-\d+)?\.xml|manifest\.(json|webmanifest))$/,
  /^\/(favicon\.ico|(apple-)?icon\d*\.\w+)$/,
  /\/(opengraph|twitter)-image\d*(\.\w+)?$/,
  /\/(apple-)?icon\d*\.\w+$/,
];
const frozen = routes.filter(([route, r]) => r.initialRevalidateSeconds === false && !EXEMPT.some((re) => re.test(route))).map(([route]) => route);

if (frozen.length) {
  console.error(`check-prerender: ${frozen.length} prerendered route(s) have no revalidate and would stay frozen until the next deploy:\n  ${frozen.join("\n  ")}\nEvery page must sit under a segment with \`export const revalidate = <seconds>\` (a literal; see src/app/layout.tsx).`);
  process.exit(1);
}
console.log(`check-prerender: ${routes.length} prerendered routes, all revalidating`);
