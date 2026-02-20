"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";

export default function StudyModePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const deckId = params.id as string;

  const [deckTitle, setDeckTitle] = useState("");
  const [cardCount, setCardCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState<"normal" | "reverse">("normal");
  const [shuffle, setShuffle] = useState(false);

  useEffect(() => {
    loadDeck();
  }, [deckId]);

  const loadDeck = async () => {
    try {
      setLoading(true);
      setError("");
      const deck = await getDeck(deckId);
      
      if (!deck) {
        setError("デッキが見つかりません");
        return;
      }

      if (user && deck.userId !== user.uid) {
        setError("このデッキにアクセスする権限がありません");
        return;
      }

      if (deck.cards.length === 0) {
        setError("このデッキにはカードがありません");
        return;
      }

      setDeckTitle(deck.title);
      setCardCount(deck.cards.length);
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
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
              {deckTitle}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              学習モードを選択してください ({cardCount}枚)
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
                {error}
              </div>
            )}

            {!error && (
              <>
                <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    出題方向を選択
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => setDirection("normal")}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                        direction === "normal"
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900 dark:border-indigo-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              direction === "normal"
                                ? "border-indigo-600 dark:border-indigo-400"
                                : "border-gray-400"
                            }`}
                          >
                            {direction === "normal" && (
                              <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            問題 → 答え
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                          通常の学習方向です
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setDirection("reverse")}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                        direction === "reverse"
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900 dark:border-indigo-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              direction === "reverse"
                                ? "border-indigo-600 dark:border-indigo-400"
                                : "border-gray-400"
                            }`}
                          >
                            {direction === "reverse" && (
                              <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            答え → 問題
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                          逆方向での学習です
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    カードの順序
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => setShuffle(false)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                        !shuffle
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900 dark:border-indigo-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              !shuffle
                                ? "border-indigo-600 dark:border-indigo-400"
                                : "border-gray-400"
                            }`}
                          >
                            {!shuffle && (
                              <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            順番通り
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                          登録した順序で学習します
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setShuffle(true)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                        shuffle
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900 dark:border-indigo-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              shuffle
                                ? "border-indigo-600 dark:border-indigo-400"
                                : "border-gray-400"
                            }`}
                          >
                            {shuffle && (
                              <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            ランダム
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                          カードをシャッフルします
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <button
                    onClick={() => router.push(`/study/${deckId}/flashcard?direction=${direction}&shuffle=${shuffle}`)}
                    className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl p-8 transition-all duration-300 hover:shadow-2xl"
                  >
                    <div className="relative z-10">
                      <div className="text-4xl font-bold mb-4">Q&A</div>
                      <h2 className="text-2xl font-bold mb-3">一問一答</h2>
                      <p className="text-indigo-100">
                        カードをめくって問題と答えを確認します
                      </p>
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <span className="text-sm font-medium">学習を開始</span>
                        <span className="text-xl">→</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  </button>

                  <button
                    onClick={() => router.push(`/study/${deckId}/typing?direction=${direction}&shuffle=${shuffle}`)}
                    className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white rounded-xl p-8 transition-all duration-300 hover:shadow-2xl"
                  >
                    <div className="relative z-10">
                      <div className="text-4xl font-bold mb-4">TYPE</div>
                      <h2 className="text-2xl font-bold mb-3">タイピング</h2>
                      <p className="text-green-100">
                        答えをタイピングして正確に覚えます
                      </p>
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <span className="text-sm font-medium">学習を開始</span>
                        <span className="text-xl">→</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  </button>
                </div>
              </>
            )}

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                学習モードについて
              </h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex gap-3">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">一問一答:</span>
                  <span>カードをクリックして問題と答えを確認。理解度に応じて進めます。</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold text-green-600 dark:text-green-400">タイピング:</span>
                  <span>問題を見て答えを入力。スペルや表記を正確に覚えられます。</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
