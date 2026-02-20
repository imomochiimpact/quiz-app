"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";
import { Card } from "@/types/quiz";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// カードの配列をシャッフルする関数
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function TypingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const deckId = params.id as string;
  const direction = searchParams.get("direction") || "normal";

  const [deckTitle, setDeckTitle] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [status, setStatus] = useState<"answering" | "correct" | "wrong" | "retrying">("answering");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [requiresRetype, setRequiresRetype] = useState(false);
  const [retypeTarget, setRetypeTarget] = useState("");

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
      
      // シャッフルしたカードを使用
      const shuffledCards = shuffleArray(deck.cards);
      setCards(shuffledCards);

      // 進捗を読み込む
      const progress = await loadProgress();
      if (progress !== null && progress < shuffledCards.length) {
        setCurrentIndex(progress);
      }
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 進捗を読み込む
  const loadProgress = async (): Promise<number | null> => {
    if (!user) return null;

    try {
      const deckRef = doc(db, "decks", deckId);
      const deckSnap = await getDoc(deckRef);
      
      if (deckSnap.exists()) {
        const data = deckSnap.data();
        const userProgress = data.userProgress || {};
        const typingIndex = userProgress[user.uid]?.typingIndex;
        return typeof typingIndex === "number" ? typingIndex : null;
      }
    } catch (err) {
      console.error("進捗の読み込みに失敗しました:", err);
    }
    return null;
  };

  // 進捗を保存する
  const saveProgress = async (index: number) => {
    if (!user) return;

    try {
      const deckRef = doc(db, "decks", deckId);
      await updateDoc(deckRef, {
        [`userProgress.${user.uid}.typingIndex`]: index,
        [`userProgress.${user.uid}.lastStudied`]: new Date(),
      });
    } catch (err) {
      console.error("進捗の保存に失敗しました:", err);
    }
  };

  // 解答をチェック
  const checkAnswer = () => {
    const currentCard = cards[currentIndex];
    const correctAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;
    const normalizedUserAnswer = userAnswer.trim();
    const normalizedCorrectAnswer = correctAnswer.trim();
    
    // 完全一致チェック（大文字小文字区別なし）
    const correct = normalizedUserAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase();
    
    if (correct) {
      setStatus("correct");
      setShowResult(true);
      setCorrectCount(correctCount + 1);
    } else {
      setStatus("wrong");
      setShowResult(true);
      setIncorrectCount(incorrectCount + 1);
      // 不正解の場合、強制リタイプモードに移行
      setRequiresRetype(true);
      setRetypeTarget(correctAnswer);
    }
  };

  // 「わからない」ボタンの処理
  const handleDontKnow = () => {
    const currentCard = cards[currentIndex];
    const correctAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;
    
    setStatus("wrong");
    setShowResult(true);
    setIncorrectCount(incorrectCount + 1);
    setUserAnswer(""); // 入力をリセット
    // 強制リタイプモードに移行
    setRequiresRetype(true);
    setRetypeTarget(correctAnswer);
  };

  // リタイプのチェック
  const checkRetype = () => {
    const normalizedUserAnswer = userAnswer.trim();
    const normalizedRetypeTarget = retypeTarget.trim();
    
    // 完全一致チェック（大文字小文字区別なし）
    if (normalizedUserAnswer.toLowerCase() === normalizedRetypeTarget.toLowerCase()) {
      setStatus("retrying");
      return true;
    }
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userAnswer.trim()) return;

    if (requiresRetype) {
      // リタイプモードの場合
      if (checkRetype()) {
        // リタイプ成功、次の問題へ進む準備
        setRequiresRetype(false);
        setRetypeTarget("");
      }
    } else if (!showResult) {
      // 通常の解答モード
      checkAnswer();
    }
  };

  // 次の問題へ
  const nextQuestion = async () => {
    const nextIndex = currentIndex + 1;
    
    // 進捗を保存（次に進む前）
    await saveProgress(nextIndex);
    
    setUserAnswer("");
    setShowResult(false);
    setStatus("answering");
    setRequiresRetype(false);
    setRetypeTarget("");
    
    if (nextIndex < cards.length) {
      setCurrentIndex(nextIndex);
    }
  };

  // 学習をリセット
  const resetStudy = async () => {
    // 進捗をリセット
    await saveProgress(0);
    
    setCurrentIndex(0);
    setUserAnswer("");
    setShowResult(false);
    setStatus("answering");
    setCorrectCount(0);
    setIncorrectCount(0);
    setRequiresRetype(false);
    setRetypeTarget("");
    
    // カードを再シャッフル
    const shuffledCards = shuffleArray(cards);
    setCards(shuffledCards);
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

  const currentCard = cards[currentIndex];
  const isLastCard = currentIndex === cards.length - 1;
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const displayQuestion = direction === "reverse" ? currentCard.answer : currentCard.question;
  const displayAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;
  
  // リタイプが完了しているかチェック
  const retypeCompleted = requiresRetype && status === "retrying";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー - ホームに戻るボタン */}
          <div className="mb-4 sm:mb-6 flex justify-between items-center">
            <button
              onClick={() => router.push(`/study/${deckId}`)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 text-sm sm:text-base"
            >
              <span className="text-xl">←</span>
              モード選択に戻る
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              ホームに戻る
            </button>
          </div>

          {error ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
              <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
                {error}
              </div>
            </div>
          ) : (
            <>
              {/* 進捗バー */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {deckTitle}
                  </h1>
                  <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                    {currentIndex + 1} / {cards.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="mt-4 flex gap-6 text-base">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✓</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      正解: {correctCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✗</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      不正解: {incorrectCount}
                    </span>
                  </div>
                </div>
              </div>

              {isLastCard && showResult && (!requiresRetype || retypeCompleted) ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    学習完了！
                  </h2>
                  <div className="mb-8 space-y-2">
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                      全 {cards.length} 問を解答しました
                    </p>
                    <div className="flex justify-center gap-6 mt-6">
                      <div className="text-center bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                        <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                          {correctCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          正解
                        </div>
                      </div>
                      <div className="text-center bg-red-50 dark:bg-red-900 p-4 rounded-lg">
                        <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                          {incorrectCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          不正解
                        </div>
                      </div>
                      <div className="text-center bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg">
                        <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                          {cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          正解率
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={resetStudy}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      もう一度学習する
                    </button>
                    <button
                      onClick={() => router.push("/")}
                      className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      ダッシュボードに戻る
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 sm:p-12 mb-6">
                    <div className="text-center mb-8">
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">
                        問題
                      </p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white break-words">
                        {displayQuestion}
                      </p>
                    </div>

                    {!showResult ? (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            答えを入力してください
                          </label>
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="答えを入力"
                            className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={!userAnswer.trim()}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                          >
                            解答する
                          </button>
                          <button
                            type="button"
                            onClick={handleDontKnow}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                          >
                            わからない
                          </button>
                        </div>
                      </form>
                    ) : requiresRetype && !retypeCompleted ? (
                      <div className="space-y-6">
                        {/* 不正解の場合の正解表示 */}
                        <div className="p-6 rounded-lg border-2 bg-red-50 dark:bg-red-900 border-red-500">
                          <p className="text-2xl font-bold mb-4 text-red-700 dark:text-red-300">
                            不正解
                          </p>
                          <div className="space-y-3">
                            {userAnswer && (
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  あなたの解答:
                                </p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {userAnswer}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                正しい答え:
                              </p>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-800 p-4 rounded">
                                {displayAnswer}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 強制リタイプフォーム */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            正しい答えを入力して、もう一度挑戦しましょう
                          </p>
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="正しい答えを入力"
                            className="w-full px-4 py-3 text-lg border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={!userAnswer.trim()}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                          >
                            確認する
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 正解またはリタイプ完了の表示 */}
                        <div
                          className={`p-6 rounded-lg border-2 ${
                            status === "correct"
                              ? "bg-green-50 dark:bg-green-900 border-green-500"
                              : "bg-blue-50 dark:bg-blue-900 border-blue-500"
                          }`}
                        >
                          <p
                            className={`text-2xl font-bold mb-4 ${
                              status === "correct"
                                ? "text-green-700 dark:text-green-300"
                                : "text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {status === "correct" ? "✓ 正解！" : "✓ リタイプ完了"}
                          </p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                正しい答え:
                              </p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {displayAnswer}
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={nextQuestion}
                          disabled={isLastCard}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                        >
                          {isLastCard ? "最後の問題です" : "次の問題へ →"}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
