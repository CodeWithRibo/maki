import { createContext, useContext, useMemo, useState } from 'react';

import type { Deck, Rating } from '@/types/maki';

type MakiStore = {
  decks: Deck[];
  toggleArchive: (deckId: string) => void;
  deleteDeck: (deckId: string) => void;
  renameDeck: (deckId: string, title: string) => void;
  addDeck: () => void;
  rateCard: (deckId: string, cardId: string, rating: Rating) => void;
};

const MakiStoreContext = createContext<MakiStore | null>(null);

const initialDecks: Deck[] = [
  {
    id: 'deck-network-tech',
    title: 'NETWORK TECHNOLOGY',
    archived: false,
    cards: [
      {
        id: 'nt-1',
        question: 'Which protocol does **HTTPS** use for secure transport?',
        options: [
          { id: 'a', text: 'TLS' },
          { id: 'b', text: 'SSH' },
          { id: 'c', text: 'IPSec' },
        ],
        correctOptionId: 'a',
        createdAt: '2026-05-01T09:00:00.000Z',
      },
      {
        id: 'nt-2',
        question: 'What does **DNS** primarily resolve?',
        options: [
          { id: 'a', text: 'IP addresses to hostnames only' },
          { id: 'b', text: 'Hostnames to IP addresses' },
          { id: 'c', text: 'MAC addresses to hostnames' },
        ],
        correctOptionId: 'b',
        createdAt: '2026-05-02T09:00:00.000Z',
      },
      {
        id: 'nt-3',
        question: 'Which layer of OSI handles **routing**?',
        options: [
          { id: 'a', text: 'Transport layer' },
          { id: 'b', text: 'Network layer' },
          { id: 'c', text: 'Data link layer' },
        ],
        correctOptionId: 'b',
        createdAt: '2026-05-03T09:00:00.000Z',
      },
      {
        id: 'nt-4',
        question: 'Which TCP flag starts a connection handshake?',
        options: [
          { id: 'a', text: 'ACK' },
          { id: 'b', text: 'RST' },
          { id: 'c', text: 'SYN' },
        ],
        correctOptionId: 'c',
        createdAt: '2026-05-04T09:00:00.000Z',
      },
    ],
  },
  {
    id: 'deck-js-fundamentals',
    title: 'JAVASCRIPT FUNDAMENTALS',
    archived: false,
    cards: [
      {
        id: 'js-1',
        question: 'Which keyword declares a block-scoped variable?',
        options: [
          { id: 'a', text: 'var' },
          { id: 'b', text: 'let' },
          { id: 'c', text: 'constantly' },
        ],
        correctOptionId: 'b',
        createdAt: '2026-05-01T10:00:00.000Z',
      },
      {
        id: 'js-2',
        question: 'What is returned by `Array.prototype.map`?',
        options: [
          { id: 'a', text: 'A new transformed array' },
          { id: 'b', text: 'A boolean' },
          { id: 'c', text: 'The same original array' },
        ],
        correctOptionId: 'a',
        createdAt: '2026-05-02T10:00:00.000Z',
      },
      {
        id: 'js-3',
        question: 'Which value means a variable was declared but not assigned?',
        options: [
          { id: 'a', text: 'undefined' },
          { id: 'b', text: 'null' },
          { id: 'c', text: 'false' },
        ],
        correctOptionId: 'a',
        createdAt: '2026-05-03T10:00:00.000Z',
      },
    ],
  },
  {
    id: 'deck-history',
    title: 'WORLD HISTORY BASICS',
    archived: true,
    cards: [
      {
        id: 'h-1',
        question: 'In which year did the Berlin Wall fall?',
        options: [
          { id: 'a', text: '1987' },
          { id: 'b', text: '1989' },
          { id: 'c', text: '1991' },
        ],
        correctOptionId: 'b',
        createdAt: '2026-04-10T08:30:00.000Z',
      },
      {
        id: 'h-2',
        question: 'Who wrote the **Declaration of Independence**?',
        options: [
          { id: 'a', text: 'Thomas Jefferson' },
          { id: 'b', text: 'George Washington' },
          { id: 'c', text: 'Benjamin Franklin' },
        ],
        correctOptionId: 'a',
        createdAt: '2026-04-11T08:30:00.000Z',
      },
      {
        id: 'h-3',
        question: 'The Renaissance began in which country?',
        options: [
          { id: 'a', text: 'France' },
          { id: 'b', text: 'England' },
          { id: 'c', text: 'Italy' },
        ],
        correctOptionId: 'c',
        createdAt: '2026-04-12T08:30:00.000Z',
      },
    ],
  },
];

export function MakiStoreProvider({ children }: { children: React.ReactNode }) {
  const [decks, setDecks] = useState<Deck[]>(initialDecks);

  const value = useMemo<MakiStore>(
    () => ({
      decks,
      toggleArchive: (deckId) =>
        setDecks((current) =>
          current.map((deck) => (deck.id === deckId ? { ...deck, archived: !deck.archived } : deck))
        ),
      deleteDeck: (deckId) => setDecks((current) => current.filter((deck) => deck.id !== deckId)),
      renameDeck: (deckId, title) =>
        setDecks((current) =>
          current.map((deck) => (deck.id === deckId ? { ...deck, title: title.trim() || deck.title } : deck))
        ),
      addDeck: () =>
        setDecks((current) => [
          {
            id: `deck-${Date.now()}`,
            title: 'NEW STUDY SET',
            archived: false,
            cards: [
              {
                id: `new-${Date.now()}-1`,
                question: 'What is the capital of Japan?',
                options: [
                  { id: 'a', text: 'Kyoto' },
                  { id: 'b', text: 'Osaka' },
                  { id: 'c', text: 'Tokyo' },
                ],
                correctOptionId: 'c',
                createdAt: new Date().toISOString(),
              },
              {
                id: `new-${Date.now()}-2`,
                question: 'React state is typically managed with which hook?',
                options: [
                  { id: 'a', text: 'useFetch' },
                  { id: 'b', text: 'useState' },
                  { id: 'c', text: 'useRouter' },
                ],
                correctOptionId: 'b',
                createdAt: new Date(Date.now() - 1000).toISOString(),
              },
              {
                id: `new-${Date.now()}-3`,
                question: 'Which HTTP method is commonly used to update data?',
                options: [
                  { id: 'a', text: 'PUT' },
                  { id: 'b', text: 'GET' },
                  { id: 'c', text: 'TRACE' },
                ],
                correctOptionId: 'a',
                createdAt: new Date(Date.now() - 2000).toISOString(),
              },
            ],
          },
          ...current,
        ]),
      rateCard: (deckId, cardId, rating) =>
        setDecks((current) =>
          current.map((deck) =>
            deck.id === deckId
              ? {
                  ...deck,
                  cards: deck.cards.map((card) =>
                    card.id === cardId ? { ...card, lastRating: rating } : card
                  ),
                }
              : deck
          )
        ),
    }),
    [decks]
  );

  return <MakiStoreContext.Provider value={value}>{children}</MakiStoreContext.Provider>;
}

export function useMakiStore() {
  const context = useContext(MakiStoreContext);

  if (!context) {
    throw new Error('useMakiStore must be used inside MakiStoreProvider.');
  }

  return context;
}
