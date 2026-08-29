import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function filesUnder(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && [".git", ".netlify", ".playwright-cli", "tests"].includes(entry.name)) {
      return [];
    }
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function localTarget(sourceFile, reference) {
  const clean = reference.split("#", 1)[0].split("?", 1)[0];
  if (!clean || /^(?:https?:|tel:|mailto:|data:|javascript:)/i.test(clean)) return null;

  if (clean === "/") return join(root, "index.html");
  const target = clean.startsWith("/")
    ? join(root, clean.slice(1))
    : resolve(dirname(sourceFile), clean);
  return clean.endsWith("/") ? join(target, "index.html") : target;
}

test("本番LPはルートにあり、Netlifyフォームと外部GTMローダーを使う", () => {
  const html = read("index.html");
  assert.match(html, /<script src="\/assets\/gtm\.js\?v=20260829"><\/script>/);
  assert.match(html, /name="leaseback-contact"/);
  assert.match(html, /data-netlify="true"/);
  assert.match(html, /netlify-honeypot="bot-field"/);
  assert.doesNotMatch(html, /function\(w,d,s,l,i\)/);
});

test("クライアント確認用ページは計測も本番送信も行わない", () => {
  const html = read("test/index.html");
  const formScript = read("test/assets/form-submit.js");
  assert.doesNotMatch(html, /googletagmanager|affilicode|data-netlify|form-name/i);
  assert.match(html, /\/test\/assets\/form-submit\.js/);
  assert.match(formScript, /event\.preventDefault\(\)/);
  assert.doesNotMatch(formScript, /fetch\s*\(/);
});

test("/test配下はEdge Functionの保護対象", () => {
  const config = read("netlify.toml");
  assert.match(config, /path = "\/test"/);
  assert.match(config, /path = "\/test\/\*"/);
  assert.match(config, /command = "node --test \\"tests\/\*\.test\.mjs\\""/);
});

test("旧LP経路はルートへ恒久転送し、旧ページは残さない", () => {
  const redirects = read("_redirects");
  for (const route of ["/index.html", "/lp/1", "/lp/2", "/variant-b", "/variant-b-desktop"]) {
    assert.match(redirects, new RegExp(`^${route.replace("/", "\\/")}\\S* \\/ 301!$`, "m"));
  }
  assert.doesNotMatch(redirects, /^\/ \/variant-b\/ 200!$/m);
  assert.equal(existsSync(join(root, "variant-b")), false);
  assert.equal(existsSync(join(root, "variant-b-desktop")), false);
});

test("コンバージョンは本番フォーム送信直後の一度だけ許可する", () => {
  const submit = read("assets/form-submit.js");
  const thanks = read("assets/thanks-tracking.js");
  const affiliate = read("assets/affilicode-tracking.js");
  assert.match(submit, /sessionStorage\.setItem\("leaseback_submission_pending", "1"\)/);
  assert.match(thanks, /sessionStorage\.getItem\(marker\) !== "1"/);
  assert.match(thanks, /sessionStorage\.removeItem\(marker\)/);
  assert.match(thanks, /window\.__leasebackConversionReady = true/);
  assert.match(affiliate, /window\.__leasebackConversionReady === true/);
});

test("公開HTMLとCSSのローカル参照先が存在する", () => {
  const missing = [];
  for (const file of filesUnder()) {
    const extension = extname(file).toLowerCase();
    if (extension !== ".html" && extension !== ".css") continue;
    const contents = readFileSync(file, "utf8");
    const references = extension === ".html"
      ? [...contents.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1])
      : [...contents.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map((match) => match[1]);

    for (const reference of references) {
      const target = localTarget(file, reference);
      if (target && !existsSync(target)) {
        missing.push(`${file.slice(root.length + 1)} -> ${reference}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
