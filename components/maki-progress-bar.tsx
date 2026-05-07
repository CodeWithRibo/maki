import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { RATING_META, Rating } from '@/types/maki';

const ORDER: Rating[] = ['bad', 'ok', 'good', 'perfect'];

export function MakiProgressBar({
  totalCards,
  ratingCounts,
}: {
  totalCards: number;
  ratingCounts: Record<Rating, number>;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const badWidth = useSharedValue(0);
  const okWidth = useSharedValue(0);
  const goodWidth = useSharedValue(0);
  const perfectWidth = useSharedValue(0);

  const targets = useMemo(
    () =>
      ORDER.map((rating) => {
        if (!totalCards || !barWidth) {
          return 0;
        }

        return (ratingCounts[rating] / totalCards) * barWidth;
      }),
    [barWidth, ratingCounts, totalCards]
  );

  useEffect(() => {
    badWidth.value = withTiming(targets[0], { duration: 420 });
    okWidth.value = withTiming(targets[1], { duration: 420 });
    goodWidth.value = withTiming(targets[2], { duration: 420 });
    perfectWidth.value = withTiming(targets[3], { duration: 420 });
  }, [badWidth, goodWidth, okWidth, perfectWidth, targets]);

  const ratedCards = ratingCounts.bad + ratingCounts.ok + ratingCounts.good + ratingCounts.perfect;
  const unratedCards = totalCards - ratedCards;

  return (
    <View>
      <View
        style={styles.track}
        onLayout={(event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width)}>
        <Segment color={RATING_META.bad.color} width={badWidth} />
        <Segment color={RATING_META.ok.color} width={okWidth} />
        <Segment color={RATING_META.good.color} width={goodWidth} />
        <Segment color={RATING_META.perfect.color} width={perfectWidth} />
      </View>
      <View style={styles.legend}>
        <LegendItem rating="bad" count={ratingCounts.bad} />
        <LegendItem rating="ok" count={ratingCounts.ok} />
        <LegendItem rating="good" count={ratingCounts.good} />
        <LegendItem rating="perfect" count={ratingCounts.perfect} />
        {unratedCards > 0 && <LegendItem rating="unrated" count={unratedCards} />}
      </View>
    </View>
  );
}

function LegendItem({ rating, count }: { rating: 'bad' | 'ok' | 'good' | 'perfect' | 'unrated'; count: number }) {
  const color = rating === 'unrated' ? '#64748B' : RATING_META[rating as Rating].color;
  const label = rating === 'unrated' ? 'Unrated' : RATING_META[rating as Rating].label;

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendCount}>{count}</Text>
    </View>
  );
}

function Segment({ color, width }: { color: string; width: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return <Animated.View style={[styles.segment, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  track: {
    height: 16,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#273449',
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  segment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 32,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  legendCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
});
