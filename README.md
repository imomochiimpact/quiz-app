# 暗記カードアプリ

Next.js と Firebase を使用した暗記カード学習アプリケーションです。

## 機能

- Firebase Authentication による認証（Google ログイン、メール/パスワード）
- Firestore によるデッキの作成・取得・削除
- デッキ内のカードの追加・編集・削除
- 学習モード
  - 一問一答（フラッシュカード）: カードをクリックして問題と答えを確認
  - タイピングモード: 答えを入力して正誤判定
- レスポンシブデザイン（モバイル対応）
- ダークモード対応

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Authentication を有効化
   - Google ログインを有効化
   - メール/パスワード認証を有効化
4. Firestore Database を作成（テストモードで開始可能）

### 3. 環境変数の設定

`.env.local` ファイルに以下の値を設定してください：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

これらの値は Firebase Console の「プロジェクトの設定」から取得できます。

### 4. Firestore セキュリティルールの設定

Firebase Console で Firestore Database のセキュリティルールを設定してください：

1. Firebase Console > Firestore Database > ルール タブ を開く
2. `firestore.rules` ファイルの内容をコピーして貼り付ける
3. 「公開」ボタンをクリック

このルールにより、ユーザーは自分が作成したデッキのみにアクセスできます。

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションにアクセスできます。

## プロジェクト構成

```
quiz-app/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── decks/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx  # カード編集ページ
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # デッキ作成ページ
│   │   │   └── study/
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # 学習モード選択
│   │   │           ├── flashcard/
│   │   │           │   └── page.tsx  # 一問一答モード
│   │   │           └── typing/
│   │   │               └── page.tsx  # タイピングモード
│   │   ├── login/
│   │   │   └── page.tsx              # ログインページ
│   │   ├── layout.tsx                 # ルートレイアウト
│   │   └── page.tsx                   # ダッシュボード
│   ├── lib/
│   │   ├── store/
│   │   │   └── deckStore.ts          # Firestore操作
│   │   ├── firebase.ts             # Firebase 初期化
│   │   ├── auth-context.tsx        # 認証コンテキスト
│   │   └── mock-data.ts            # モックデータ
│   └── types/
│       └── quiz.ts                 # 型定義
├── firestore.rules                 # Firestoreセキュリティルール
├── .env.local                      # 環境変数（要作成）
└── package.json
```

## 技術スタック

- Next.js 15
- TypeScript
- Firebase (Authentication, Firestore)
- Tailwind CSS

## .env.local に設定が必要な項目

| 項目名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API キー |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 認証ドメイン |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase ストレージバケット |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase メッセージング送信者 ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase アプリ ID |

## 開発

プロジェクトのビルド：

```bash
npm run build
```

本番環境での実行：

```bash
npm start
```

## ライセンス

MIT
