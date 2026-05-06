import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
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

  return (
    <View
      style={styles.track}
      onLayout={(event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width)}>
      <Segment color={RATING_META.bad.color} width={badWidth} />
      <Segment color={RATING_META.ok.color} width={okWidth} />
      <Segment color={RATING_META.good.color} width={goodWidth} />
      <Segment color={RATING_META.perfect.color} width={perfectWidth} />
    </View>
  );
}

function Segment({ color, width }: { color: string; width: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return <Animated.View style={[styles.segment, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#273449',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.25,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  segment: {
    height: '100%',
  },
});
