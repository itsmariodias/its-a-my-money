import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/**
 * A horizontal, paged carousel: spread `scrollProps` on an `Animated.ScrollView` and give each
 * page `width: pageWidth`.
 *
 * Pages usually differ in height, so the carousel follows the page in view: wrap each page's
 * content in a View with `onLayout={(e) => onPageLayout(key, e)}`, and the height is interpolated
 * from the scroll position so it eases between pages mid-swipe instead of jumping.
 * `verticalPadding` is the padding around that measured View, added back on.
 *
 * Heights are keyed by page, not position: when a page drops out, the ones after it shift left
 * without changing size, so they never re-fire onLayout — a height stored by index would then
 * belong to the wrong page and clip it.
 */
export function useCarousel(pageKeys: readonly string[], pageWidth: number, verticalPadding = 0) {
  const pageCount = pageKeys.length;
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [pageHeights, setPageHeights] = useState<Record<string, number>>({});

  const goTo = (i: number) => {
    ref.current?.scrollTo({ x: i * pageWidth, animated: true });
    setIndex(i);
  };

  // A page can disappear (the forecast on a past period); don't stay parked past the end.
  useEffect(() => {
    if (pageCount > 0 && index >= pageCount) goTo(pageCount - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);

  const onPageLayout = (key: string, e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height + verticalPadding * 2;
    setPageHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h }));
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== index) setIndex(i);
  };

  const allPagesMeasured = pageCount > 1 && pageKeys.every((key) => pageHeights[key] !== undefined);
  const height = allPagesMeasured
    ? scrollX.interpolate({
        inputRange: pageKeys.map((_, i) => i * pageWidth),
        outputRange: pageKeys.map((key) => pageHeights[key]),
        extrapolate: 'clamp',
      })
    : undefined;

  const scrollProps = {
    ref,
    horizontal: true,
    pagingEnabled: true,
    showsHorizontalScrollIndicator: false,
    onScroll: Animated.event(
      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
      // Height cannot run on the native driver.
      { useNativeDriver: false, listener: onScroll },
    ),
    scrollEventThrottle: 16,
    decelerationRate: 'fast' as const,
    style: height !== undefined ? { height } : undefined,
  };

  return { index, goTo, onPageLayout, scrollProps };
}
