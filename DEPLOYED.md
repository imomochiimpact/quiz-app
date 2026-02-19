# 🚀 デプロイ完了後の確認事項

## ✅ 正しいURL

あなたのアプリのURLは:
**https://my-quiz-app.pages.dev**

`main.quiz-app-afy.pages.dev` ではありません。

## 🔧 環境変数を設定してください

現在、環境変数が設定されていないため、Firebaseが正しく動作しません。

### 方法1: スクリプトで自動設定（推奨）

```bash
# 1. Wranglerにログイン（初回のみ）
npx wrangler login

# 2. 環境変数を一括設定
./setup-env.sh

# 3. 再デプロイ
npm run deploy
```

### 方法2: Cloudflareダッシュボードで手動設定

1. https://dash.cloudflare.com にアクセス
2. **Workers & Pages** → **my-quiz-app** を選択
3. **Settings** → **Environment variables** タブ
4. **Add variable** をクリックして以下を追加:

```
NEXT_PUBLIC_FIREBASE_API_KEY=（.env.localの値）
NEXT_PUBLIC_FIREBASE_APP_ID=（.env.localの値）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=（.env.localの値）
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=（.env.localの値）
NEXT_PUBLIC_FIREBASE_PROJECT_ID=（.env.localの値）
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=（.env.localの値）
```

5. 保存後、**Deployments** タブから最新のデプロイを **Retry deployment**

## 🔥 Firebase設定

環境変数設定後、Firebaseコンソールで認証ドメインを追加:

1. https://console.firebase.google.com を開く
2. プロジェクトを選択
3. **Authentication** → **Settings** → **Authorized domains**
4. **Add domain** をクリック
5. `my-quiz-app.pages.dev` を追加

## 確認

環境変数設定と再デプロイ後:
- https://my-quiz-app.pages.dev にアクセス
- ログイン機能をテスト

## トラブルシューティング

### まだSSLエラーが出る場合

1. ブラウザのキャッシュをクリア（Cmd+Shift+R）
2. 5-10分待つ（SSL証明書の伝搬待ち）
3. シークレットモードで試す

### アプリが表示されるがログインできない場合

- 環境変数が正しく設定されているか確認
- Firebaseの認証ドメインに `my-quiz-app.pages.dev` が追加されているか確認
