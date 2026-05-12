# リースバック LP

Netlifyで公開する静的LPです。フォーム送信はNetlify Formsで受け取ります。

## Netlify設定

1. GitHubリポジトリをNetlifyに接続します。
2. Build commandは空欄で問題ありません。
3. Publish directoryはリポジトリのルートを指定します。
4. デプロイ後、NetlifyのForms画面で `leaseback-contact` が検出されるか確認します。
5. メール通知はNetlify管理画面の `Form submission notifications` で設定します。

## フォーム

`index.html` にNetlify検出用の静的フォーム定義を置き、実際の入力フォームは同じ `leaseback-contact` 名で送信します。
