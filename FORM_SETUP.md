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

## Chatwork通知

フォームがNetlify Formsに保存・検証された後、`netlify/functions/chatwork-notify.mjs` がChatworkへ通知します。
ブラウザにはAPIトークンを置かないため、トークンがサイト閲覧者に公開されることはありません。

### 1. Chatworkで用意するもの

1. 通知の投稿元にするChatworkアカウントを通知先ルームへ参加させます。
2. そのアカウントで、画面右上の利用者名から `サービス連携` を開きます。
3. `APIトークン` を発行してコピーします。
4. 通知先ルームをブラウザで開き、URL末尾の数字を確認します。

URLが次の場合、ルームIDは `123456789` です。

```text
https://www.chatwork.com/#!rid123456789
```

### 2. Netlifyに入力する値

Netlify管理画面で次の場所を開きます。

```text
Project configuration
Environment variables
```

以下の2項目を登録します。

| Key | Value |
| --- | --- |
| `CHATWORK_API_TOKEN` | Chatworkで発行したAPIトークン |
| `CHATWORK_ROOM_ID` | 通知先のルームID（数字のみ） |

特定の担当者へTo通知したい場合だけ、次の項目も追加します。複数人はカンマ区切りです。

| Key | Valueの例 |
| --- | --- |
| `CHATWORK_TO_ACCOUNT_IDS` | `1234567,7654321` |

環境変数を保存したら、サイトを再デプロイします。

### 3. 動作確認

1. 公開サイトのフォームからテストデータを1件送信します。
2. NetlifyのForms画面に送信内容が保存されていることを確認します。
3. Chatworkの指定ルームに「リースバックLP｜新規お問い合わせ（自動通知）」が届くことを確認します。

Chatwork通知に失敗した場合でも、問い合わせ原本はNetlify Formsに残ります。通知エラーはNetlifyのFunctionsログで確認できます。APIトークンを再発行すると以前のトークンは無効になるため、Netlify側の値も更新してください。
