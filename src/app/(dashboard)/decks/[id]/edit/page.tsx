"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getDeck, addCard, updateCard, deleteCard } from "@/lib/store/deckStore";
import { Card } from "@/types/quiz";

export default function EditDeckPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const deckId = params.id as string;

  const [deckTitle, setDeckTitle] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");

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

      setDeckTitle(deck.title);
      setCards(deck.cards);
    } catch (err) {
      setError("デッキの読み込みに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      setError("問題と答えの両方を入力してください");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await addCard(deckId, {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      });
      
      setNewQuestion("");
      setNewAnswer("");
      setIsAddingCard(false);
      await loadDeck();
    } catch (err) {
      setError("カードの追加に失敗しました");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCard = async (cardId: string) => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      setError("問題と答えの両方を入力してください");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await updateCard(deckId, cardId, {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      });
      
      setEditingCardId(null);
      setNewQuestion("");
      setNewAnswer("");
      await loadDeck();
    } catch (err) {
      setError("カードの更新に失敗しました");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("本当にこのカードを削除しますか？")) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      await deleteCard(deckId, cardId);
      await loadDeck();
    } catch (err) {
      setError("カードの削除に失敗しました");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (card: Card) => {
    setEditingCardId(card.id);
    setNewQuestion(card.question);
    setNewAnswer(card.answer);
    setIsAddingCard(false);
  };

  const cancelEditing = () => {
    setEditingCardId(null);
    setNewQuestion("");
    setNewAnswer("");
    setIsAddingCard(false);
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) {
      setError("インポートするデータを入力してください");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const data = JSON.parse(importText);
      
      if (!Array.isArray(data)) {
        setError("配列形式のJSONを入力してください");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const item of data) {
        if (!item.q || !item.a) {
          errorCount++;
          continue;
        }

        try {
          await addCard(deckId, {
            question: item.q.toString().trim(),
            answer: item.a.toString().trim(),
          });
          successCount++;
        } catch (err) {
          console.error("Failed to add card:", err);
          errorCount++;
        }
      }

      setImportText("");
      setShowImportModal(false);
      await loadDeck();

      if (errorCount > 0) {
        setError(`${successCount}件追加しました（${errorCount}件は失敗しました）`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("JSON形式が正しくありません");
      } else {
        setError("インポートに失敗しました");
      }
      console.error(err);
    } finally {
      setSaving(false);
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
              カードの追加・編集・削除
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  カード一覧 ({cards.length}枚)
                </h2>
                {!isAddingCard && !editingCardId && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <span className="text-xl">↑</span>
                      一括インポート
                    </button>
                    <button
                      onClick={() => setIsAddingCard(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <span className="text-xl">+</span>
                      新しいカードを追加
                    </button>
                  </div>
                )}
              </div>

              {isAddingCard && (
                <div className="mb-6 p-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    新しいカードを追加
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        問題 (Question)
                      </label>
                      <textarea
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="例: apple"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        答え (Answer)
                      </label>
                      <textarea
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="例: りんご"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddCard}
                        disabled={saving}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                      >
                        {saving ? "追加中..." : "追加"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    {editingCardId === card.id ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          カードを編集
                        </h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            問題 (Question)
                          </label>
                          <textarea
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            答え (Answer)
                          </label>
                          <textarea
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleUpdateCard(card.id)}
                            disabled={saving}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                          >
                            {saving ? "保存中..." : "保存"}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={saving}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            問題:
                          </p>
                          <p className="text-lg text-gray-900 dark:text-white">
                            {card.question}
                          </p>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            答え:
                          </p>
                          <p className="text-lg text-gray-900 dark:text-white">
                            {card.answer}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => startEditing(card)}
                            disabled={saving || isAddingCard}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            disabled={saving || isAddingCard}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {cards.length === 0 && !isAddingCard && (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      まだカードがありません
                    </p>
                    <button
                      onClick={() => setIsAddingCard(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
                    >
                      最初のカードを追加
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                一括インポート
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                JSON形式でカードを一括追加できます。以下の形式で入力してください:
              </p>
              <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <code className="text-sm text-gray-800 dark:text-gray-200">
                  {'[{"q": "問題1", "a": "答え1"}, {"q": "問題2", "a": "答え2"}]'}
                </code>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  JSONデータ
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='[{"q": "apple", "a": "りんご"}, {"q": "banana", "a": "バナナ"}]'
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  rows={10}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkImport}
                  disabled={saving || !importText.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {saving ? "インポート中..." : "インポート"}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText("");
                    setError("");
                  }}
                  disabled={saving}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
