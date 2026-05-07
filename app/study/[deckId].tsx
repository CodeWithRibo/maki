import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Swiper from 'react-native-deck-swiper';

import { MakiBottomSheet } from '@/components/maki-bottom-sheet';
import { MakiProgressBar } from '@/components/maki-progress-bar';
import { useMakiStore } from '@/hooks/use-maki-store';
import { RATING_META, Rating } from '@/types/maki';

const ALL_RATINGS: Rating[] = ['bad', 'ok', 'good', 'perfect'];
const RATING_ICONS: Record<Rating, keyof typeof Ionicons.glyphMap> = {
  bad: 'thumbs-down-outline',
  ok: 'remove-circle-outline',
  good: 'thumbs-up-outline',
  perfect: 'sparkles-outline',
};
const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
type OptionId = (typeof OPTION_IDS)[number];

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const { decks, rateCard, updateCard } = useMakiStore();
  const deck = useMemo(() => decks.find((item) => item.id === deckId), [deckId, decks]);

  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterRatings, setFilterRatings] = useState<Rating[]>(ALL_RATINGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [draftSortBy, setDraftSortBy] = useState<'newest' | 'oldest'>('newest');
  const [draftRatings, setDraftRatings] = useState<Rating[]>(ALL_RATINGS);
  const [showProgress, setShowProgress] = useState(true);
  const [draftShowProgress, setDraftShowProgress] = useState(true);
  const [editQuestion, setEditQuestion] = useState('');
  const [editOptions, setEditOptions] = useState(['', '', '']);
  const [editCorrectOptionId, setEditCorrectOptionId] = useState<OptionId>('a');
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

  const onAnswer = (optionId: string) => {
    if (!currentCard || answered) {
      return;
    }

    setSelectedOption(optionId);
    setAnswered(true);
    setIsCorrect(optionId === currentCard.correctOptionId);
  };

  const onRate = (rating: Rating) => {
    if (!deck || !currentCard || !answered || selectedRating) {
      return;
    }

    setSelectedRating(rating);
    setSessionRatings((current) => ({ ...current, [currentCard.id]: rating }));
    rateCard(deck.id, currentCard.id, rating);
    setTimeout(() => {
      goNext(rating);
    }, 220);
  };

  const goNext = (chosenRating?: Rating) => {
    if (!deck || !currentCard || !answered) {
      return;
    }

    const resolvedRating = chosenRating ?? selectedRating ?? (isCorrect ? 'good' : 'bad');
    if (!selectedRating && !chosenRating) {
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

  const openEditCard = () => {
    if (!currentCard) {
      return;
    }

    setEditQuestion(currentCard.question);
    const nextOptions = currentCard.options.map((option) => option.text).slice(0, 7);
    while (nextOptions.length < 3) {
      nextOptions.push('');
    }

    setEditOptions(nextOptions);
    const selectedCorrectOptionId = OPTION_IDS.includes(currentCard.correctOptionId as OptionId)
      ? (currentCard.correctOptionId as OptionId)
      : 'a';
    setEditCorrectOptionId(selectedCorrectOptionId);
    setEditVisible(true);
  };

  const canSaveCardEdit =
    editQuestion.trim().length > 0 &&
    editOptions.length >= 2 &&
    editOptions.length <= 7 &&
    editOptions.every((optionText) => optionText.trim().length > 0);

  useEffect(() => {
    if (!deck || !editVisible || !currentCard || !canSaveCardEdit) {
      return;
    }

    const editCardId = currentCard.id;
    const autoSaveTimer = setTimeout(() => {
      updateCard(deck.id, editCardId, {
        question: editQuestion,
        options: editOptions.map((text, index) => ({
          id: OPTION_IDS[index],
          text,
        })),
        correctOptionId: editCorrectOptionId,
      });
    }, 900);

    return () => clearTimeout(autoSaveTimer);
  }, [canSaveCardEdit, currentCard, deck, editCorrectOptionId, editOptions, editQuestion, editVisible, updateCard]);

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

  const saveCardEdits = () => {
    if (!currentCard) {
      return;
    }

    updateCard(deck.id, currentCard.id, {
      question: editQuestion,
      options: editOptions.map((text, index) => ({ id: OPTION_IDS[index], text })),
      correctOptionId: editCorrectOptionId,
    });
    showNotice('Flashcard saved and auto-synced.');
    setEditVisible(false);
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

        <View style={styles.actionButtons}>
          <Pressable onPress={openEditCard} style={styles.iconButton}>
            <Ionicons name="create-outline" color="#E2E8F0" size={19} />
          </Pressable>
          <Pressable
            onPress={() => {
              setDraftSortBy(sortBy);
              setDraftRatings(filterRatings);
              setDraftShowProgress(showProgress);
              setSettingsVisible(true);
            }}
            style={styles.iconButton}>
            <Ionicons name="settings-outline" color="#E2E8F0" size={19} />
          </Pressable>
        </View>
      </View>

      {showProgress ? (
        <View style={styles.progressWrap}>
          <MakiProgressBar totalCards={orderedCards.length} ratingCounts={progressCounts} />
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          currentCard ? styles.contentContainerCentered : styles.contentContainerEmpty,
        ]}
        showsVerticalScrollIndicator={false}>
        {!currentCard ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No cards match this rating filter.</Text>
            <Text style={styles.emptySub}>Open settings and select more ratings to continue.</Text>
          </View>
        ) : (
          <View style={styles.swiperWrap}>
            <Swiper
              key={`${currentCard.id}-${answered ? 'answered' : 'idle'}-${selectedRating ?? 'none'}`}
              cards={[currentCard]}
              cardIndex={0}
              stackSize={1}
              cardHorizontalMargin={0}
              cardVerticalMargin={0}
              backgroundColor="transparent"
              containerStyle={styles.swiperContainer}
              cardStyle={styles.swiperCard}
              infinite={false}
              disableTopSwipe
              disableBottomSwipe
              disableLeftSwipe={!answered || !!selectedRating}
              disableRightSwipe={!answered || !!selectedRating}
              onSwipedLeft={() => onRate('good')}
              onSwipedRight={() => onRate('bad')}
              animateCardOpacity
              animateOverlayLabelsOpacity
              overlayLabels={{
                left: {
                  element: <SwipeOverlay label="GOOD" icon="thumbs-up" color="#10B981" />,
                  style: styles.overlayLeft,
                },
                right: {
                  element: <SwipeOverlay label="BAD" icon="thumbs-down" color="#EF4444" />,
                  style: styles.overlayRight,
                },
              }}
              renderCard={(card) => {
                if (!card) {
                  return <View style={styles.card} />;
                }

                return (
                  <View style={styles.card}>
                    <Text style={styles.question}>{renderHighlightedText(card.question)}</Text>

                    <View style={styles.optionList}>
                      {card.options.map((option, index) => {
                        const isOptionCorrect = option.id === card.correctOptionId;
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
                );
              }}
            />
            {answered && !selectedRating ? (
              <Text style={styles.swipeHint}>Swipe left for GOOD or right for BAD</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Animated.View style={[styles.banner, bannerStyle]}>
        <View style={styles.bannerLead}>
          <Ionicons
            name={selectedRating ? 'checkmark-circle' : isCorrect ? 'happy-outline' : 'alert-circle-outline'}
            color={selectedRating ? '#34D399' : '#93C5FD'}
            size={18}
          />
          <Text style={styles.bannerText}>
            {selectedRating ? `${RATING_META[selectedRating].label} recorded` : isCorrect ? 'Awesome! 🎉' : 'Almost! 🙈'}
          </Text>
        </View>
        <Pressable style={styles.nextButton} onPress={() => goNext()}>
          <Text style={styles.nextText}>Next</Text>
          <Ionicons name="arrow-forward" color="#0F172A" size={16} />
        </Pressable>
      </Animated.View>

      <View style={styles.ratingBar}>
        {ALL_RATINGS.map((rating) => {
          const active = selectedRating === rating;
          const disabled = !answered || !!selectedRating;

          return (
            <Pressable
              key={rating}
              disabled={disabled}
              style={[
                styles.ratingButton,
                active && styles.ratingButtonActive,
                disabled && styles.ratingButtonDisabled,
                {
                  backgroundColor: active ? RATING_META[rating].color : '#223149',
                  borderColor: RATING_META[rating].color,
                },
              ]}
              onPress={() => onRate(rating)}>
              <Ionicons
                name={RATING_ICONS[rating]}
                color={active ? '#0F172A' : RATING_META[rating].color}
                size={16}
              />
              <Text style={[styles.ratingText, active && styles.ratingTextActive]}>
                {RATING_META[rating].label}
              </Text>
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

          <Text style={[styles.settingsLabel, styles.filterLabel]}>Progress bar</Text>
          <Pressable
            style={styles.select}
            onPress={() => setDraftShowProgress((current) => !current)}>
            <Text style={styles.selectText}>
              {draftShowProgress ? 'Visible on study screen' : 'Hidden on study screen'}
            </Text>
            <Ionicons
              name={draftShowProgress ? 'eye-outline' : 'eye-off-outline'}
              color="#CBD5E1"
              size={18}
            />
          </Pressable>

          <View style={styles.settingsActions}>
            <Pressable
              style={styles.resetButton}
              onPress={() => {
                setDraftSortBy('newest');
                setDraftRatings(ALL_RATINGS);
                setDraftShowProgress(true);
              }}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>

            <Pressable
              style={styles.applyButton}
              onPress={() => {
                setSortBy(draftSortBy);
                setFilterRatings(draftRatings.length ? draftRatings : ALL_RATINGS);
                setShowProgress(draftShowProgress);
                setSettingsVisible(false);
              }}>
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </MakiBottomSheet>

      <MakiBottomSheet visible={editVisible} onClose={() => setEditVisible(false)} title="Edit flashcard">
        <View style={styles.editForm}>
          <Text style={styles.settingsLabel}>Question</Text>
          <TextInput
            value={editQuestion}
            onChangeText={setEditQuestion}
            style={[styles.editInput, styles.questionInput]}
            multiline
            placeholder="Enter question"
            placeholderTextColor="#64748B"
          />

          <Text style={[styles.settingsLabel, styles.filterLabel]}>Options (max 7)</Text>
          {editOptions.map((optionText, index) => (
            <View key={`option-${index}`} style={styles.optionEditRow}>
              <TextInput
                value={optionText}
                onChangeText={(value) =>
                  setEditOptions((current) => current.map((item, idx) => (idx === index ? value : item)))
                }
                style={[styles.editInput, styles.optionEditInput]}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                placeholderTextColor="#64748B"
              />
              {editOptions.length > 2 ? (
                <Pressable
                  style={styles.removeOptionButton}
                  onPress={() => {
                    const optionIdToRemove = OPTION_IDS[index];
                    setEditOptions((current) => current.filter((_, idx) => idx !== index));
                    setEditCorrectOptionId((current) =>
                      current === optionIdToRemove ? 'a' : current
                    );
                  }}>
                  <Ionicons name="remove" color="#FCA5A5" size={16} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {editOptions.length < 7 ? (
            <Pressable
              style={styles.addOptionButton}
              onPress={() => setEditOptions((current) => [...current, ''])}>
              <Ionicons name="add" color="#DBEAFE" size={14} />
              <Text style={styles.addOptionText}>Add option</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.settingsLabel, styles.filterLabel]}>Correct answer</Text>
          <View style={styles.correctRow}>
            {editOptions.map((_, index) => {
              const optionId = OPTION_IDS[index];
              const active = editCorrectOptionId === optionId;
              return (
                <Pressable
                  key={optionId}
                  style={[styles.correctChip, active && styles.correctChipActive]}
                  onPress={() => setEditCorrectOptionId(optionId)}>
                  <Text style={[styles.correctChipText, active && styles.correctChipTextActive]}>
                    {optionId.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.settingsActions}>
            <Pressable style={styles.resetButton} onPress={() => setEditVisible(false)}>
              <Text style={styles.resetText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.applyButton, !canSaveCardEdit && styles.disabledButton]}
              onPress={saveCardEdits}
              disabled={!canSaveCardEdit}>
              <Text style={styles.applyText}>Save changes</Text>
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

function showNotice(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert('Maki', message);
}

function SwipeOverlay({
  label,
  icon,
  color,
}: {
  label: string;
  icon: 'thumbs-up' | 'thumbs-down';
  color: string;
}) {
  return (
    <View style={styles.overlayBadge}>
      <Ionicons name={icon} color={color} size={18} />
      <Text style={[styles.overlayText, { color }]}>{label}</Text>
    </View>
  );
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
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
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 178,
  },
  contentContainerCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 200,
  },
  contentContainerEmpty: {
    justifyContent: 'flex-start',
  },
  swiperWrap: {
    minHeight: 400,
    width: '100%',
    maxWidth: 640,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  swiperContainer: {
    width: '100%',
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperCard: {
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#1C2541',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  question: {
    color: '#F8FAFC',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
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
  overlayLeft: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginTop: 22,
    marginLeft: 16,
  },
  overlayRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginTop: 22,
    marginRight: 16,
  },
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172Add',
  },
  overlayText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  swipeHint: {
    color: '#93C5FD',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
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
    fontSize: 14,
    fontWeight: '700',
  },
  bannerLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 12,
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
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ratingButtonActive: {
    shadowColor: '#FDE047',
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  ratingButtonDisabled: {
    opacity: 0.55,
  },
  ratingText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 12,
  },
  ratingTextActive: {
    color: '#0F172A',
    fontWeight: '800',
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
  editForm: {
    paddingTop: 4,
  },
  editInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  questionInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  correctRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  correctChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    paddingVertical: 10,
  },
  correctChipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  correctChipText: {
    color: '#CBD5E1',
    fontWeight: '700',
  },
  correctChipTextActive: {
    color: '#DBEAFE',
  },
  disabledButton: {
    opacity: 0.5,
  },
  optionEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionEditInput: {
    flex: 1,
  },
  removeOptionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    backgroundColor: '#3F1D1D',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  addOptionButton: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addOptionText: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '700',
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
