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

Netlifyが検出できるように、`index.html` に静的なフォーム定義を置いています。

## Chatwork通知

フォームがNetlify Formsに保存・検証された後、`netlify/functions/submission-created.mjs` がChatwork通知とGoogleスプレッドシート転記を行います。一方の失敗で他方の処理が止まらないよう、両方を独立して実行します。
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

### 3. 通知を送らずに確認する

`node --test "tests/*.test.mjs"` は外部通信を模擬して検証します。実際のフォーム送信・メール・Chatwork通知・シート書き込みは行いません。

Chatworkのルーム情報をGETで取得すれば、APIトークンの有効性と参加権限を投稿せず確認できます。

### 4. 実送信での確認

クライアントへのテスト通知が許可された場合のみ実施します。

1. 公開サイトのフォームからテストデータを1件送信します。
2. NetlifyのForms画面に送信内容が保存されていることを確認します。
3. Chatworkの指定ルームに「リースバックLP｜新規お問い合わせ（自動通知）」が届くことを確認します。

Chatwork通知に失敗した場合でも、問い合わせ原本はNetlify Formsに残ります。通知エラーはNetlifyのFunctionsログで確認できます。APIトークンを再発行すると以前のトークンは無効になるため、Netlify側の値も更新してください。

## Googleスプレッドシート転記

本番環境のFunctionsで、次の環境変数を使用します。プレビュー環境では有効にしません。

| Key | 内容 |
| --- | --- |
| `GOOGLE_SHEETS_ENABLED` | `true` のとき転記する |
| `GOOGLE_SHEETS_WEBHOOK_URL` | 公開済みGASウェブアプリの `/exec` URL |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | GASのスクリプトプロパティ `WEBHOOK_SECRET` と同じ値。32文字以上 |

GASプロジェクト: https://script.google.com/home/projects/1X4MDVp4BsrCthVOS7-euiY3yFuM_FYvB6CmFHz1cLxaNRzy5Uwg-Kv27/edit

転記先: https://docs.google.com/spreadsheets/d/1EQFmTO6gig3oSexkphOO5rMBACELFQjoIWa7PYNKMwA/edit?gid=0

`netlify/lib/google-sheets.mjs` は、問い合わせID・受付日時・入力データをHMAC-SHA256で署名して送ります。GASは署名と時刻を検証し、既存行の末尾へ追記します。N列の「連携ID」で重複登録を防ぎます。既存のステータス・備考・並び順は変更しません。

接続障害・HTTP 429/5xx・GASの一時エラーは最大3回試行します。失敗はFunctionsログに連携名のみを残し、個人情報や秘密鍵は出力しません。再試行を使い切った場合は原本をNetlify Formsで確認して対応してください。Chatwork APIには同じ重複防止がないため、イベント全体の手動再実行は通知が重複する可能性があります。

公開URLへのGETはサービス状態のみを返し、転記や通知は行いません。POSTによる確認は本番シートへ書き込むため、テスト転記が許可された場合だけ実施します。
