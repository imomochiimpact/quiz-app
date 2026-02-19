# Vercelデプロイ手順

このNext.jsアプリケーションをVercelにデプロイする手順です。

## 前提条件
- GitHubアカウント
- Vercelアカウント（GitHub連携で無料登録可能）

## デプロイ手順

### 1. GitHubリポジトリの準備

まず、プロジェクトをGitHubにプッシュします：

```bash
# Gitリポジトリの初期化（まだの場合）
git init

# ファイルをステージング
git add .

# コミット
git commit -m "Initial commit"

# GitHubにリポジトリを作成後、リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# プッシュ
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート

1. [Vercel](https://vercel.com)にアクセスしてログイン
2. "Add New Project" をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定は自動検出されるので、そのまま進む

### 3. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定します：

**Settings → Environment Variables** から以下を追加：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**重要**: これらの値は `.env.local` ファイルから取得できます。

### 4. デプロイ

環境変数を設定後、"Deploy" ボタンをクリックするだけです。

数分でデプロイが完了し、`https://your-app.vercel.app` のようなURLでアクセスできます。

## 自動デプロイ

Vercelは自動的にGitHubと連携し、以下のような自動デプロイを提供します：

- **mainブランチへのプッシュ** → 本番環境に自動デプロイ
- **プルリクエスト** → プレビュー環境を自動生成

## Firebase認証ドメインの追加

デプロイ後、Firebaseコンソールで以下の設定が必要です：

1. [Firebaseコンソール](https://console.firebase.google.com)を開く
2. プロジェクトを選択
3. **Authentication → Settings → Authorized domains**
4. Vercelから取得したドメイン（例: `your-app.vercel.app`）を追加

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# ローカルでビルドをテスト
npm run build
```

エラーが出る場合は、コードを修正してから再度プッシュしてください。

### 環境変数が反映されない場合

1. Vercelダッシュボードで環境変数を確認
2. すべて `NEXT_PUBLIC_` プレフィックスが付いているか確認
3. 再デプロイ（Deployments → 最新のデプロイ → "Redeploy"）

## ローカル開発

デプロイ後も、ローカルでの開発は変わりません：

```bash
npm run dev
```

変更をプッシュすれば、自動的に本番環境に反映されます。
