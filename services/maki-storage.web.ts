import type { Deck, Flashcard, Rating } from '@/types/maki';

// Web stub - SQLite not supported on web platform
// This prevents Metro bundler from trying to resolve expo-sqlite imports

export const makiStorage = {
  initialize: async () => {},
  getAllDecks: async (): Promise<Deck[]> => [],
  getDeck: async (deckId: string): Promise<Deck | null> => null,
  saveDeck: async (deck: Deck) => {},
  deleteDeck: async (deckId: string) => {},
  updateFlashcard: async (deckId: string, cardId: string, updates: Partial<Flashcard>) => {},
  setFlashcardRating: async (deckId: string, cardId: string, rating: Rating) => {},
  setFlashcardOption: async (deckId: string, cardId: string, optionId: string) => {},
  resetDeckProgress: async (deckId: string) => {},
};

export type MakiStorage = typeof makiStorage;
