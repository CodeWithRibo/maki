import { Platform } from 'react-native';
import type * as SQLite from 'expo-sqlite';

import type { Deck, Flashcard, Rating } from '@/types/maki';

const DATABASE_NAME = 'maki.db';
const INIT_FLAG_KEY = 'initialized';

type DeckRow = {
  id: string;
  title: string;
  archived: number;
  created_at: string;
};

type CardRow = {
  id: string;
  deck_id: string;
  question: string;
  image_uri: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  options_json: string | null;
  correct_option_id: string;
  created_at: string;
  last_rating: Rating | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let sqliteModulePromise: Promise<typeof import('expo-sqlite')> | null = null;
let webMemoryStore: Deck[] | null = null;

function isWeb() {
  return Platform.OS === 'web';
}

function getWebStorage() {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return globalThis.localStorage;
  }

  return null;
}

function readWebDecks() {
  const storage = getWebStorage();
  if (!storage) {
    return webMemoryStore ?? [];
  }

  const value = storage.getItem(DATABASE_NAME);
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Deck[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWebDecks(decks: Deck[]) {
  const storage = getWebStorage();
  if (!storage) {
    webMemoryStore = decks;
    return;
  }

  storage.setItem(DATABASE_NAME, JSON.stringify(decks));
}

async function getSQLiteModule() {
  if (!sqliteModulePromise) {
    sqliteModulePromise = import('expo-sqlite');
  }

  return sqliteModulePromise;
}

async function getDatabase() {
  const SQLite = await getSQLiteModule();

  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

async function ensureSchema() {
  const db = await getDatabase();

  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY NOT NULL,
      deck_id TEXT NOT NULL,
      question TEXT NOT NULL,
      image_uri TEXT,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      options_json TEXT,
      correct_option_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_rating TEXT,
      FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );
  `);

  const cardColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(cards)');
  const hasOptionsJson = cardColumns.some((column) => column.name === 'options_json');
  if (!hasOptionsJson) {
    try {
      await db.runAsync('ALTER TABLE cards ADD COLUMN options_json TEXT');
    } catch (e) {
      console.warn('Failed to add options_json column:', e);
    }
  }
  const hasImageUri = cardColumns.some((column) => column.name === 'image_uri');
  if (!hasImageUri) {
    try {
      await db.runAsync('ALTER TABLE cards ADD COLUMN image_uri TEXT');
    } catch (e) {
      console.warn('Failed to add image_uri column:', e);
    }
  }
}

async function writeAllDecks(decks: Deck[]) {
  writeQueue = writeQueue.then(async () => {
    const db = await getDatabase();

    try {
      await db.withTransactionAsync(async () => {
        // Clear all and re-insert (simpler, more reliable)
        await db.runAsync('DELETE FROM cards');
        await db.runAsync('DELETE FROM decks');

        for (const deck of decks) {
          const deckCreatedAt = deck.cards?.[0]?.createdAt ?? new Date().toISOString();
          await db.runAsync(
            'INSERT INTO decks (id, title, archived, created_at) VALUES (?, ?, ?, ?)',
            [deck.id, deck.title || 'Untitled', deck.archived ? 1 : 0, deckCreatedAt]
          );

          if (deck.cards) {
            for (const card of deck.cards) {
              const optionA = card.options?.[0]?.text ?? '';
              const optionB = card.options?.[1]?.text ?? '';
              const optionC = card.options?.[2]?.text ?? '';
              const correctOptionId = normalizeOptionId(card.correctOptionId);
              const optionsJson = JSON.stringify(card.options || []);
              const imageUri = card.imageUri?.trim() ? card.imageUri.trim() : null;

              await db.runAsync(
                'INSERT INTO cards (id, deck_id, question, image_uri, option_a, option_b, option_c, options_json, correct_option_id, created_at, last_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  card.id,
                  deck.id,
                  card.question || '',
                  imageUri,
                  optionA,
                  optionB,
                  optionC,
                  optionsJson,
                  correctOptionId,
                  card.createdAt || new Date().toISOString(),
                  card.lastRating ?? null,
                ]
              );
            }
          }
        }
      });
    } catch (error) {
      console.error('[Storage] writeAllDecks error:', error);
      throw error;
    }
  });

  return writeQueue;
}

function normalizeOptionId(optionId: string) {
  return optionId.trim().length ? optionId : 'a';
}

function getFallbackOptions(row: CardRow) {
  return [
    { id: 'a', text: row.option_a },
    { id: 'b', text: row.option_b },
    { id: 'c', text: row.option_c },
  ];
}

function parseOptions(value: string | null, fallback: CardRow) {
  if (!value) {
    return getFallbackOptions(fallback);
  }

  try {
    const parsed = JSON.parse(value) as Flashcard['options'];
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((option) => option && typeof option.id === 'string' && typeof option.text === 'string')
    ) {
      return parsed;
    }
  } catch {
    return getFallbackOptions(fallback);
  }

  return getFallbackOptions(fallback);
}

function toCard(row: CardRow): Flashcard {
  const options = parseOptions(row.options_json, row);

  return {
    id: row.id,
    question: row.question || '',
    imageUri: row.image_uri ?? undefined,
    options,
    correctOptionId: normalizeOptionId(row.correct_option_id),
    createdAt: row.created_at || new Date().toISOString(),
    lastRating: (row.last_rating as Rating) ?? undefined,
  };
}

export async function ensureMakiStorage(initialDecks: Deck[]) {
  if (isWeb()) {
    if (!readWebDecks().length) {
      writeWebDecks(initialDecks);
    }
    return;
  }

  await ensureSchema();

  const db = await getDatabase();
  const initFlag = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [INIT_FLAG_KEY]
  );

  if (initFlag?.value === '1') {
    return;
  }

  await writeAllDecks(initialDecks);
  await db.runAsync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    [INIT_FLAG_KEY, '1']
  );
}

export async function readMakiDecks() {
  if (isWeb()) {
    return readWebDecks();
  }

  await ensureSchema();

  const db = await getDatabase();
  const deckRows = await db.getAllAsync<DeckRow>(
    'SELECT id, title, archived, created_at FROM decks ORDER BY created_at DESC'
  );
  const cardRows = await db.getAllAsync<CardRow>(
    'SELECT id, deck_id, question, image_uri, option_a, option_b, option_c, options_json, correct_option_id, created_at, last_rating FROM cards ORDER BY created_at DESC'
  );

  const cardsByDeck = new Map<string, Flashcard[]>();
  for (const row of cardRows) {
    const currentCards = cardsByDeck.get(row.deck_id) ?? [];
    currentCards.push(toCard(row));
    cardsByDeck.set(row.deck_id, currentCards);
  }

  return deckRows.map<Deck>((row) => ({
    id: row.id,
    title: row.title || 'Untitled',
    archived: row.archived === 1,
    cards: cardsByDeck.get(row.id) ?? [],
  }));
}

export async function persistMakiDecks(decks: Deck[]) {
  if (isWeb()) {
    writeWebDecks(decks);
    return;
  }

  await ensureSchema();
  await writeAllDecks(decks);
}
