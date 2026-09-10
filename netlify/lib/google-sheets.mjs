import { createHmac } from "node:crypto";

export function buildEnvelope(payload, secret, timestamp = Date.now()) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(payload?.id || "") ||
      typeof payload.created_at !== "string" ||
      !Number.isFinite(Date.parse(payload.created_at))) {
    throw new Error("Submission ID and creation time are required for Sheets");
  }
  const serialized = JSON.stringify({
    id: payload.id,
    createdAt: payload.created_at,
    data: payload.data || {},
  });
  if (serialized.length > 30000) throw new Error("Submission exceeds Sheets payload limit");
  return {
    timestamp,
    payload: serialized,
    signature: createHmac("sha256", secret).update(`${timestamp}.${serialized}`).digest("hex"),
  };
}

export async function syncSubmission(payload, {
  env = process.env,
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
} = {}) {
  const data = payload?.data || {};
  if ((payload?.form_name || data["form-name"]) !== "leaseback-contact" ||
      payload?.spam === true || data["bot-field"] || env.GOOGLE_SHEETS_ENABLED !== "true") {
    return { skipped: true };
  }
  const url = env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  const secret = env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url || "") ||
      !secret || secret.length < 32) {
    throw new Error("Sheets webhook URL and secret must be configured in Netlify");
  }
  // Retrying keeps the same submission ID; GAS refuses to append duplicates.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const body = JSON.stringify(buildEnvelope(payload, secret, now()));
    let response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      if (attempt === 2) throw new Error("Sheets connection failed after 3 attempts");
      await sleep(500 * 2 ** attempt);
      continue;
    }
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw new Error(`Sheets webhook returned HTTP ${response.status}`);
    }
    let result;
    try { result = await response.json(); }
    catch { throw new Error("Sheets webhook did not return JSON"); }
    if (result?.ok === true) return { synced: true, duplicate: result.duplicate === true };
    if (result?.retryable === true && attempt < 2) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    throw new Error("Sheets webhook rejected submission");
  }
}
