"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";
import { Card } from "@/types/quiz";
import {
  getUserCardStatuses,
  updateCardStatus,
  resetUserStatus,
  type UserStatus,
  type CardStatus,
} from "@/lib/store/cardStatusStore";

// カードの配列をシャッフルする関数
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 選択肢を生成する関数
function generateChoices(correctAnswer: string, allCards: Card[], direction: string, currentCardId: string): string[] {
  // 正解以外のカードから選択肢を作る
  const otherCards = allCards.filter(card => card.id !== currentCardId);
  
  // 選択肢の数（正解含めて4つ）
  const numChoices = 4;
  const numWrongChoices = numChoices - 1;
  
  // ハズレ選択肢を生成
  const wrongChoices: string[] = [];
  const shuffledOthers = shuffleArray(otherCards);
  
  for (let i = 0; i < Math.min(numWrongChoices, shuffledOthers.length); i++) {
    const wrongAnswer = direction === "reverse" 
      ? shuffledOthers[i].question 
      : shuffledOthers[i].answer;
    
    // 重複チェック
    if (wrongAnswer !== correctAnswer && !wrongChoices.includes(wrongAnswer)) {
      wrongChoices.push(wrongAnswer);
    }
  }
  
  // 選択肢が足りない場合は正解だけを返す
  if (wrongChoices.length < 1) {
    return [correctAnswer];
  }
  
  // 正解とハズレをシャッフル
  const allChoices = [...wrongChoices, correctAnswer];
  return shuffleArray(allChoices);
}

export default function ChoicePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const deckId = params.id as string;
  const direction = searchParams.get("direction") || "normal";
  const shuffle = searchParams.get("shuffle") === "true";
  const mode = searchParams.get("mode") || "normal";

  const [deckTitle, setDeckTitle] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [sessionResults, setSessionResults] = useState<{ [cardId: string]: boolean }>({});
  const [currentRound, setCurrentRound] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

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

      if (deck.cards.length < 2) {
        setError("選択問題には最低2枚のカードが必要です");
        return;
      }

      setDeckTitle(deck.title);
      setAllCards(deck.cards);
      
      // ユーザーの進捗状態を取得
      const statuses = await getUserCardStatuses(deckId, user.uid);
      setUserStatus(statuses);
      
      // 全てのカードが正解済みかチェック
      const allCorrect = deck.cards.every(card => statuses[card.id]?.isCorrect);
      
      if (allCorrect && deck.cards.length > 0) {
        // 全問正解済みの場合、完了画面を表示
        setIsCompleted(true);
        setCards(deck.cards);
        setLoading(false);
        return;
      }

      // 未回答のカードがあるかチェック
      const unansweredCards = deck.cards.filter(card => !statuses[card.id]?.isAnswered);
      
      let filteredCards: Card[];
      let round = 1;

      if (unansweredCards.length > 0) {
        // 未回答のカードがある場合は、全カードから続きを開始
        filteredCards = [...deck.cards];
        const answeredCount = deck.cards.filter(card => statuses[card.id]?.isAnswered).length;
        setCurrentIndex(answeredCount);
        round = 1;
      } else {
        // 全カード回答済みの場合は、不正解のカードのみ出題（2周目以降）
        filteredCards = deck.cards.filter(card => !statuses[card.id]?.isCorrect);
        
        if (filteredCards.length === 0) {
          // 全問正解済み
          setIsCompleted(true);
          setCards(deck.cards);
          setLoading(false);
          return;
        }
        
        setCurrentIndex(0);
        round = 2; // 2周目以降
      }

      setCurrentRound(round);
      
      // シャッフルオプションが有効な場合のみシャッフル
      const finalCards = shuffle ? shuffleArray(filteredCards) : filteredCards;
      setCards(finalCards);
      
      // 最初の問題の選択肢を生成（全てのカードから選択肢を生成）
      generateInitialChoices(finalCards, deck.cards, direction);
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInitialChoices = (cardList: Card[], allCardsList: Card[], dir: string) => {
    if (cardList.length === 0) return;
    
    const currentCard = cardList[0];
    const correctAnswer = dir === "reverse" ? currentCard.question : currentCard.answer;
    const newChoices = generateChoices(correctAnswer, allCardsList, dir, currentCard.id);
    setChoices(newChoices);
  };

  const handleChoiceSelect = async (choice: string) => {
    if (showResult || !user) return;
    
    const currentCard = cards[currentIndex];
    const correctAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;
    
    setSelectedChoice(choice);
    setShowResult(true);
    
    const isCorrect = choice === correctAnswer;
    
    // 現在のattemptCountを取得
    const currentAttemptCount = userStatus[currentCard.id]?.attemptCount || 0;
    
    if (isCorrect) {
      setCorrectCount(correctCount + 1);
      setSessionResults({ ...sessionResults, [currentCard.id]: true });
      
      // Firestoreに状態を保存（attemptCountはインクリメントしない）
      try {
        await updateCardStatus(deckId, user.uid, currentCard.id, {
          isAnswered: true,
          isCorrect: true,
          attemptCount: currentAttemptCount,
        });
        setUserStatus((prev) => ({
          ...prev,
          [currentCard.id]: { isAnswered: true, isCorrect: true, attemptCount: currentAttemptCount },
        }));
      } catch (err) {
        console.error("状態の保存に失敗しました:", err);
      }
    } else {
      setIncorrectCount(incorrectCount + 1);
      setSessionResults({ ...sessionResults, [currentCard.id]: false });
      
      // Firestoreに状態を保存（attemptCountをインクリメント）
      try {
        await updateCardStatus(deckId, user.uid, currentCard.id, {
          isAnswered: true,
          isCorrect: false,
          attemptCount: currentAttemptCount + 1,
        });
        setUserStatus((prev) => ({
          ...prev,
          [currentCard.id]: { isAnswered: true, isCorrect: false, attemptCount: currentAttemptCount + 1 },
        }));
      } catch (err) {
        console.error("状態の保存に失敗しました:", err);
      }
    }
  };

  const nextQuestion = async () => {
    const nextIndex = currentIndex + 1;
    
    setSelectedChoice(null);
    setShowResult(false);
    
    if (nextIndex < cards.length) {
      setCurrentIndex(nextIndex);
      const nextCard = cards[nextIndex];
      const correctAnswer = direction === "reverse" ? nextCard.question : nextCard.answer;
      const newChoices = generateChoices(correctAnswer, allCards.length > 0 ? allCards : cards, direction, nextCard.id);
      setChoices(newChoices);
    } else {
      // 一周終了 - 次の周に進むべきか確認
      if (!user) return;
      
      // 最新のステータスを取得
      const statuses = await getUserCardStatuses(deckId, user.uid);
      const incorrectCards = allCards.filter(card => !statuses[card.id]?.isCorrect);
      
      if (incorrectCards.length === 0) {
        // 全問正解 - 完了画面へ
        setIsCompleted(true);
        setCurrentIndex(cards.length);
      } else {
        // 不正解があれば次の周へ
        setCards(incorrectCards);
        setCurrentIndex(0);
        setCorrectCount(0);
        setIncorrectCount(0);
        setSessionResults({});
        setCurrentRound(currentRound + 1);
        
        // 新しい問題の選択肢を生成
        const firstCard = incorrectCards[0];
        const correctAnswer = direction === "reverse" ? firstCard.question : firstCard.answer;
        const newChoices = generateChoices(correctAnswer, allCards, direction, firstCard.id);
        setChoices(newChoices);
      }
    }
  };

  const resetStudy = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
    setShowResult(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    
    // シャッフルオプションが有効な場合のみ再シャッフル
    if (shuffle) {
      const shuffledCards = shuffleArray(cards);
      setCards(shuffledCards);
      generateInitialChoices(shuffledCards, allCards.length > 0 ? allCards : shuffledCards, direction);
    } else {
      generateInitialChoices(cards, allCards.length > 0 ? allCards : cards, direction);
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

  if (cards.length === 0) {
    return null;
  }

  const currentCard = cards[currentIndex];
  const isLastCard = currentIndex === cards.length - 1;
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const displayQuestion = direction === "reverse" ? currentCard.answer : currentCard.question;
  const correctAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
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
                      <div className="space-y-3">
                        {choices.map((choice, index) => (
                          <button
                            key={index}
                            onClick={() => handleChoiceSelect(choice)}
                            className="w-full text-left p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-all duration-200"
                          >
                            <span className="text-lg text-gray-900 dark:text-white">
                              {choice}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          {choices.map((choice, index) => {
                            const isCorrect = choice === correctAnswer;
                            const isSelected = choice === selectedChoice;
                            
                            let bgColor = "bg-gray-50 dark:bg-gray-700";
                            let borderColor = "border-gray-300 dark:border-gray-600";
                            let textColor = "text-gray-900 dark:text-white";
                            
                            if (isCorrect) {
                              bgColor = "bg-green-50 dark:bg-green-900";
                              borderColor = "border-green-500";
                              textColor = "text-green-700 dark:text-green-300";
                            } else if (isSelected) {
                              bgColor = "bg-red-50 dark:bg-red-900";
                              borderColor = "border-red-500";
                              textColor = "text-red-700 dark:text-red-300";
                            }
                            
                            return (
                              <div
                                key={index}
                                className={`p-4 border-2 rounded-lg ${bgColor} ${borderColor}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-lg font-semibold ${textColor}`}>
                                    {choice}
                                  </span>
                                  {isCorrect && (
                                    <span className="text-green-600 dark:text-green-400 font-bold">
                                      正解
                                    </span>
                                  )}
                                  {isSelected && !isCorrect && (
                                    <span className="text-red-600 dark:text-red-400 font-bold">
                                      あなたの選択
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={nextQuestion}
                          disabled={isLastCard}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                        >
                          {isLastCard ? "最後の問題です" : "次の問題へ"}
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
