import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHmac } from "node:crypto";
import { buildEnvelope } from "../netlify/lib/google-sheets.mjs";

const secret = "local-only-test-secret-".repeat(3);
const payload = { id: "local_test_123", created_at: "2026-09-11T00:00:00Z", data: { お名前: "=IMPORTXML()", 電話番号: "09000000000", 送信元: "lp-2" } };
const source = readFileSync(new URL("../integrations/google-sheets.gs", import.meta.url), "utf8");

function gas() {
  const rows = [["ステータス", "問い合わせ日時", "送信元", "物件種別", "都道府県", "市区町村", "売却希望時期", "お名前", "電話番号", "メールアドレス", "同意状況", "送信ページ", "備考"]];
  const sheet = {
    getSheetId: () => 0,
    getLastRow: () => rows.length,
    getMaxRows: () => 1000,
    getRange(row, col, height = 1, width = 1) {
      return {
        getDisplayValues: () => Array.from({length:height}, (_,i) => Array.from({length:width}, (_,j) => rows[row-1+i]?.[col-1+j] ?? "")),
        getValues() { return this.getDisplayValues(); },
        setValue(value) { rows[row-1][col-1] = value; },
        setNumberFormat() {},
        setValues(values) { values.forEach((values,i) => { rows[row-1+i] ??= []; values.forEach((value,j) => rows[row-1+i][col-1+j] = value); }); },
        createTextFinder(id) { return { matchEntireCell() { return this; }, useRegularExpression() { return this; }, findNext() { return rows.slice(1).some(row => row[13] === id) ? {} : null; } }; },
      };
    },
  };
  const context = {
    ContentService: { MimeType:{JSON:"json"}, createTextOutput: value => ({setMimeType:()=>JSON.parse(value)}) },
    PropertiesService: {getScriptProperties:()=>({getProperty:()=>secret})},
    Utilities:{Charset:{UTF_8:"utf8"},computeHmacSha256Signature:(value,key)=>Array.from(createHmac("sha256",key).update(value).digest())},
    SpreadsheetApp:{openById: id => { assert.equal(id,"1EQFmTO6gig3oSexkphOO5rMBACELFQjoIWa7PYNKMwA"); return {getSheets:()=>[sheet]}; },flush(){}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  };
  runInNewContext(source,context);
  return { context,rows,post: envelope => context.doPost({postData:{contents:JSON.stringify(envelope)}}) };
}

test("実際のGASコードがNetlifyの署名を受け入れ、同じIDを重複転記しない（全てメモリ内）", () => {
  const {post,rows} = gas();
  const envelope = buildEnvelope(payload,secret);
  assert.equal(post(envelope).ok,true);
  assert.equal(rows.length,2);
  assert.equal(rows[1][7],"'=IMPORTXML()");
  assert.equal(rows[1][8],"09000000000");
  assert.equal(post(envelope).duplicate,true);
  assert.equal(rows.length,2);
});

test("GASは不正署名・期限切れ・改ざん・不正データで書き込まず、GETも読み取り専用", () => {
  const {post,rows,context} = gas();
  const envelope = buildEnvelope(payload,secret);
  for (const rejected of [
    {...envelope,signature:"0".repeat(64)},
    buildEnvelope(payload,secret,Date.now()-600000),
    {...envelope,payload:envelope.payload.replace("lp-2","lp-1")},
    {...envelope,timestamp:"invalid"},
  ]) assert.equal(post(rejected).ok,false);
  assert.equal(context.doGet().ok,true);
  assert.equal(rows.length,1);
});
