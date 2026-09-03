import { NextResponse } from "next/server";
import { getData } from "@/lib/data";

/** Full normalised dataset as JSON. `?pretty=1` for human reading. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = await getData();
  const body = url.searchParams.get("pretty") ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  return new NextResponse(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, s-maxage=60, stale-while-revalidate=300", "access-control-allow-origin": "*" } });
}
