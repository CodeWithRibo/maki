import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MakiBottomSheet } from '@/components/maki-bottom-sheet';
import { MakiProgressBar } from '@/components/maki-progress-bar';
import { useMakiStore } from '@/hooks/use-maki-store';
import { RATING_META, Rating } from '@/types/maki';

const ALL_RATINGS: Rating[] = ['bad', 'ok', 'good', 'perfect'];

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const { decks, rateCard } = useMakiStore();
  const deck = useMemo(() => decks.find((item) => item.id === deckId), [deckId, decks]);

  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterRatings, setFilterRatings] = useState<Rating[]>(ALL_RATINGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [draftSortBy, setDraftSortBy] = useState<'newest' | 'oldest'>('newest');
  const [draftRatings, setDraftRatings] = useState<Rating[]>(ALL_RATINGS);
  const [sessionRatings, setSessionRatings] = useState<Record<string, Rating>>({});

  const bannerProgress = useSharedValue(0);

  const orderedCards = useMemo(() => {
    if (!deck) {
      return [];
    }

    const sorted = [...deck.cards].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortBy === 'newest' ? rightTime - leftTime : leftTime - rightTime;
    });

    if (filterRatings.length === ALL_RATINGS.length) {
      return sorted;
    }

    return sorted.filter((card) => card.lastRating && filterRatings.includes(card.lastRating));
  }, [deck, filterRatings, sortBy]);

  const currentCard = orderedCards[currentIndex];

  useEffect(() => {
    if (!currentCard) {
      setCurrentIndex(0);
      return;
    }

    if (currentIndex > orderedCards.length - 1) {
      setCurrentIndex(Math.max(orderedCards.length - 1, 0));
    }
  }, [currentCard, currentIndex, orderedCards.length]);

  useEffect(() => {
    bannerProgress.value = withTiming(answered ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [answered, bannerProgress]);

  const progressCounts = useMemo<Record<Rating, number>>(() => {
    const counts: Record<Rating, number> = { bad: 0, ok: 0, good: 0, perfect: 0 };
    Object.values(sessionRatings).forEach((rating) => {
      counts[rating] += 1;
    });
    return counts;
  }, [sessionRatings]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerProgress.value,
    transform: [{ translateY: (1 - bannerProgress.value) * 24 }],
  }));

  if (!deck) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.emptyTitle}>Deck not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const onAnswer = (optionId: string) => {
    if (!currentCard || answered) {
      return;
    }

    setSelectedOption(optionId);
    setAnswered(true);
    setIsCorrect(optionId === currentCard.correctOptionId);
  };

  const onRate = (rating: Rating) => {
    if (!currentCard || !answered) {
      return;
    }

    setSelectedRating(rating);
    setSessionRatings((current) => ({ ...current, [currentCard.id]: rating }));
    rateCard(deck.id, currentCard.id, rating);
  };

  const goNext = () => {
    if (!currentCard || !answered) {
      return;
    }

    const resolvedRating = selectedRating ?? (isCorrect ? 'good' : 'bad');
    if (!selectedRating) {
      setSessionRatings((current) => ({ ...current, [currentCard.id]: resolvedRating }));
      rateCard(deck.id, currentCard.id, resolvedRating);
    }

    setAnswered(false);
    setSelectedOption(null);
    setSelectedRating(null);

    if (currentIndex === orderedCards.length - 1) {
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  const toggleDraftRating = (rating: Rating) => {
    setDraftRatings((current) =>
      current.includes(rating) ? current.filter((value) => value !== rating) : [...current, rating]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" color="#E2E8F0" size={20} />
        </Pressable>

        <Text style={styles.deckTitle} numberOfLines={1}>
          {deck.title}
        </Text>

        <Pressable
          onPress={() => {
            setDraftSortBy(sortBy);
            setDraftRatings(filterRatings);
            setSettingsVisible(true);
          }}
          style={styles.iconButton}>
          <Ionicons name="settings-outline" color="#E2E8F0" size={19} />
        </Pressable>
      </View>

      <View style={styles.progressWrap}>
        <MakiProgressBar totalCards={orderedCards.length} ratingCounts={progressCounts} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {!currentCard ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No cards match this rating filter.</Text>
            <Text style={styles.emptySub}>Open settings and select more ratings to continue.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.question}>{renderHighlightedText(currentCard.question)}</Text>

            <View style={styles.optionList}>
              {currentCard.options.map((option, index) => {
                const isOptionCorrect = option.id === currentCard.correctOptionId;
                const isSelected = option.id === selectedOption;
                const optionLabel = String.fromCharCode(65 + index);

                const stateStyles = [
                  styles.optionButton,
                  answered && isSelected && !isOptionCorrect && styles.optionWrong,
                  answered && isOptionCorrect && styles.optionCorrect,
                ];

                return (
                  <Pressable key={option.id} style={stateStyles} onPress={() => onAnswer(option.id)}>
                    <View style={styles.optionLead}>
                      <Text style={styles.optionLeadText}>{optionLabel}</Text>
                    </View>
                    <Text style={styles.optionText}>{option.text}</Text>
                    {answered && isSelected && !isOptionCorrect ? (
                      <Ionicons name="close-circle" color="#FCA5A5" size={18} />
                    ) : null}
                    {answered && isOptionCorrect ? (
                      <Ionicons name="checkmark-circle" color="#6EE7B7" size={18} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <Animated.View style={[styles.banner, bannerStyle]}>
        <Text style={styles.bannerText}>{isCorrect ? 'Awesome! 🎉' : 'Almost! 🙈'}</Text>
        <Pressable style={styles.nextButton} onPress={goNext}>
          <Text style={styles.nextText}>Next</Text>
          <Ionicons name="arrow-forward" color="#0F172A" size={16} />
        </Pressable>
      </Animated.View>

      <View style={styles.ratingBar}>
        {ALL_RATINGS.map((rating) => {
          const active = selectedRating === rating;

          return (
            <Pressable
              key={rating}
              style={[
                styles.ratingButton,
                { backgroundColor: active ? RATING_META[rating].color : '#223149', borderColor: RATING_META[rating].color },
              ]}
              onPress={() => onRate(rating)}>
              <Text style={styles.ratingText}>{RATING_META[rating].label}</Text>
            </Pressable>
          );
        })}
      </View>

      <MakiBottomSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} title="Flashcard settings">
        <View style={styles.settingsBlock}>
          <Text style={styles.settingsLabel}>Sort by</Text>
          <Pressable
            style={styles.select}
            onPress={() => setDraftSortBy((value) => (value === 'newest' ? 'oldest' : 'newest'))}>
            <Text style={styles.selectText}>{draftSortBy === 'newest' ? 'Newest first' : 'Oldest first'}</Text>
            <Ionicons name="chevron-down" color="#CBD5E1" size={18} />
          </Pressable>

          <Text style={[styles.settingsLabel, styles.filterLabel]}>Filter by rating</Text>
          <View style={styles.filterRow}>
            {ALL_RATINGS.map((rating) => (
              <Pressable
                key={rating}
                style={[
                  styles.filterChip,
                  draftRatings.includes(rating) && {
                    borderColor: RATING_META[rating].color,
                    backgroundColor: `${RATING_META[rating].color}22`,
                  },
                ]}
                onPress={() => toggleDraftRating(rating)}>
                <Text style={styles.filterChipText}>{RATING_META[rating].label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.settingsActions}>
            <Pressable
              style={styles.resetButton}
              onPress={() => {
                setDraftSortBy('newest');
                setDraftRatings(ALL_RATINGS);
              }}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>

            <Pressable
              style={styles.applyButton}
              onPress={() => {
                setSortBy(draftSortBy);
                setFilterRatings(draftRatings.length ? draftRatings : ALL_RATINGS);
                setSettingsVisible(false);
              }}>
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </MakiBottomSheet>
    </View>
  );
}

function renderHighlightedText(input: string) {
  const chunks = input.split(/(\*\*.*?\*\*)/g);
  return chunks.map((chunk, index) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return (
        <Text key={`${chunk}-${index}`} style={styles.highlightText}>
          {chunk.slice(2, -2)}
        </Text>
      );
    }

    return <Text key={`${chunk}-${index}`}>{chunk}</Text>;
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: '#0B132B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconButton: {
    borderRadius: 12,
    backgroundColor: '#1E293B',
    padding: 10,
  },
  deckTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  progressWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 178,
  },
  card: {
    backgroundColor: '#1C2541',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
  },
  question: {
    color: '#F8FAFC',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  highlightText: {
    color: '#FDE047',
    fontWeight: '800',
  },
  optionList: {
    gap: 11,
  },
  optionButton: {
    backgroundColor: '#223149',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 58,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLead: {
    height: 30,
    width: 30,
    borderRadius: 99,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLeadText: {
    color: '#CBD5E1',
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 15,
  },
  optionCorrect: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  optionWrong: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bannerText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDE047',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  nextText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  ratingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 22,
  },
  ratingButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  ratingText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  settingsBlock: {
    paddingTop: 4,
  },
  settingsLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  filterLabel: {
    marginTop: 14,
  },
  select: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    paddingVertical: 10,
  },
  filterChipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  resetButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetText: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#FDE047',
    alignItems: 'center',
    paddingVertical: 12,
  },
  applyText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  emptyBlock: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1C2541',
    padding: 16,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySub: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: '#FDE047',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
