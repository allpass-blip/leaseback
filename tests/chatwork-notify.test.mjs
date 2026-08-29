import assert from "node:assert/strict";
import test from "node:test";
import { buildChatworkMessage } from "../netlify/functions/chatwork-notify.mjs";

test("Chatwork記法を入力値から注入できない", () => {
  const message = buildChatworkMessage({
    お名前: "[To:999] 攻撃者",
    メールアドレス: "[info]test@example.com[/info]",
  });
  assert.match(message, /お名前：［To:999］ 攻撃者/);
  assert.match(message, /メールアドレス：［info］test@example\.com［\/info］/);
  assert.doesNotMatch(message, /^\[To:999\]/m);
});

test("有効な通知先IDだけをTo記法に変換する", () => {
  const message = buildChatworkMessage({}, "123, invalid, 456");
  assert.match(message, /^\[To:123\] \[To:456\]/);
  assert.doesNotMatch(message, /invalid/);
  assert.match(message, /物件種別：未入力/);
});
