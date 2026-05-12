# フォーム送信設定

このLPのフォーム送信はNetlify Forms専用です。

## 送信先

送信内容はNetlify管理画面のFormsに保存されます。メール通知先はコードではなくNetlify側で設定します。

設定場所:

```text
Project configuration
Notifications
Emails and webhooks
Form submission notifications
```

## フォーム名

```text
leaseback-contact
```

Netlifyが検出しやすいように、`index.html` の `<body>` 直下に静的な隠しフォーム定義を追加しています。
