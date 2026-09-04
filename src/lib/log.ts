/** One-line JSON logs so Vercel's runtime logs can be filtered by event. */
export const log = (event: string, fields: Record<string, unknown> = {}) => { try { console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields })); } catch { console.log(event); } };
