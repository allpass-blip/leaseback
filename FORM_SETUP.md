# フォーム送信設定

## Netlifyで運用する場合

このLPは Netlify Forms で送信を受け付ける設定です。

フォームには以下を設定しています。

- `data-netlify="true"`
- `name="leaseback-contact"`
- `form-name=leaseback-contact`
- `netlify-honeypot="bot-field"`
- 送信成功後の移動先: `thanks.html`

Netlifyにデプロイ後、管理画面の **Forms** に `leaseback-contact` が表示され、送信内容を確認できます。

メール通知を受け取りたい場合は、Netlify管理画面で設定します。

1. Netlifyの対象サイトを開く
2. **Forms** を開く
3. `leaseback-contact` を選ぶ
4. **Form notifications** から通知先メールを追加する

この運用では `SMTP_HOST` などのSMTP設定は不要です。

## ローカル確認

```bash
npm start
```

ローカル確認URL:

```text
http://127.0.0.1:4173/
```

## SMTP設定について

`.env.example` の `SMTP_HOST` などは、Netlifyではなく、独自のNodeサーバーで `preview-server.js` を動かしてメール送信する場合の設定です。

Netlifyの通常デプロイでは `preview-server.js` は常駐サーバーとして動かないため、Netlify Formsを使います。
