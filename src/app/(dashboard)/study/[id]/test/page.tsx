"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck } from "@/lib/store/deckStore";
import { Card } from "@/types/quiz";
import {
  batchUpdateCardStatuses,
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
function generateChoices(correctAnswer: string, allCards: Card[], currentCardId: string): string[] {
  const otherCards = allCards.filter(card => card.id !== currentCardId);
  const numChoices = 4;
  const numWrongChoices = numChoices - 1;
  
  const wrongChoices: string[] = [];
  const shuffledOthers = shuffleArray(otherCards);
  
  for (let i = 0; i < Math.min(numWrongChoices, shuffledOthers.length); i++) {
    const wrongAnswer = shuffledOthers[i].answer;
    if (wrongAnswer !== correctAnswer && !wrongChoices.includes(wrongAnswer)) {
      wrongChoices.push(wrongAnswer);
    }
  }
  
  if (wrongChoices.length < 1) {
    return [correctAnswer];
  }
  
  const allChoices = [...wrongChoices, correctAnswer];
  return shuffleArray(allChoices);
}

type TestQuestion = {
  card: Card;
  type: "typing" | "choice";
  choices?: string[];
};

export default function TestPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const deckId = params.id as string;
  const questionCount = Number(searchParams.get("count") || "10");
  const typingRatio = Number(searchParams.get("typing") || "50");

  const [deckTitle, setDeckTitle] = useState("");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadTest();
  }, [deckId, user]);

  const loadTest = async () => {
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
      
      // ランダムにカードを選択
      const shuffledCards = shuffleArray(deck.cards);
      const selectedCards = shuffledCards.slice(0, Math.min(questionCount, deck.cards.length));
      
      // タイピング問題と選択問題の数を計算
      const typingCount = Math.round(selectedCards.length * (typingRatio / 100));
      const choiceCount = selectedCards.length - typingCount;
      
      // 問題タイプを割り当て
      const testQuestions: TestQuestion[] = [];
      
      for (let i = 0; i < selectedCards.length; i++) {
        const card = selectedCards[i];
        if (i < typingCount) {
          testQuestions.push({ card, type: "typing" });
        } else {
          const choices = generateChoices(card.answer, deck.cards, card.id);
          testQuestions.push({ card, type: "choice", choices });
        }
      }
      
      // 問題をシャッフル
      setQuestions(shuffleArray(testQuestions));
    } catch (err) {
      setError("テストの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    const currentQuestion = questions[currentIndex];
    const correctAnswer = currentQuestion.card.answer;
    
    let isCorrect = false;
    if (currentQuestion.type === "typing") {
      isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
    } else {
      isCorrect = selectedChoice === correctAnswer;
    }
    
    setAnswers({ ...answers, [currentQuestion.card.id]: isCorrect });
    setShowResult(true);
    
    if (isCorrect) {
      setCorrectCount(correctCount + 1);
    } else {
      setIncorrectCount(incorrectCount + 1);
    }
  };

  const nextQuestion = () => {
    const nextIndex = currentIndex + 1;
    
    setUserAnswer("");
    setSelectedChoice(null);
    setShowResult(false);
    setCurrentIndex(nextIndex);
  };

  const submitTest = async () => {
    if (!user) return;
    
    // Firestoreに結果を一括保存
    const updates: { cardId: string; status: CardStatus }[] = [];
    
    for (const question of questions) {
      updates.push({
        cardId: question.card.id,
        status: {
          isAnswered: true,
          isCorrect: answers[question.card.id] || false,
        },
      });
    }
    
    try {
      await batchUpdateCardStatuses(deckId, user.uid, updates);
      router.push(`/study/${deckId}`);
    } catch (err) {
      console.error("テスト結果の保存に失敗しました:", err);
      setError("結果の保存に失敗しました");
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

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            エラー
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {error || "問題が見つかりません"}
          </p>
          <button
            onClick={() => router.push(`/study/${deckId}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // テスト完了
  if (currentIndex >= questions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              テスト完了
            </h2>
            <div className="mb-8 space-y-2">
              <div className="flex justify-center gap-8 mt-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                    {correctCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">正解</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                    {incorrectCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">不正解</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                    {Math.round((correctCount / questions.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">正解率</div>
                </div>
              </div>
            </div>

            {/* 問題リスト */}
            <div className="mb-8 text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                問題の結果
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 正解した問題 */}
                <div>
                  <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                    正解した問題 ({correctCount}問)
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {questions
                      .filter((q) => answers[q.card.id] === true)
                      .map((q) => (
                        <div
                          key={q.card.id}
                          className="p-2 bg-green-50 dark:bg-green-900 rounded text-sm"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {q.card.question}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {q.card.answer}
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
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {questions
                      .filter((q) => answers[q.card.id] === false)
                      .map((q) => (
                        <div
                          key={q.card.id}
                          className="p-2 bg-red-50 dark:bg-red-900 rounded text-sm"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {q.card.question}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {q.card.answer}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={submitTest}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                結果を保存して終了
              </button>
              <button
                onClick={() => router.push(`/study/${deckId}`)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                保存せずに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentQuestion.type === "typing" && !userAnswer.trim()) return;
    if (currentQuestion.type === "choice" && !selectedChoice) return;
    
    if (!showResult) {
      checkAnswer();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/study/${deckId}`)}
            className="text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {deckTitle} - テストモード
          </h1>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>進捗: {currentIndex + 1} / {questions.length}</span>
              <span>正解: {correctCount} | 不正解: {incorrectCount}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 問題カード */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold mb-4">
              {currentQuestion.type === "typing" ? "タイピング問題" : "選択問題"}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">問題</p>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white break-words">
              {currentQuestion.card.question}
            </p>
          </div>

          {!showResult ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {currentQuestion.type === "typing" ? (
                <>
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
                  <button
                    type="submit"
                    disabled={!userAnswer.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                  >
                    解答する
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.choices?.map((choice, index) => {
                    const isSelected = selectedChoice === choice;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedChoice(choice)}
                        className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900 dark:border-indigo-400"
                            : "border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600"
                        }`}
                      >
                        <span className="text-lg text-gray-900 dark:text-white break-words">
                          {choice}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="submit"
                    disabled={!selectedChoice}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg mt-4"
                  >
                    解答する
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              <div
                className={`p-6 rounded-lg border-2 ${
                  answers[currentQuestion.card.id]
                    ? "bg-green-50 dark:bg-green-900 border-green-500"
                    : "bg-red-50 dark:bg-red-900 border-red-500"
                }`}
              >
                <p
                  className={`text-2xl font-bold mb-4 ${
                    answers[currentQuestion.card.id]
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {answers[currentQuestion.card.id] ? "正解" : "不正解"}
                </p>
                <div className="space-y-3">
                  {currentQuestion.type === "typing" && userAnswer && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        あなたの解答:
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {userAnswer}
                      </p>
                    </div>
                  )}
                  {currentQuestion.type === "choice" && selectedChoice && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        あなたの選択:
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedChoice}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      正しい答え:
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-800 p-4 rounded">
                      {currentQuestion.card.answer}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={nextQuestion}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
              >
                {isLastQuestion ? "結果を見る" : "次の問題へ"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
