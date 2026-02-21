import { doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CardStatus {
  isAnswered: boolean;
  isCorrect: boolean;
  attemptCount?: number;
}

export interface UserStatus {
  [cardId: string]: CardStatus;
}

// 特定デッキのユーザーの全カード状態を取得
export async function getUserCardStatuses(
  deckId: string,
  userId: string
): Promise<UserStatus> {
  try {
    const deckRef = doc(db, "decks", deckId);
    const deckSnap = await getDoc(deckRef);

    if (!deckSnap.exists()) {
      return {};
    }

    const data = deckSnap.data();
    const userStatus = data.userStatus || {};
    return userStatus[userId] || {};
  } catch (err) {
    console.error("カード状態の取得に失敗しました:", err);
    return {};
  }
}

// 特定カードの状態を更新
export async function updateCardStatus(
  deckId: string,
  userId: string,
  cardId: string,
  status: CardStatus
): Promise<void> {
  try {
    const deckRef = doc(db, "decks", deckId);
    await updateDoc(deckRef, {
      [`userStatus.${userId}.${cardId}`]: status,
    });
  } catch (err) {
    console.error("カード状態の更新に失敗しました:", err);
    throw err;
  }
}

// 複数カードの状態を一括更新（バッチ処理）
export async function batchUpdateCardStatuses(
  deckId: string,
  userId: string,
  statuses: { cardId: string; status: CardStatus }[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const deckRef = doc(db, "decks", deckId);

    statuses.forEach(({ cardId, status }) => {
      batch.update(deckRef, {
        [`userStatus.${userId}.${cardId}`]: status,
      });
    });

    await batch.commit();
  } catch (err) {
    console.error("カード状態の一括更新に失敗しました:", err);
    throw err;
  }
}

// 特定デッキの全ユーザーステータスをリセット
export async function resetUserStatus(
  deckId: string,
  userId: string
): Promise<void> {
  try {
    const deckRef = doc(db, "decks", deckId);
    await updateDoc(deckRef, {
      [`userStatus.${userId}`]: {},
    });
  } catch (err) {
    console.error("ステータスのリセットに失敗しました:", err);
    throw err;
  }
}

// 習得率を計算
export function calculateMasteryRate(
  totalCards: number,
  userStatus: UserStatus
): number {
  if (totalCards === 0) return 0;

  const correctCount = Object.values(userStatus).filter(
    (status) => status.isCorrect
  ).length;

  return Math.round((correctCount / totalCards) * 100);
}

// 回答済み問題数をカウント
export function countAnsweredCards(userStatus: UserStatus): number {
  return Object.values(userStatus).filter((status) => status.isAnswered).length;
}

// 正解済み問題数をカウント
export function countCorrectCards(userStatus: UserStatus): number {
  return Object.values(userStatus).filter((status) => status.isCorrect).length;
}
