export type Rating = 'bad' | 'ok' | 'good' | 'perfect';

export type FlashcardOption = {
  id: string;
  text: string;
};

export type Flashcard = {
  id: string;
  question: string;
  imageUri?: string;
  options: FlashcardOption[];
  correctOptionId: string;
  createdAt: string;
  lastRating?: Rating;
};

export type Deck = {
  id: string;
  title: string;
  archived: boolean;
  cards: Flashcard[];
};

export const RATING_META: Record<Rating, { label: string; color: string }> = {
  bad: { label: 'Bad', color: '#EF4444' },
  ok: { label: 'OK', color: '#F59E0B' },
  good: { label: 'Good', color: '#10B981' },
  perfect: { label: 'Perfect', color: '#3B82F6' },
};
