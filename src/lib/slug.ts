/** URL-safe slug shared by server parsing and client components (kept dependency-free so it never drags xlsx into the browser bundle). */
export function slugify(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
