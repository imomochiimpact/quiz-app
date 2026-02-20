"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";
import { Card } from "@/types/quiz";

// カードの配列をシャッフルする関数
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function FlashcardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const deckId = params.id as string;
  const direction = searchParams.get("direction") || "normal";
  const shuffle = searchParams.get("shuffle") === "true";

  const [deckTitle, setDeckTitle] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

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
      
      // シャッフルオプションが有効な場合のみシャッフル
      const finalCards = shuffle ? shuffleArray(deck.cards) : deck.cards;
      setCards(finalCards);
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnown = () => {
    setKnownCount(knownCount + 1);
    nextCard();
  };

  const handleUnknown = () => {
    setUnknownCount(unknownCount + 1);
    nextCard();
  };

  const nextCard = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const previousCard = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const resetStudy = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setUnknownCount(0);
    
    // シャッフルオプションが有効な場合のみ再シャッフル
    if (shuffle) {
      const shuffledCards = shuffleArray(cards);
      setCards(shuffledCards);
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
                    className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    わかった: {knownCount}
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    わからない: {unknownCount}
                  </span>
                </div>
              </div>

              {isLastCard && isFlipped ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    学習完了
                  </h2>
                  <div className="mb-8 space-y-2">
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                      全 {cards.length} 枚のカードを学習しました
                    </p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {knownCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          わかった
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                          {unknownCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          わからない
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={resetStudy}
                      className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
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
                  <div
                    onClick={handleCardClick}
                    className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 sm:p-12 mb-6 min-h-[300px] sm:min-h-[400px] flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-3xl"
                    style={{
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-8"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      }}
                    >
                      <div className="text-center">
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">
                          問題
                        </p>
                        <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white break-words">
                          {displayQuestion}
                        </p>
                      </div>
                      <div className="absolute bottom-8 text-sm text-gray-400 dark:text-gray-500">
                        クリックして答えを表示
                      </div>
                    </div>
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-8"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <div className="text-center">
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">
                          答え
                        </p>
                        <p className="text-2xl sm:text-4xl font-bold text-indigo-600 dark:text-indigo-400 break-words">
                          {displayAnswer}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                      onClick={handleUnknown}
                      disabled={!isFlipped}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                    >
                      わからない
                    </button>
                    <button
                      onClick={handleKnown}
                      disabled={!isFlipped}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                    >
                      わかった
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={previousCard}
                      disabled={currentIndex === 0}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                    >
                      前のカード
                    </button>
                    <button
                      onClick={nextCard}
                      disabled={isLastCard}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                    >
                      次のカード
                    </button>
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
