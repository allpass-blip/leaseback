const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");
const tls = require("tls");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const root = __dirname;
const submissionsDir = path.join(root, "submissions");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

loadEnvFile();

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  if (req.method === "POST" && urlPath === "/api/contact") {
    handleContact(req, res);
    return;
  }

  if (urlPath.startsWith("/submissions/") || urlPath === "/.env") {
    sendText(res, 403, "Forbidden");
    return;
  }

  serveStatic(urlPath, res);
});

server.listen(port, host, () => {
  console.log(`Preview server running at http://${host}:${port}/`);
  if (!hasSmtpConfig()) {
    console.log("SMTP is not configured. Form submissions will be saved to ./submissions/ only.");
  }
});

function loadEnvFile() {
  const envPath = path.join(root, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) {
      return;
    }

    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  });
}

function serveStatic(urlPath, res) {
  const relativePath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(root, relativePath));

  if (!filePath.startsWith(root)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
    res.end(data);
  });
}

async function handleContact(req, res) {
  try {
    const rawBody = await readBody(req);
    const payload = parseBody(req.headers["content-type"] || "", rawBody);
    const contact = normalizeContact(payload);
    const errors = validateContact(contact);

    if (errors.length > 0) {
      sendJson(res, 400, {
        ok: false,
        message: errors.join(" "),
      });
      return;
    }

    const record = {
      id: createSubmissionId(),
      receivedAt: new Date().toISOString(),
      contact,
      meta: {
        ip: String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""),
        userAgent: String(req.headers["user-agent"] || ""),
      },
    };

    await saveSubmission(record);

    let mailSent = false;
    if (hasSmtpConfig()) {
      await sendContactMail(record);
      mailSent = true;
    }

    sendJson(res, 200, {
      ok: true,
      mailSent,
      message: "送信しました。担当者より折り返しご連絡いたします。",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    sendJson(res, 500, {
      ok: false,
      message: "送信できませんでした。時間をおいて再度お試しください。",
    });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseBody(contentType, rawBody) {
  if (contentType.includes("application/json")) {
    return JSON.parse(rawBody || "{}");
  }

  const params = new URLSearchParams(rawBody);
  const payload = {};
  params.forEach((value, key) => {
    payload[key] = value;
  });
  return payload;
}

function normalizeContact(payload) {
  return {
    type: clean(payload.type),
    prefecture: clean(payload.prefecture),
    city: clean(payload.city),
    timing: clean(payload.timing),
    name: clean(payload.name),
    phone: clean(payload.phone),
    email: clean(payload.email),
    privacy: clean(payload.privacy),
    pageUrl: clean(payload.pageUrl),
  };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function validateContact(contact) {
  const errors = [];

  [
    ["type", "物件の種類"],
    ["prefecture", "都道府県"],
    ["city", "市区町村"],
    ["timing", "売却時期"],
    ["name", "お名前"],
    ["phone", "電話番号"],
    ["privacy", "同意確認"],
  ].forEach(([key, label]) => {
    if (!contact[key]) {
      errors.push(`${label}を入力してください。`);
    }
  });

  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push("メールアドレスの形式を確認してください。");
  }

  return errors;
}

async function saveSubmission(record) {
  await fs.promises.mkdir(submissionsDir, { recursive: true });
  const date = record.receivedAt.slice(0, 10);
  const filePath = path.join(submissionsDir, `contact-${date}.jsonl`);
  await fs.promises.appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendContactMail(record) {
  const to = process.env.MAIL_TO || "info@seed2.tokyo";
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const subject = "リースバックLPから査定フォーム送信";
  const message = buildMailMessage({ to, from, subject, record });

  await sendSmtp({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    rejectUnauthorized: String(process.env.SMTP_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
  }, message, { from, to });
}

function buildMailMessage({ to, from, subject, record }) {
  const contact = record.contact;
  const body = [
    "リースバックLPから査定フォームの送信がありました。",
    "",
    `受付ID: ${record.id}`,
    `受付日時: ${record.receivedAt}`,
    "",
    `物件の種類: ${contact.type}`,
    `都道府県: ${contact.prefecture}`,
    `市区町村: ${contact.city}`,
    `売却時期: ${contact.timing}`,
    `お名前: ${contact.name}`,
    `電話番号: ${contact.phone}`,
    `メールアドレス: ${contact.email || "未入力"}`,
    `ページURL: ${contact.pageUrl || "不明"}`,
    "",
    `IP: ${record.meta.ip}`,
    `User-Agent: ${record.meta.userAgent}`,
  ].join("\r\n");

  const headers = [
    `From: ${sanitizeHeader(from)}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];

  if (contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    headers.push(`Reply-To: ${sanitizeHeader(contact.email)}`);
  }

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

async function sendSmtp(config, message, envelope) {
  let socket = config.secure
    ? tls.connect({
        host: config.host,
        port: config.port,
        servername: config.host,
        rejectUnauthorized: config.rejectUnauthorized,
      })
    : net.connect({ host: config.host, port: config.port });

  socket.setEncoding("utf8");

  let buffer = "";
  const waiters = [];

  function attachDataHandler() {
    socket.on("data", (chunk) => {
      buffer += chunk;
      resolveWaiters();
    });
  }

  function resolveWaiters() {
    if (waiters.length === 0 || !isCompleteSmtpResponse(buffer)) {
      return;
    }

    const response = buffer;
    buffer = "";
    const waiter = waiters.shift();
    waiter.resolve(response);
  }

  function readResponse() {
    return new Promise((resolve, reject) => {
      waiters.push({ resolve, reject });
      resolveWaiters();
    });
  }

  function writeCommand(command) {
    socket.write(`${command}\r\n`);
  }

  async function expectResponse(expectedCodes) {
    const response = await readResponse();
    const code = Number(response.slice(0, 3));
    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP error ${response.trim()}`);
    }
    return response;
  }

  async function command(line, expectedCodes) {
    writeCommand(line);
    return expectResponse(expectedCodes);
  }

  attachDataHandler();

  await once(socket, config.secure ? "secureConnect" : "connect");
  await expectResponse([220]);
  let ehlo = await command("EHLO localhost", [250]);

  if (!config.secure && /STARTTLS/i.test(ehlo)) {
    await command("STARTTLS", [220]);
    socket.removeAllListeners("data");
    socket = tls.connect({
      socket,
      servername: config.host,
      rejectUnauthorized: config.rejectUnauthorized,
    });
    socket.setEncoding("utf8");
    buffer = "";
    attachDataHandler();
    await once(socket, "secureConnect");
    ehlo = await command("EHLO localhost", [250]);
  }

  await command("AUTH LOGIN", [334]);
  await command(Buffer.from(config.user).toString("base64"), [334]);
  await command(Buffer.from(config.pass).toString("base64"), [235]);
  await command(`MAIL FROM:<${envelope.from}>`, [250]);
  await command(`RCPT TO:<${envelope.to}>`, [250, 251]);
  await command("DATA", [354]);
  socket.write(`${dotStuff(message)}\r\n.\r\n`);
  await expectResponse([250]);
  await command("QUIT", [221]);
  socket.end();
}

function isCompleteSmtpResponse(response) {
  if (!response.endsWith("\r\n")) {
    return false;
  }

  const lines = response.trimEnd().split(/\r\n/);
  return /^\d{3} /.test(lines[lines.length - 1] || "");
}

function dotStuff(message) {
  return message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function once(emitter, eventName) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      emitter.off(eventName, handleEvent);
      emitter.off("error", handleError);
    };
    const handleEvent = (...args) => {
      cleanup();
      resolve(...args);
    };
    const handleError = (error) => {
      cleanup();
      reject(error);
    };
    emitter.once(eventName, handleEvent);
    emitter.once("error", handleError);
  });
}

function encodeMimeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function sanitizeHeader(value) {
  return String(value || "").replace(/[\r\n]/g, "");
}

function createSubmissionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
