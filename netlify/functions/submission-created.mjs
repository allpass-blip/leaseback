const CHATWORK_API_BASE = "https://api.chatwork.com/v2";
const TARGET_FORM = "leaseback-contact";

const NOTIFICATION_FIELDS = [
  "物件種別",
  "都道府県",
  "売却希望時期",
  "お名前",
  "電話番号",
  "メールアドレス",
  "同意状況",
  "送信元",
  "送信ページ",
];

function fieldValue(data, key) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value : "未入力";
}

// Prevent user input from being interpreted as Chatwork message notation.
function sanitize(value, maxLength = 500) {
  return String(value)
    .replaceAll("[", "［")
    .replaceAll("]", "］")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function toMentions(rawAccountIds) {
  if (!rawAccountIds) return [];

  return rawAccountIds
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
    .map((id) => `[To:${id}]`);
}

function formatSubmittedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "取得できませんでした";

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;

  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

export function buildChatworkMessage(
  data,
  toAccountIds = "",
  submittedAt = new Date(),
) {
  const mentions = toMentions(toAccountIds);
  const heading = mentions.length
    ? `${mentions.join(" ")}\nフォームから新しいお問い合わせがありました。`
    : "フォームから新しいお問い合わせがありました。";

  const details = [
    `問い合わせ日時：${formatSubmittedAt(submittedAt)}`,
    ...NOTIFICATION_FIELDS.map((key) => {
      return `${key}：${sanitize(fieldValue(data, key))}`;
    }),
  ];

  return [
    heading,
    "[info][title]リースバックLP｜新規お問い合わせ（自動通知）[/title]",
    ...details,
    "[/info]",
  ].join("\n");
}

async function postToChatwork({ token, roomId, message }) {
  const endpoint = `${CHATWORK_API_BASE}/rooms/${encodeURIComponent(roomId)}/messages`;
  const body = new URLSearchParams({ body: message });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-ChatWorkToken": token,
      },
      body,
    });

    if (response.ok) return;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 2) {
      throw new Error(`Chatwork API returned HTTP ${response.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
}

export default async function submissionCreated(request) {
  const { payload = {} } = await request.json();

  if (payload.form_name !== TARGET_FORM) return;

  const data = payload.data || {};

  const token = process.env.CHATWORK_API_TOKEN?.trim();
  const roomId = process.env.CHATWORK_ROOM_ID?.trim();

  if (!token || !roomId) {
    throw new Error(
      "CHATWORK_API_TOKEN and CHATWORK_ROOM_ID must be configured in Netlify",
    );
  }

  const message = buildChatworkMessage(
    data,
    process.env.CHATWORK_TO_ACCOUNT_IDS,
    payload.created_at || new Date(),
  );

  await postToChatwork({ token, roomId, message });
}
