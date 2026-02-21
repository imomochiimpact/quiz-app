"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";
import {
  getUserCardStatuses,
  resetUserStatus,
  calculateMasteryRate,
  countCorrectCards,
  type UserStatus,
} from "@/lib/store/cardStatusStore";

export default function StudyModePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const deckId = params.id as string;

  const [deckTitle, setDeckTitle] = useState("");
  const [cardCount, setCardCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userStatus, setUserStatus] = useState<UserStatus>({});
  const [masteryRate, setMasteryRate] = useState(0);
  const [showTestSettings, setShowTestSettings] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [testQuestionCount, setTestQuestionCount] = useState(10);
  const [testTypingRatio, setTestTypingRatio] = useState(50);

  useEffect(() => {
    loadDeck();
  }, [deckId, user]);

  const loadDeck = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError("");
      const deck = await getDeck(deckId);
      
      if (!deck) {
        setError("デッキが見つかりません");
        return;
      }

      if (deck.userId !== user.uid) {
        setError("このデッキにアクセスする権限がありません");
        return;
      }

      if (deck.cards.length === 0) {
        setError("このデッキにはカードがありません");
        return;
      }

      setDeckTitle(deck.title);
      setCardCount(deck.cards.length);

      // ユーザーのカード状態を取得
      const statuses = await getUserCardStatuses(deckId, user.uid);
      setUserStatus(statuses);

      // 習得率を計算
      const rate = calculateMasteryRate(deck.cards.length, statuses);
      setMasteryRate(rate);
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (!user) return;
    if (!confirm("進捗をリセットしますか？すべての学習履歴が削除されます。")) {
      return;
    }

    try {
      setResetting(true);
      await resetUserStatus(deckId, user.uid);
      setUserStatus({});
      setMasteryRate(0);
    } catch (err) {
      console.error(err);
      alert("進捗のリセットに失敗しました");
    } finally {
      setResetting(false);
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

  const correctCount = countCorrectCards(userStatus);
  const incorrectCount = Object.keys(userStatus).length - correctCount;

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
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {deckTitle}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {cardCount}枚のカード
                </p>
              </div>
              <button
                onClick={handleResetProgress}
                disabled={resetting}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:cursor-not-allowed"
              >
                {resetting ? "リセット中..." : "進捗をリセット"}
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
                {error}
              </div>
            )}

            {!error && (
              <>
                {/* 習得率表示 */}
                <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    現在の習得率
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${masteryRate}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>正解: {correctCount}問</span>
                        <span>不正解: {incorrectCount}問</span>
                        <span>未回答: {cardCount - Object.keys(userStatus).length}問</span>
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                      {masteryRate}%
                    </div>
                  </div>
                </div>

                {/* 学習モード選択 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    学習モードを選択
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => router.push(`/study/${deckId}/typing?mode=continue`)}
                      className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-all"
                    >
                      <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        通常学習（タイピング）
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        入力形式で学習を進めます
                      </p>
                    </button>

                    <button
                      onClick={() => router.push(`/study/${deckId}/choice?mode=continue`)}
                      className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all"
                    >
                      <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        通常学習（選択問題）
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        選択肢から答えを選んで学習
                      </p>
                    </button>

                    <button
                      onClick={() => setShowTestSettings(true)}
                      className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900 transition-all"
                    >
                      <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        テストモード
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        問題数と形式をカスタマイズ
                      </p>
                    </button>

                    <button
                      onClick={() => router.push(`/study/${deckId}/flashcard?mode=continue`)}
                      className="p-6 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900 transition-all"
                    >
                      <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        フラッシュカード
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        カードめくり形式で学習
                      </p>
                    </button>
                  </div>
                </div>

                {/* テスト設定モーダル */}
                {showTestSettings && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        テスト設定
                      </h3>
                      
                      {/* 問題数設定 */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          問題数: {testQuestionCount}問
                        </label>
                        <input
                          type="range"
                          min="1"
                          max={cardCount}
                          value={testQuestionCount}
                          onChange={(e) => setTestQuestionCount(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>1問</span>
                          <span>{cardCount}問</span>
                        </div>
                      </div>

                      {/* 形式比率設定 */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          タイピング問題の割合: {testTypingRatio}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={testTypingRatio}
                          onChange={(e) => setTestTypingRatio(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>選択問題: {100 - testTypingRatio}%</span>
                          <span>タイピング: {testTypingRatio}%</span>
                        </div>
                      </div>

                      {/* ボタン */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowTestSettings(false)}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-3 rounded-lg transition-colors"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/study/${deckId}/test?count=${testQuestionCount}&typing=${testTypingRatio}`);
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition-colors"
                        >
                          開始
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 説明 */}
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    学習モードについて
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      <span className="font-semibold">通常学習:</span> 続きから学習を再開し、一周終えたら間違えた問題のみを繰り返します
                    </p>
                    <p>
                      <span className="font-semibold">テストモード:</span> 問題数と形式を選んで本番形式で挑戦
                    </p>
                    <p>
                      <span className="font-semibold">フラッシュカード:</span> カードをめくって素早く確認
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
