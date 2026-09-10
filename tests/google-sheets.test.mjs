import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { buildEnvelope, syncSubmission } from "../netlify/lib/google-sheets.mjs";
import { processSubmission } from "../netlify/lib/process-submission.mjs";

const env = {
  GOOGLE_SHEETS_ENABLED: "true",
  GOOGLE_SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/mock-deployment/exec",
  GOOGLE_SHEETS_WEBHOOK_SECRET: "mock-secret-".repeat(4),
};
const payload = { id: "submission_123", created_at: "2026-09-11T00:00:00Z", form_name: "leaseback-contact", data: { お名前: "ローカル検証", 電話番号: "09000000000", 送信元: "lp-2" } };
const json = (value) => new Response(JSON.stringify(value));

test("GASが検証するtimestamp.payloadのHMACとデータ形式に一致する", () => {
  const envelope = buildEnvelope(payload, env.GOOGLE_SHEETS_WEBHOOK_SECRET, 123456);
  assert.equal(envelope.signature, createHmac("sha256", env.GOOGLE_SHEETS_WEBHOOK_SECRET).update("123456." + envelope.payload).digest("hex"));
  assert.deepEqual(JSON.parse(envelope.payload), { id: payload.id, createdAt: payload.created_at, data: payload.data });
});

test("無効化・別フォーム・スパムを外部送信しない", async () => {
  for (const input of [{}, { ...payload, form_name: "leaseback-contact-test" }, { ...payload, spam: true }, { ...payload, data: { "bot-field": "bot" } }]) {
    assert.deepEqual(await syncSubmission(input, { env, fetchImpl: () => assert.fail("外部送信禁止") }), { skipped: true });
  }
  assert.deepEqual(await syncSubmission(payload, { env: {}, fetchImpl: () => assert.fail("外部送信禁止") }), { skipped: true });
});

test("GAS成功応答と重複応答を受け入れ、転送先と送信内容を確認する", async () => {
  for (const duplicate of [false, true]) {
    const result = await syncSubmission(payload, { env, fetchImpl: async (url, options) => {
      assert.equal(url, env.GOOGLE_SHEETS_WEBHOOK_URL);
      assert.equal(options.method, "POST");
      assert.equal(options.redirect, "follow");
      assert.equal(JSON.parse(JSON.parse(options.body).payload).id, payload.id);
      return json({ ok: true, duplicate });
    }});
    assert.deepEqual(result, { synced: true, duplicate });
  }
});

test("一時障害は同じ問い合わせIDで3回まで再試行する", async () => {
  for (const failure of ["network", 429, 503, "lock"]) {
    let calls = 0;
    const waits = [];
    await syncSubmission(payload, { env, sleep: async ms => waits.push(ms), fetchImpl: async (_, options) => {
      calls++;
      assert.equal(JSON.parse(JSON.parse(options.body).payload).id, payload.id);
      if (calls === 3) return json({ ok: true });
      if (failure === "network") throw new Error("mock");
      if (failure === "lock") return json({ ok: false, retryable: true });
      return new Response(null, { status: failure });
    }});
    assert.equal(calls, 3);
    assert.deepEqual(waits, [500, 1000]);
  }
});

test("署名拒否・認証画面・HTTP認証エラーを成功扱いしない", async () => {
  for (const response of [json({ ok: false, retryable: false }), new Response("<html>Login</html>"), new Response(null, { status: 403 })]) {
    let calls = 0;
    await assert.rejects(syncSubmission(payload, { env, fetchImpl: async () => { calls++; return response; }}));
    assert.equal(calls, 1);
  }
});

test("設定不足・不正な転記先・IDや日時の不足で接続しない", async () => {
  for (const inputEnv of [{ ...env, GOOGLE_SHEETS_WEBHOOK_SECRET: "short" }, { ...env, GOOGLE_SHEETS_WEBHOOK_URL: "https://example.com/exec" }]) {
    await assert.rejects(syncSubmission(payload, { env: inputEnv, fetchImpl: () => assert.fail("外部送信禁止") }));
  }
  for (const input of [{ ...payload, id: undefined }, { ...payload, created_at: "invalid" }]) {
    await assert.rejects(syncSubmission(input, { env, fetchImpl: () => assert.fail("外部送信禁止") }));
  }
});

test("一方の連携が失敗してももう一方を実行し、個人情報をログに残さない", async () => {
  for (const failing of ["notify", "sync"]) {
    const calls = [];
    const logs = [];
    const dependencies = Object.fromEntries(["notify", "sync"].map(name => [name, async () => {
      calls.push(name);
      if (name === failing) throw new Error("private customer data");
      return { sent: true };
    }]));
    await assert.rejects(processSubmission(payload, { ...dependencies, log: message => logs.push(message) }), /Submission delivery failed/);
    assert.deepEqual(calls.sort(), ["notify", "sync"]);
    assert.doesNotMatch(logs.join("\n"), /private customer|ローカル検証/);
  }
});
