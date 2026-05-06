import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MakiBottomSheet } from '@/components/maki-bottom-sheet';
import { useMakiStore } from '@/hooks/use-maki-store';

export default function LibraryScreen() {
  const { decks, toggleArchive, deleteDeck, renameDeck, addDeck } = useMakiStore();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId]
  );
  const activeDecks = useMemo(() => decks.filter((deck) => !deck.archived), [decks]);
  const archivedDecks = useMemo(() => decks.filter((deck) => deck.archived), [decks]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Library</Text>

        <Section title="Last 7 days" />
        {activeDecks.map((deck) => (
          <Pressable
            key={deck.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/study/[deckId]', params: { deckId: deck.id } })}>
            <Text style={styles.cardTitle}>{deck.title}</Text>
            <Text style={styles.cardSub}>{deck.cards.length} Flashcards</Text>
            <Pressable
              style={styles.menuButton}
              onPress={(event) => {
                event.stopPropagation();
                setSelectedDeckId(deck.id);
              }}>
              <Ionicons name="ellipsis-vertical" color="#CBD5E1" size={18} />
            </Pressable>
          </Pressable>
        ))}

        <Section title="Archived" />
        {archivedDecks.map((deck) => (
          <Pressable
            key={deck.id}
            style={[styles.card, styles.archivedCard]}
            onPress={() => router.push({ pathname: '/study/[deckId]', params: { deckId: deck.id } })}>
            <Text style={styles.cardTitle}>{deck.title}</Text>
            <Text style={styles.cardSub}>{deck.cards.length} Flashcards</Text>
            <Pressable
              style={styles.menuButton}
              onPress={(event) => {
                event.stopPropagation();
                setSelectedDeckId(deck.id);
              }}>
              <Ionicons name="ellipsis-vertical" color="#CBD5E1" size={18} />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={addDeck}>
        <Ionicons name="add" color="#0F172A" size={22} />
      </Pressable>

      <MakiBottomSheet visible={selectedDeck !== null} onClose={() => setSelectedDeckId(null)} title="Deck actions">
        {selectedDeck ? (
          <View style={styles.sheetActionList}>
            <ActionRow
              label="Edit"
              icon={<Ionicons name="create-outline" color="#E2E8F0" size={18} />}
              onPress={() => {
                renameDeck(selectedDeck.id, `${selectedDeck.title} (Edited)`);
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
                toggleArchive(selectedDeck.id);
                setSelectedDeckId(null);
              }}
            />
            <ActionRow
              label="Delete Study Set"
              icon={<Ionicons name="trash-outline" color="#F87171" size={18} />}
              destructive
              onPress={() => {
                deleteDeck(selectedDeck.id);
                setSelectedDeckId(null);
              }}
            />
          </View>
        ) : null}
      </MakiBottomSheet>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function ActionRow({
  label,
  icon,
  destructive = false,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
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
    paddingTop: 62,
    paddingBottom: 140,
  },
  header: {
    color: '#F8FAFC',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 18,
  },
  section: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 10,
    letterSpacing: 0.9,
  },
  card: {
    backgroundColor: '#1C2541',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  archivedCard: {
    opacity: 0.88,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingRight: 34,
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  menuButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    padding: 8,
    borderRadius: 10,
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
