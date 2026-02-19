"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";
import { Card } from "@/types/quiz";

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
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

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
      setCards(deck.cards);
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    const currentCard = cards[currentIndex];
    const correctAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
    
    const correct = normalizedUserAnswer === normalizedCorrectAnswer;
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setCorrectCount(correctCount + 1);
    } else {
      setIncorrectCount(incorrectCount + 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userAnswer.trim() && !showResult) {
      checkAnswer();
    }
  };

  const nextQuestion = () => {
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const resetStudy = () => {
    setCurrentIndex(0);
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setIncorrectCount(0);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <button
              onClick={() => router.push(`/study/${deckId}`)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 text-sm sm:text-base"
            >
              <span className="text-xl">←</span>
              モード選択に戻る
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {deckTitle}
                  </h1>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentIndex + 1} / {cards.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    正解: {correctCount}
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    不正解: {incorrectCount}
                  </span>
                </div>
              </div>

              {isLastCard && showResult ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    学習完了
                  </h2>
                  <div className="mb-8 space-y-2">
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                      全 {cards.length} 問を解答しました
                    </p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {correctCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          正解
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                          {incorrectCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          不正解
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                          {cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
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
                            className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!userAnswer.trim()}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                        >
                          解答する
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-6">
                        <div
                          className={`p-6 rounded-lg border-2 ${
                            isCorrect
                              ? "bg-green-50 dark:bg-green-900 border-green-500"
                              : "bg-red-50 dark:bg-red-900 border-red-500"
                          }`}
                        >
                          <p
                            className={`text-2xl font-bold mb-4 ${
                              isCorrect
                                ? "text-green-700 dark:text-green-300"
                                : "text-red-700 dark:text-red-300"
                            }`}
                          >
                            {isCorrect ? "正解" : "不正解"}
                          </p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                あなたの解答:
                              </p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {userAnswer}
                              </p>
                            </div>
                            {!isCorrect && (
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  正しい答え:
                                </p>
                                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                  {displayAnswer}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={nextQuestion}
                          disabled={isLastCard}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                        >
                          {isLastCard ? "学習完了" : "次の問題へ"}
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
