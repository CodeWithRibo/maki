import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { MakiBottomSheet } from '@/components/maki-bottom-sheet';
import { useMakiStore } from '@/hooks/use-maki-store';
import type { Deck, Flashcard } from '@/types/maki';

type DeckFilter = 'all' | 'active' | 'archived';
type DeckSort = 'recent' | 'title';
type PendingAction = { type: 'toggleArchive' | 'delete'; deckId: string } | null;

const FILTER_OPTIONS: { value: DeckFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS: { value: DeckSort; label: string }[] = [
  { value: 'recent', label: 'Newest' },
  { value: 'title', label: 'A-Z' },
];

export default function LibraryScreen() {
  const { decks, toggleArchive, deleteDeck, renameDeck, addDeck } = useMakiStore();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [filterBy, setFilterBy] = useState<DeckFilter>('all');
  const [sortBy, setSortBy] = useState<DeckSort>('recent');
  const [createVisible, setCreateVisible] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [pendingImportedCards, setPendingImportedCards] = useState<Flashcard[] | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId]
  );
  const pendingDeck = useMemo(
    () => decks.find((deck) => deck.id === pendingAction?.deckId) ?? null,
    [decks, pendingAction]
  );

  const activeDecks = useMemo(
    () => sortDecks(decks.filter((deck) => !deck.archived), sortBy),
    [decks, sortBy]
  );
  const archivedDecks = useMemo(
    () => sortDecks(decks.filter((deck) => deck.archived), sortBy),
    [decks, sortBy]
  );
  const visibleActiveDecks = useMemo(
    () => (filterBy === 'archived' ? [] : activeDecks),
    [activeDecks, filterBy]
  );
  const visibleArchivedDecks = useMemo(
    () => (filterBy === 'active' ? [] : archivedDecks),
    [archivedDecks, filterBy]
  );
  const totalCards = useMemo(() => decks.reduce((count, deck) => count + deck.cards.length, 0), [decks]);

  useEffect(() => {
    if (!editVisible || !editingDeckId || !editTitle.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      renameDeck(editingDeckId, editTitle);
    }, 700);

    return () => clearTimeout(timer);
  }, [editTitle, editVisible, editingDeckId, renameDeck]);

  const handleCreateDeck = () => {
    const title = createTitle.trim();
    if (!title) {
      showNotice('Enter a study set name first.');
      return;
    }
    if (!pendingImportedCards || pendingImportedCards.length === 0) {
      showNotice('CSV upload is required. Import a valid CSV first.');
      return;
    }

    addDeck(title, pendingImportedCards);
    showNotice('Study set created and auto-saved.');
    setCreateTitle('');
    setPendingImportedCards(null);
    setCreateVisible(false);
  };

  const handleImportCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const selectedFile = result.assets[0];
      const response = await fetch(selectedFile.uri);
      const csvText = await response.text();
      const csvResult = parseQuestionAnswerCsv(csvText);
      if (!csvResult.valid) {
        showNotice(csvResult.message);
        return;
      }

      const cards = buildCardsFromQuestionAnswerRows(csvResult.rows);
      const deckTitle = selectedFile.name.replace(/\.[^/.]+$/, '').trim().toUpperCase() || 'IMPORTED SET';
      setCreateTitle(deckTitle);
      setPendingImportedCards(cards);
      showNotice(`CSV loaded: ${cards.length} flashcards ready to create.`);
    } catch {
      showNotice('CSV import failed. Please check the file format.');
    }
  };

  const handleRenameDeck = () => {
    if (!editingDeckId) {
      return;
    }

    renameDeck(editingDeckId, editTitle);
    showNotice('Study set updated and auto-saved.');
    setEditVisible(false);
    setEditingDeckId(null);
    setSelectedDeckId(null);
    setEditTitle('');
  };

  const handleConfirmAction = () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === 'delete') {
      deleteDeck(pendingAction.deckId);
      showNotice('Study set deleted and auto-saved.');
    } else {
      toggleArchive(pendingAction.deckId);
      showNotice('Study set updated and auto-saved.');
    }

    setPendingAction(null);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Library</Text>
        <Text style={styles.subHeader}>
          {decks.length} study sets • {totalCards} flashcards
        </Text>

        <View style={styles.controlGroup}>
          <ChipRow
            options={FILTER_OPTIONS}
            activeValue={filterBy}
            onPress={(value) => setFilterBy(value)}
          />
          <ChipRow
            options={SORT_OPTIONS}
            activeValue={sortBy}
            onPress={(value) => setSortBy(value)}
          />
        </View>

        {visibleActiveDecks.length ? <Section title="Active Study Sets" /> : null}
        {visibleActiveDecks.map((deck) => (
          <Pressable
            key={deck.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/study/[deckId]', params: { deckId: deck.id } })}>
            <DeckCardContent
              deck={deck}
              onOpenActions={(event) => {
                event.stopPropagation();
                setSelectedDeckId(deck.id);
              }}
            />
          </Pressable>
        ))}

        {visibleArchivedDecks.length ? <Section title="Archived" /> : null}
        {visibleArchivedDecks.map((deck) => (
          <Pressable
            key={deck.id}
            style={[styles.card, styles.archivedCard]}
            onPress={() => router.push({ pathname: '/study/[deckId]', params: { deckId: deck.id } })}>
            <DeckCardContent
              deck={deck}
              onOpenActions={(event) => {
                event.stopPropagation();
                setSelectedDeckId(deck.id);
              }}
            />
          </Pressable>
        ))}

        {!visibleActiveDecks.length && !visibleArchivedDecks.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No study sets in this view yet.</Text>
            <Text style={styles.emptySub}>Try a different filter or create a new study set.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => {
          setCreateTitle('');
          setPendingImportedCards(null);
          setCreateVisible(true);
        }}>
        <Ionicons name="add" color="#0F172A" size={22} />
      </Pressable>

      <MakiBottomSheet visible={selectedDeck !== null} onClose={() => setSelectedDeckId(null)} title="Deck actions">
        {selectedDeck ? (
          <View style={styles.sheetActionList}>
            <ActionRow
              label="Edit"
              icon={<Ionicons name="create-outline" color="#E2E8F0" size={18} />}
              onPress={() => {
                setEditingDeckId(selectedDeck.id);
                setEditTitle(selectedDeck.title);
                setEditVisible(true);
                setSelectedDeckId(null);
              }}
            />
            <ActionRow
              label={selectedDeck.archived ? 'Unarchive' : 'Archive'}
              icon={
                selectedDeck.archived ? (
                  <Ionicons name="folder-open-outline" color="#E2E8F0" size={18} />
                ) : (
                  <Ionicons name="archive-outline" color="#E2E8F0" size={18} />
                )
              }
              onPress={() => {
                setPendingAction({ type: 'toggleArchive', deckId: selectedDeck.id });
                setSelectedDeckId(null);
              }}
            />
            <ActionRow
              label="Delete Study Set"
              icon={<Ionicons name="trash-outline" color="#F87171" size={18} />}
              destructive
              onPress={() => {
                setPendingAction({ type: 'delete', deckId: selectedDeck.id });
                setSelectedDeckId(null);
              }}
            />
          </View>
        ) : null}
      </MakiBottomSheet>

      <MakiBottomSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="Create study set">
        <View style={styles.form}>
          <TextInput
            value={createTitle}
            onChangeText={setCreateTitle}
            style={styles.input}
            placeholder="Enter study set name"
            placeholderTextColor="#64748B"
            autoFocus
          />
          <View style={styles.formActions}>
            <Pressable style={styles.secondaryButton} onPress={handleImportCsv}>
              <Text style={styles.secondaryButtonText}>
                {pendingImportedCards?.length ? `CSV Loaded (${pendingImportedCards.length})` : 'Upload CSV'}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setCreateVisible(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, !createTitle.trim() && styles.disabledButton]}
              onPress={handleCreateDeck}
              disabled={!createTitle.trim()}>
              <Text style={styles.primaryButtonText}>Create</Text>
            </Pressable>
          </View>
        </View>
      </MakiBottomSheet>

      <MakiBottomSheet
        visible={editVisible}
        onClose={() => {
          setEditVisible(false);
          setEditingDeckId(null);
        }}
        title="Edit study set">
        <View style={styles.form}>
          <TextInput
            value={editTitle}
            onChangeText={setEditTitle}
            style={styles.input}
            placeholder="Enter study set name"
            placeholderTextColor="#64748B"
            autoFocus
          />
          <View style={styles.formActions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setEditVisible(false);
                setEditingDeckId(null);
              }}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, !editTitle.trim() && styles.disabledButton]}
              onPress={handleRenameDeck}
              disabled={!editTitle.trim()}>
              <Text style={styles.primaryButtonText}>Save changes</Text>
            </Pressable>
          </View>
        </View>
      </MakiBottomSheet>

      <MakiBottomSheet
        visible={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={pendingAction?.type === 'delete' ? 'Delete study set?' : 'Update study set?'}>
        <View style={styles.confirmBlock}>
          <Text style={styles.confirmCopy}>
            {pendingAction?.type === 'delete'
              ? `Are you sure you want to delete "${pendingDeck?.title ?? 'this study set'}"?`
              : `Are you sure you want to ${
                  pendingDeck?.archived ? 'unarchive' : 'archive'
                } "${pendingDeck?.title ?? 'this study set'}"?`}
          </Text>
          <View style={styles.formActions}>
            <Pressable style={styles.secondaryButton} onPress={() => setPendingAction(null)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryButton,
                pendingAction?.type === 'delete' && styles.destructiveButton,
              ]}
              onPress={handleConfirmAction}>
              <Text style={styles.primaryButtonText}>
                {pendingAction?.type === 'delete' ? 'Delete' : 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </MakiBottomSheet>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function DeckCardContent({
  deck,
  onOpenActions,
}: {
  deck: Deck;
  onOpenActions: (event: GestureResponderEvent) => void;
}) {
  const completion = getDeckCompletion(deck);
  const completionColor = completion >= 80 ? '#10B981' : completion >= 50 ? '#F59E0B' : '#60A5FA';

  return (
    <View>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {deck.title}
        </Text>
        <View style={styles.cardControls}>
          <ProgressCircle value={completion} color={completionColor} />
          <Pressable style={styles.menuButton} onPress={onOpenActions}>
            <Ionicons name="ellipsis-vertical" color="#CBD5E1" size={18} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.cardSub}>{deck.cards.length} Flashcards</Text>
    </View>
  );
}

function ProgressCircle({ value, color }: { value: number; color: string }) {
  return (
    <View style={[styles.progressCircle, { borderColor: color }]}>
      <Text style={styles.progressCircleText}>{value}%</Text>
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  activeValue,
  onPress,
}: {
  options: { value: T; label: string }[];
  activeValue: T;
  onPress: (value: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.chip, activeValue === option.value && styles.chipActive]}
          onPress={() => onPress(option.value)}>
          <Text style={[styles.chipText, activeValue === option.value && styles.chipTextActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ActionRow({
  label,
  icon,
  destructive = false,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.sheetAction} onPress={onPress}>
      {icon}
      <Text style={[styles.sheetActionText, destructive && styles.destructive]}>{label}</Text>
    </Pressable>
  );
}

function sortDecks(decks: Deck[], sortBy: DeckSort) {
  return [...decks].sort((left, right) => {
    if (sortBy === 'title') {
      return left.title.localeCompare(right.title);
    }

    const leftRecent = Math.max(...left.cards.map((card) => new Date(card.createdAt).getTime()), 0);
    const rightRecent = Math.max(...right.cards.map((card) => new Date(card.createdAt).getTime()), 0);
    return rightRecent - leftRecent;
  });
}

function parseQuestionAnswerCsv(input: string) {
  const rows = input
    .split(/\r?\n/)
    .map((line) => parseCsvLine(line))
    .filter((columns) => columns.length >= 2);

  if (!rows.length) {
    return {
      valid: false,
      message: 'Invalid CSV format. Use Vaia format headers like: Question,Answer A,Answer A is correct,...',
      rows: [] as {
        question: string;
        options: { id: string; text: string }[];
        correctOptionId: string;
      }[],
    };
  }

  const [header, ...dataRows] = rows;
  const headerQuestion = header[0]?.trim();
  if (headerQuestion !== 'Question') {
    return {
      valid: false,
      message: 'Invalid CSV header. First column must be exactly: Question',
      rows: [] as {
        question: string;
        options: { id: string; text: string }[];
        correctOptionId: string;
      }[],
    };
  }

  const answerPairs: { answerIndex: number; correctnessIndex: number; optionId: string }[] = [];
  for (let index = 1; index < header.length; index += 2) {
    const answerHeader = header[index]?.trim();
    const correctHeader = header[index + 1]?.trim();
    const answerMatch = /^Answer\s+([A-G])$/i.exec(answerHeader ?? '');
    if (!answerMatch || correctHeader !== `${answerHeader} is correct`) {
      return {
        valid: false,
        message:
          'Invalid CSV header format. Expected: Question,Answer A,Answer A is correct,Answer B,Answer B is correct,...',
        rows: [] as {
          question: string;
          options: { id: string; text: string }[];
          correctOptionId: string;
        }[],
      };
    }

    answerPairs.push({
      answerIndex: index,
      correctnessIndex: index + 1,
      optionId: answerMatch[1].toLowerCase(),
    });
  }

  if (!answerPairs.length) {
    return {
      valid: false,
      message: 'CSV must contain at least one answer pair: Answer A and Answer A is correct.',
      rows: [] as {
        question: string;
        options: { id: string; text: string }[];
        correctOptionId: string;
      }[],
    };
  }

  const mappedRows = dataRows
    .map((columns, rowIndex) => {
      const question = (columns[0] ?? '').trim();
      const options: { id: string; text: string }[] = [];
      let correctOptionId = '';

      for (const pair of answerPairs) {
        const answerText = (columns[pair.answerIndex] ?? '').trim();
        const isCorrect = (columns[pair.correctnessIndex] ?? '').trim().toLowerCase();

        if (!answerText && !isCorrect) {
          continue;
        }
        if (!answerText || !isCorrect) {
          return {
            valid: false,
            message: `Invalid CSV row ${rowIndex + 2}. Each answer needs both text and correctness value.`,
            row: null,
          };
        }
        if (!['yes', 'no'].includes(isCorrect)) {
          return {
            valid: false,
            message: `Invalid CSV row ${rowIndex + 2}. Correctness must be Yes or No.`,
            row: null,
          };
        }

        options.push({ id: pair.optionId, text: answerText });
        if (isCorrect === 'yes') {
          if (correctOptionId) {
            return {
              valid: false,
              message: `Invalid CSV row ${rowIndex + 2}. Multiple answers are marked Yes.`,
              row: null,
            };
          }
          correctOptionId = pair.optionId;
        }
      }

      if (!question) {
        return {
          valid: false,
          message: `Invalid CSV row ${rowIndex + 2}. Question is required.`,
          row: null,
        };
      }
      if (options.length < 2) {
        return {
          valid: false,
          message: `Invalid CSV row ${rowIndex + 2}. At least two answers are required.`,
          row: null,
        };
      }
      if (!correctOptionId) {
        return {
          valid: false,
          message: `Invalid CSV row ${rowIndex + 2}. One answer must be marked Yes.`,
          row: null,
        };
      }

      return { valid: true, message: '', row: { question, options, correctOptionId } };
    })
    .filter((item) => item.row !== null || item.message.length > 0);

  if (!mappedRows.length) {
    return {
      valid: false,
      message: 'CSV has no valid data rows.',
      rows: [] as {
        question: string;
        options: { id: string; text: string }[];
        correctOptionId: string;
      }[],
    };
  }

  const invalidRow = mappedRows.find((row) => !row.valid);
  if (invalidRow) {
    return {
      valid: false,
      message: invalidRow.message,
      rows: [] as {
        question: string;
        options: { id: string; text: string }[];
        correctOptionId: string;
      }[],
    };
  }

  return {
    valid: true,
    message: '',
    rows: mappedRows.map((row) => row.row).filter((row) => row !== null),
  };
}

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function buildCardsFromQuestionAnswerRows(
  rows: { question: string; options: { id: string; text: string }[]; correctOptionId: string }[]
) {
  return rows.map<Flashcard>((row, rowIndex) => {
    return {
      id: `imported-${Date.now()}-${rowIndex}`,
      question: row.question,
      options: row.options,
      correctOptionId: row.correctOptionId,
      createdAt: new Date(Date.now() - rowIndex * 1000).toISOString(),
    };
  });
}

function showNotice(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert('Maki', message);
}

function getDeckCompletion(deck: Deck) {
  if (!deck.cards.length) {
    return 0;
  }

  const completedCards = deck.cards.filter((card) => card.lastRating).length;
  return Math.round((completedCards / deck.cards.length) * 100);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 58,
    paddingBottom: 140,
  },
  header: {
    color: '#F8FAFC',
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subHeader: {
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    fontWeight: '500',
  },
  controlGroup: {
    gap: 10,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1A243D',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  chipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#DBEAFE',
  },
  section: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 0.9,
  },
  card: {
    backgroundColor: '#17233C',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2D3E5C',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archivedCard: {
    opacity: 0.88,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    flex: 1,
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  menuButton: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: '#243552',
  },
  progressCircle: {
    height: 34,
    width: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  progressCircleText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 94,
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: '#FDE047',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FDE047',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  form: {
    gap: 14,
    marginTop: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryButton: {
    borderRadius: 10,
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBlock: {
    marginTop: 6,
    gap: 16,
  },
  confirmCopy: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyState: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1A243D',
  },
  emptyTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: '#94A3B8',
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  sheetActionList: {
    gap: 4,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sheetActionText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  destructive: {
    color: '#F87171',
  },
});
