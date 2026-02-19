"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { addDeck } from "@/lib/store/deckStore";

export default function NewDeckPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("ログインが必要です");
      return;
    }

    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await addDeck(user.uid, title.trim());
      router.push("/");
    } catch (err) {
      setError("デッキの作成に失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/")}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2"
            >
              <span className="text-xl">←</span>
              ダッシュボードに戻る
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              新しいデッキを作成
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              学習したいテーマのデッキを作成しましょう
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  デッキのタイトル
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 英単語 基礎編、日本史、プログラミング用語"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-lg"
                  maxLength={100}
                  required
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  最大100文字まで入力できます
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {loading ? "作成中..." : "デッキを作成"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              次のステップ
            </h2>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              デッキを作成後、カードを追加して学習を開始できます。各カードには質問と回答を設定できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
