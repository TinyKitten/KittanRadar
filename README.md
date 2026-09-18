# きったんレーダー — Jev

Chrome拡張アイコンをクリックすると、現在のページ右下に「好きそう度 / 100」を表示します。文章を選択した場合は選択範囲だけを評価します。TypeSafe AIのJevを実際に呼ぶ実装です。ダミースコアへのフォールバックはありません。

## 使い始める

1. ZIPを展開する。
2. Chromeの `chrome://extensions` でデベロッパーモードを有効化。
3. 「パッケージ化されていない拡張機能を読み込む」から `extension` フォルダーを選ぶ。
4. 開いた設定画面でTypeSafe APIキーを入力し保存する。キーは https://console.typesafe.ai/ で取得。
5. 通常のWebページを開き、拡張アイコンをクリックする。必要ならツールバーに固定する。

ビルドは不要です。設定は拡張機能の「詳細」→「拡張機能のオプション」から再編集できます。Chrome内部ページ、Web Store、PDFビューアー等では利用できない場合があります。本文が短い場合は文章を選択してください。画像・動画の内容そのものは判定しません。

## Few-shot

`extension/profile.json` に、今回の会話で参照できる過去の対話から8例を用意しました。全文の過去ログを取得したものではありません。

- `evidence`: 対話の引用または抜粋。
- `candidate`: その対話を参考に作成した評価対象の例。実際に閲覧したページではありません。
- `label`: 「好き」「苦手」「中立」。初期ラベルは制作時の仮説で、本人の採点結果ではありません。

設定画面で修正して保存できます。医療・住所・恋愛等の私的情報はプロフィールに含めていません。Few-shotはJevのstateに含め、質問instructionsから明示的に参照します。ファインチューニングではありません。

## スコア

JevのScoreプリミティブに5段階の具体的な評価基準を渡し、返った0〜4のscoreを0〜100に換算します。好きになる確率ではありません。確信度は別表示し、50%未満では判断に迷いがある旨を表示します。推定の精度は本人のフィードバックで検証が必要です。

## Cloudflare Workers経由で使う

APIキーを拡張に置かない構成も同梱しています。Node.jsとCloudflareアカウントが必要です。

```sh
cd worker
npx wrangler login
npx wrangler secret put TYPESAFE_API_KEY
npx wrangler secret put RADAR_TOKEN
npx wrangler deploy
```

`RADAR_TOKEN` は十分長いランダムな文字列を自分で生成してください。拡張の設定で「Cloudflare Workers経由」を選び、デプロイ先の `https://…workers.dev/evaluate` と同じ接続トークンを保存します。接続先ホストへの追加権限は保存時に要求されます。Workersは個人利用向けで、公開サービス用のユーザー管理・利用枠管理はありません。トークンを他人へ配布しないでください。Workersへのデプロイは本成果物では実行していません。

## データと権限

操作したページのタイトル、可視本文の先頭最大12,000文字（または選択文章）、Few-shotのみを送信します。フォーム入力欄や編集可能領域は通常の本文抽出から除外します。選択した文章はそのまま評価対象になります。ページURLや閲覧履歴は送りません。ページ内に表示されている私的な文章も本文になり得るため、評価したいページで実行してください。

送信先はTypeSafe APIです。Workerモードでは指定したWorkerも経由します。Jevのキーはローカル保存で、WorkerモードのAPIキーはWorkers secretに置きます。コードは本文・キーをログ出力しません。ページ読み込み時の自動送信はありません。結果はメモリーのみで、再読み込み・ページ移動後は再実行してください。ページ内の結果表示はページから削除される場合があります。

## 検証

```sh
npm test
```

Node.js 24で9件成功。APIリクエスト形式、Few-shot投入、文字数制限、スコア換算、異常応答、Worker認証、サイズ制限、サーバーキーによる転送を検証しました。API応答はテスト用のモックです。APIキー未提供のため、実Jevへの疎通・好みの推定精度は未検証です。

## 参照した公式仕様

- https://docs.typesafe.ai/introduction/quickstart
- https://docs.typesafe.ai/primitives/score
- https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
