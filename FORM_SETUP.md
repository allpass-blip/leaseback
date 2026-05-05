# フォーム送信の設定

このランディングページは `preview-server.js` でフォーム送信を受け付けます。

## 起動

```bash
node preview-server.js
```

ページは `http://127.0.0.1:4173/` で確認できます。

## メール送信

`.env.example` を参考に `.env` を作成し、SMTP情報を設定してください。

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@example.com
SMTP_PASS=your-smtp-password
MAIL_FROM=your-smtp-user@example.com
MAIL_TO=info@seed2.tokyo
```

SMTP未設定の場合でも、送信内容は `submissions/contact-YYYY-MM-DD.jsonl` に保存されます。
