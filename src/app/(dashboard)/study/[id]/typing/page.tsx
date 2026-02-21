"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";
import { Card } from "@/types/quiz";
import {
  getUserCardStatuses,
  updateCardStatus,
  countAnsweredCards,
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

export default function TypingPage() {
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
  const [userStatus, setUserStatus] = useState<UserStatus>({});
  const [allCards, setAllCards] = useState<Card[]>([]);
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

      setDeckTitle(deck.title);
      setAllCards(deck.cards);

      // ユーザーのカード状態を取得
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
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  // 解答をチェック
  const checkAnswer = async () => {
    if (!user) return;

    const currentCard = cards[currentIndex];
    const correctAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;
    const normalizedUserAnswer = userAnswer.trim();
    const normalizedCorrectAnswer = correctAnswer.trim();
    
    // 完全一致チェック（大文字小文字区別なし）
    const correct = normalizedUserAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase();
    
    // 現在のattemptCountを取得
    const currentAttemptCount = userStatus[currentCard.id]?.attemptCount || 0;
    
    if (correct) {
      setStatus("correct");
      setShowResult(true);
      setCorrectCount(correctCount + 1);
      setSessionResults({ ...sessionResults, [currentCard.id]: true });

      // Firestoreに正解を保存（attemptCountはインクリメントしない）
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
      setStatus("wrong");
      setShowResult(true);
      setIncorrectCount(incorrectCount + 1);
      setSessionResults({ ...sessionResults, [currentCard.id]: false });
      // 不正解の場合、強制リタイプモードに移行
      setRequiresRetype(true);
      setRetypeTarget(correctAnswer);

      // Firestoreに不正解を保存（attemptCountをインクリメント）
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

  // 「わからない」ボタンの処理
  const handleDontKnow = async () => {
    if (!user) return;

    const currentCard = cards[currentIndex];
    const correctAnswer = direction === "reverse" ? currentCard.question : currentCard.answer;
    
    // 現在のattemptCountを取得
    const currentAttemptCount = userStatus[currentCard.id]?.attemptCount || 0;
    
    setStatus("wrong");
    setShowResult(true);
    setIncorrectCount(incorrectCount + 1);
    setSessionResults({ ...sessionResults, [currentCard.id]: false });
    setUserAnswer(""); // 入力をリセット
    // 強制リタイプモードに移行
    setRequiresRetype(true);
    setRetypeTarget(correctAnswer);

    // Firestoreに不正解を保存（attemptCountをインクリメント）
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      await checkAnswer();
    }
  };

  // 次の問題へ
  const nextQuestion = async () => {
    const nextIndex = currentIndex + 1;
    
    setUserAnswer("");
    setShowResult(false);
    setStatus("answering");
    setRequiresRetype(false);
    setRetypeTarget("");
    
    if (nextIndex < cards.length) {
      setCurrentIndex(nextIndex);
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
      }
    }
  };

  // 学習をリセット
  const resetStudy = () => {
    setCurrentIndex(0);
    setUserAnswer("");
    setShowResult(false);
    setStatus("answering");
    setCorrectCount(0);
    setIncorrectCount(0);
    setRequiresRetype(false);
    setRetypeTarget("");
    
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

              {/* 全問正解完了画面 */}
              {isCompleted ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                  <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-6 text-center">
                    全問正解！
                  </h2>
                  <p className="text-center text-gray-700 dark:text-gray-300 mb-8">
                    すべての問題を正解しました！
                  </p>

                  {/* 各カードの回答試行数 */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      各問題の回答試行数
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {allCards.map((card) => {
                        const attemptCount = userStatus[card.id]?.attemptCount || 0;
                        return (
                          <div
                            key={card.id}
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {card.question}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {card.answer}
                              </p>
                            </div>
                            <div className="ml-4 text-right">
                              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {attemptCount}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                回間違え
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ボタン */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={async () => {
                        if (user) {
                          await resetUserStatus(deckId, user.uid);
                          window.location.reload();
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                      また1から始める
                    </button>
                    <button
                      onClick={() => router.push(`/study/${deckId}`)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                      モード選択に戻る
                    </button>
                  </div>
                </div>
              ) : isLastCard && showResult && (!requiresRetype || retypeCompleted) ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    {currentRound === 1 ? "1周目完了" : `${currentRound}周目完了`}
                  </h2>
                  <div className="mb-8 space-y-2">
                    <p className="text-lg text-gray-700 dark:text-gray-300 text-center">
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

                  {/* 今回の正解/不正解問題リスト */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      今回の結果
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 正解した問題 */}
                      <div>
                        <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                          正解した問題 ({correctCount}問)
                        </h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {cards
                            .filter((card) => sessionResults[card.id] === true)
                            .map((card) => (
                              <div
                                key={card.id}
                                className="p-2 bg-green-50 dark:bg-green-900 rounded text-sm"
                              >
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {card.question}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {card.answer}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* 不正解だった問題 */}
                      <div>
                        <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                          不正解だった問題 ({incorrectCount}問)
                        </h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {cards
                            .filter((card) => sessionResults[card.id] === false)
                            .map((card) => (
                              <div
                                key={card.id}
                                className="p-2 bg-red-50 dark:bg-red-900 rounded text-sm"
                              >
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {card.question}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {card.answer}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={nextQuestion}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      {incorrectCount > 0 ? "間違えた問題に進む" : "次へ"}
                    </button>
                    <button
                      onClick={() => router.push(`/study/${deckId}`)}
                      className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      モード選択に戻る
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
                            {status === "correct" ? "正解" : "リタイプ完了"}
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
