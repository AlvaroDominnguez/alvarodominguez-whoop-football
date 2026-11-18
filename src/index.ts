import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3@3";
const env = Bun.env;
const required = (name: string) => { const value = env[name]; if (!value) throw new Error("Missing environment variable: " + name); return value; };
const s3 = new S3Client({ region: env.S3_REGION || "auto", endpoint: required("S3_ENDPOINT"), forcePathStyle: false, credentials: { accessKeyId: required("S3_ACCESS_KEY_ID"), secretAccessKey: required("S3_SECRET_ACCESS_KEY") } });
const bucket = required("S3_BUCKET");
async function readObject(key: string): Promise<string | null> {
  try { const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key })); return result.Body ? await result.Body.transformToString() : null; }
  catch (error: any) { if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return null; throw error; }
}
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
function authorized(request: Request) {
  const header = request.headers.get("authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = required("API_BEARER_TOKEN");
  if (supplied.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < supplied.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
Bun.serve({ port: Number(env.PORT || 3000), async fetch(request) {
  const url = new URL(request.url);
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  if (url.pathname === "/health") return json({ status: "ok" });
  if (!authorized(request)) return json({ error: "unauthorized" }, 401);
  try {
    const keys: Record<string,string> = { "/v1/latest": "reports/latest.json", "/v1/daily.csv": "exports/whoop_daily_summary.csv", "/v1/workouts.csv": "exports/whoop_workouts.csv" };
    const key = keys[url.pathname];
    if (!key) return json({ error: "not_found" }, 404);
    const raw = await readObject(key);
    if (!raw) return json({ error: "report_not_found" }, 404);
    const type = key.endsWith(".csv") ? "text/csv; charset=utf-8" : "application/json; charset=utf-8";
    return new Response(raw, { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
  } catch (error: any) { console.error("WHOOP_READ_API_ERROR", error?.message || String(error)); return json({ error: "internal_error" }, 500); }
} });
