export interface Card {
  id: string;
  question: string;
  answer: string;
  lastReviewed: Date | null;
  difficulty: number;
}

export interface Deck {
  id: string;
  userId: string;
  title: string;
  cards: Card[];
  createdAt: Date;
}
