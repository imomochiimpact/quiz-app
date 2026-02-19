"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDecks, deleteDeck } from "@/lib/store/deckStore";
import { Deck } from "@/types/quiz";

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDecks();
    }
  }, [user]);

  const loadDecks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError("");
      const fetchedDecks = await getDecks(user.uid);
      setDecks(fetchedDecks);
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm("本当にこのデッキを削除しますか？")) {
      return;
    }

    try {
      setDeletingId(deckId);
      await deleteDeck(deckId);
      setDecks(decks.filter((deck) => deck.id !== deckId));
    } catch (err) {
      setError("デッキの削除に失敗しました");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                暗記カードダッシュボード
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                学習を始めるデッキを選択してください
              </p>
            </div>
            <div className="text-right">
              {user && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {user.email}
                  </p>
                  <button
                    onClick={logout}
                    className="text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => router.push("/decks/new")}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              新しいデッキを作成
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {deck.title}
                  </h2>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span>カード数: {deck.cards.length}枚</span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {deck.cards.length > 0 ? "学習可能" : "カードなし"}
                    </span>
                  </div>
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      作成日
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {deck.createdAt.toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/study/${deck.id}`)}
                        disabled={deck.cards.length === 0}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                      >
                        学習を開始
                      </button>
                      <button
                        onClick={() => router.push(`/decks/${deck.id}/edit`)}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                      >
                        編集
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
                      disabled={deletingId === deck.id}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:bg-red-500 dark:hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      {deletingId === deck.id ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {decks.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 max-w-md mx-auto">
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                    デッキがまだありません
                  </p>
                  <p className="text-gray-600 dark:text-gray-500 text-sm mb-6">
                    新しいデッキを作成して学習を始めましょう
                  </p>
                  <button
                    onClick={() => router.push("/decks/new")}
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    最初のデッキを作成
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
