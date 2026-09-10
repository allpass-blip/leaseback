import { notifySubmission } from "./chatwork.mjs";
import { syncSubmission } from "./google-sheets.mjs";

export async function processSubmission(payload, {
  notify = notifySubmission,
  sync = syncSubmission,
  log = console.info,
} = {}) {
  const results = await Promise.allSettled([
    Promise.resolve().then(() => notify(payload)),
    Promise.resolve().then(() => sync(payload)),
  ]);
  const names = ["Chatwork", "Google Sheets"];
  const failures = [];
  results.forEach((result, index) => {
    // Never log payloads, API responses, or credentials.
    const status = result.status === "rejected" ? "failed" : result.value.skipped ? "skipped" : "completed";
    log(`${names[index]}: ${status}`);
    if (result.status === "rejected") failures.push(names[index]);
  });
  if (failures.length) throw new Error(`Submission delivery failed: ${failures.join(", ")}`);
}
