#!/bin/bash

# .env.localからCloudflare Pagesに環境変数を設定するスクリプト

PROJECT_NAME="quiz-app"

echo "🔧 Cloudflare Pagesに環境変数を設定します..."
echo "プロジェクト: $PROJECT_NAME"
echo ""

# Wranglerがログイン済みか確認
if ! npx wrangler whoami &>/dev/null; then
  echo "⚠️  Wranglerにログインしていません"
  echo "次のコマンドを実行してください:"
  echo ""
  echo "  npx wrangler login"
  echo ""
  exit 1
fi

# .env.localが存在するか確認
if [ ! -f .env.local ]; then
  echo "❌ .env.local ファイルが見つかりません"
  exit 1
fi

echo "環境変数を設定中..."
echo ""

# .env.localから環境変数を読み込んで設定
while IFS='=' read -r key value; do
  # コメント行と空行をスキップ
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # クォートを削除
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  echo "📝 Setting $key..."
  echo "$value" | npx wrangler pages secret put "$key" --project-name="$PROJECT_NAME" 2>&1 | grep -v "Enter a secret value"
done < .env.local

echo ""
echo "✅ 環境変数の設定が完了しました！"
echo ""
echo "次のステップ:"
echo "1. 再デプロイ: npm run deploy"
echo "2. サイトを確認: https://$PROJECT_NAME.pages.dev"
echo "3. Firebase認証ドメイン追加: $PROJECT_NAME.pages.dev"
