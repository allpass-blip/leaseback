# リースバック LP

Netlifyで公開する静的LPです。フォーム送信はNetlify Formsで受け取ります。

## Netlify設定

1. GitHubリポジトリをNetlifyに接続します。
2. Build commandは空欄で問題ありません。
3. Publish directoryはリポジトリのルートを指定します。
4. デプロイ後、NetlifyのForms画面で `leaseback-contact` が検出されるか確認します。
5. メール通知はNetlify管理画面の `Form submission notifications` で設定します。
6. Chatwork通知を利用する場合は、`FORM_SETUP.md` の手順でAPIトークンとルームIDを設定します。

## 環境

- 本番環境は `/` で公開し、`leaseback-contact` フォームだけをChatwork通知の対象にします。
- クライアント確認用のテスト環境は `/test/` に置き、Edge Functionでパスワード保護します。
- テスト環境は広告計測を読み込まず、フォーム入力も保存・通知しません。
- Netlifyの環境変数 `TEST_SITE_PASSWORD` はSecretとして設定し、リポジトリには保存しません。

## フォーム

`index.html` にNetlify検出用の静的フォーム定義を置き、実際の入力フォームは同じ `leaseback-contact` 名で送信します。
