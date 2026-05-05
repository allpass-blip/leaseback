# リースバック ランディングページ

リースバック相談用のランディングページ一式です。

## 内容

- `index.html`: ランディングページ本体
- `assets/`: CSS、JavaScript、画像
- `preview-server.js`: ローカル確認用サーバー兼フォーム送信受付
- `.env.example`: メール送信用SMTP設定のサンプル
- `FORM_SETUP.md`: フォーム送信設定の詳細

## 確認方法

Node.js が入っている環境で、以下を実行してください。

```bash
node preview-server.js
```

ブラウザで `http://127.0.0.1:4173/` を開くと確認できます。

## フォーム送信

フォームは `POST /api/contact` に送信されます。

SMTP設定がない場合でも、送信内容は `submissions/` に保存されます。メール送信まで行う場合は、`.env.example` をコピーして `.env` を作成し、SMTP情報を設定してください。

送信先メールアドレスの初期値は `info@seed2.tokyo` です。

## 配布時の注意

`.env`、`submissions/`、`server.out.log`、`server.err.log`、`.git/` は配布しないでください。
