import type { Context } from "@netlify/edge-functions";

const PASSWORD_ENV_NAME = "TEST_SITE_PASSWORD";
const SESSION_COOKIE_NAME = "leaseback_test_session";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function applyPrivateHeaders(headers: Headers): void {
  headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  );
}

function htmlResponse(body: string, status: number): Response {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
  });
  applyPrivateHeaders(headers);
  return new Response(body, { status, headers });
}

function loginPage(errorMessage = ""): Response {
  const error = errorMessage
    ? `<p class="error" role="alert">${errorMessage}</p>`
    : "";

  return htmlResponse(
    `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>テスト環境 | イエトク！</title>
    <style>
      :root { color-scheme: light; font-family: "Noto Sans JP", "Yu Gothic", sans-serif; }
      * { box-sizing: border-box; }
      body { min-height: 100dvh; margin: 0; display: grid; place-items: center; padding: 24px; background: #f4f7fb; color: #061733; }
      main { width: min(100%, 440px); padding: 36px; border: 1px solid #d9e1ec; border-radius: 12px; background: #fff; box-shadow: 0 18px 44px rgba(6, 23, 51, .1); }
      .label { margin: 0 0 10px; color: #143b8a; font-size: .82rem; font-weight: 700; letter-spacing: .08em; }
      h1 { margin: 0; font-size: 1.65rem; }
      .description { margin: 14px 0 24px; color: #536070; line-height: 1.7; }
      label { display: block; margin-bottom: 8px; font-weight: 700; }
      input { width: 100%; min-height: 48px; border: 1px solid #aab7c8; border-radius: 8px; padding: 10px 12px; font: inherit; }
      button { width: 100%; min-height: 48px; margin-top: 16px; border: 0; border-radius: 8px; background: #143b8a; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      .error { margin: 0 0 16px; border-left: 4px solid #c73521; background: #fff1ef; padding: 10px 12px; color: #8f2113; }
    </style>
  </head>
  <body>
    <main>
      <p class="label">CLIENT REVIEW</p>
      <h1>テスト環境</h1>
      <p class="description">共有されたパスワードを入力してください。</p>
      ${error}
      <form method="post">
        <label for="password">パスワード</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        <button type="submit">確認ページを開く</button>
      </form>
    </main>
  </body>
</html>`,
    401,
  );
}

function unavailablePage(): Response {
  return htmlResponse(
    `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>テスト環境を利用できません</title></head><body><main><h1>テスト環境を利用できません</h1><p>管理者によるパスワード設定が必要です。</p></main></body></html>`,
    503,
  );
}

function redirectTo(url: URL): Response {
  const headers = new Headers({ Location: url.toString() });
  applyPrivateHeaders(headers);
  return new Response(null, { status: 303, headers });
}

export default async function testAuth(
  request: Request,
  context: Context,
): Promise<Response> {
  const password = Netlify.env.get(PASSWORD_ENV_NAME);
  if (!password) return unavailablePage();

  const url = new URL(request.url);
  if (url.searchParams.has("logout")) {
    context.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/test" });
    return redirectTo(new URL("/test/", url));
  }

  const expectedSession = await sha256(`leaseback-test:v1:${password}`);
  const session = context.cookies.get(SESSION_COOKIE_NAME) ?? "";

  if (timingSafeEqual(session, expectedSession)) {
    const response = await context.next();
    const headers = new Headers(response.headers);
    applyPrivateHeaders(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const submittedPassword = String(formData.get("password") ?? "");
    const [submittedHash, expectedHash] = await Promise.all([
      sha256(submittedPassword),
      sha256(password),
    ]);

    if (timingSafeEqual(submittedHash, expectedHash)) {
      context.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: expectedSession,
        path: "/test",
        expires: new Date(Date.now() + SESSION_MAX_AGE_MS),
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      });
      url.search = "";
      return redirectTo(url);
    }

    return loginPage("パスワードが違います。もう一度お試しください。");
  }

  return loginPage();
}
