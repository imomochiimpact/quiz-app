import { Deck } from "@/types/quiz";

export const mockDecks: Deck[] = [
  {
    id: "deck-1",
    userId: "mock-user-1",
    title: "英単語 基礎編",
    createdAt: new Date("2026-02-01"),
    cards: [
      {
        id: "card-1",
        question: "apple",
        answer: "りんご",
        lastReviewed: new Date("2026-02-15"),
        difficulty: 1,
      },
      {
        id: "card-2",
        question: "book",
        answer: "本",
        lastReviewed: new Date("2026-02-18"),
        difficulty: 2,
      },
      {
        id: "card-3",
        question: "cat",
        answer: "猫",
        lastReviewed: new Date("2026-02-17"),
        difficulty: 1,
      },
    ],
  },
  {
    id: "deck-2",
    userId: "mock-user-1",
    title: "日本史",
    createdAt: new Date("2026-02-05"),
    cards: [
      {
        id: "card-4",
        question: "江戸幕府を開いた人物は？",
        answer: "徳川家康",
        lastReviewed: new Date("2026-02-16"),
        difficulty: 2,
      },
      {
        id: "card-5",
        question: "鎌倉幕府が成立した年は？",
        answer: "1185年（1192年説もあり）",
        lastReviewed: new Date("2026-02-14"),
        difficulty: 3,
      },
    ],
  },
  {
    id: "deck-3",
    userId: "mock-user-1",
    title: "プログラミング用語",
    createdAt: new Date("2026-02-10"),
    cards: [
      {
        id: "card-6",
        question: "DRYの原則とは？",
        answer: "Don't Repeat Yourself - 同じコードを繰り返し書かない原則",
        lastReviewed: new Date("2026-02-19"),
        difficulty: 2,
      },
      {
        id: "card-7",
        question: "RESTful APIのHTTPメソッドで、リソースの取得に使うのは？",
        answer: "GET",
        lastReviewed: new Date("2026-02-18"),
        difficulty: 1,
      },
      {
        id: "card-8",
        question: "TypeScriptのインターフェースとは？",
        answer: "オブジェクトの型を定義するための仕組み",
        lastReviewed: new Date("2026-02-17"),
        difficulty: 2,
      },
    ],
  },
];
