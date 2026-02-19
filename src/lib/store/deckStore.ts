import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Deck, Card } from "@/types/quiz";

const DECKS_COLLECTION = "decks";

export async function addDeck(userId: string, title: string): Promise<string> {
  try {
    const deckData = {
      userId,
      title,
      cards: [],
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, DECKS_COLLECTION), deckData);
    return docRef.id;
  } catch (error) {
    console.error("デッキの追加に失敗しました:", error);
    throw error;
  }
}

export async function getDecks(userId: string): Promise<Deck[]> {
  try {
    const q = query(
      collection(db, DECKS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const decks: Deck[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      decks.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        cards: data.cards || [],
        createdAt: data.createdAt.toDate(),
      });
    });

    return decks;
  } catch (error) {
    console.error("デッキの取得に失敗しました:", error);
    throw error;
  }
}

export async function deleteDeck(deckId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, DECKS_COLLECTION, deckId));
  } catch (error) {
    console.error("デッキの削除に失敗しました:", error);
    throw error;
  }
}

export async function updateDeck(deckId: string, updates: Partial<Deck>): Promise<void> {
  try {
    const deckRef = doc(db, DECKS_COLLECTION, deckId);
    await updateDoc(deckRef, updates);
  } catch (error) {
    console.error("デッキの更新に失敗しました:", error);
    throw error;
  }
}

export async function getDeck(deckId: string): Promise<Deck | null> {
  try {
    const deckRef = doc(db, DECKS_COLLECTION, deckId);
    const deckSnap = await getDoc(deckRef);

    if (!deckSnap.exists()) {
      return null;
    }

    const data = deckSnap.data();
    return {
      id: deckSnap.id,
      userId: data.userId,
      title: data.title,
      cards: data.cards || [],
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error("デッキの取得に失敗しました:", error);
    throw error;
  }
}

export async function addCard(
  deckId: string,
  cardData: { question: string; answer: string }
): Promise<void> {
  try {
    const deckRef = doc(db, DECKS_COLLECTION, deckId);
    const newCard: Card = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question: cardData.question,
      answer: cardData.answer,
      lastReviewed: null,
      difficulty: 1,
    };

    await updateDoc(deckRef, {
      cards: arrayUnion(newCard),
    });
  } catch (error) {
    console.error("カードの追加に失敗しました:", error);
    throw error;
  }
}

export async function updateCard(
  deckId: string,
  cardId: string,
  cardData: { question: string; answer: string }
): Promise<void> {
  try {
    const deck = await getDeck(deckId);
    if (!deck) {
      throw new Error("デッキが見つかりません");
    }

    const updatedCards = deck.cards.map((card) =>
      card.id === cardId
        ? { ...card, question: cardData.question, answer: cardData.answer }
        : card
    );

    const deckRef = doc(db, DECKS_COLLECTION, deckId);
    await updateDoc(deckRef, {
      cards: updatedCards,
    });
  } catch (error) {
    console.error("カードの更新に失敗しました:", error);
    throw error;
  }
}

export async function deleteCard(deckId: string, cardId: string): Promise<void> {
  try {
    const deck = await getDeck(deckId);
    if (!deck) {
      throw new Error("デッキが見つかりません");
    }

    const updatedCards = deck.cards.filter((card) => card.id !== cardId);

    const deckRef = doc(db, DECKS_COLLECTION, deckId);
    await updateDoc(deckRef, {
      cards: updatedCards,
    });
  } catch (error) {
    console.error("カードの削除に失敗しました:", error);
    throw error;
  }
}
