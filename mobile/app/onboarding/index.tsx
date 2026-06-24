import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, useWindowDimensions,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../providers/WalletContext';

const CREAM  = '#FAF6EE';
const FOREST = '#1A3C2B';
const GOLD   = '#D4A017';

interface Slide {
  key: string;
  image: ReturnType<typeof require>;
  title: string;
  body: string;
  anchorBottom?: boolean; // clip top edge so bottom of image shows
}

const SLIDES: Slide[] = [
  {
    key: 'circle',
    image: require('../../assets/images/onboarding/slide1.jpg'),
    anchorBottom: true,
    title: 'Save Together,\nWin Together',
    body: "Start a savings group with people you trust. Everyone chips in, and each round one person takes the full pot.",
  },
  {
    key: 'grow',
    image: require('../../assets/images/onboarding/slide2.jpg'),
    title: 'Watch Your\nMoney Grow',
    body: "Waiting for your turn? Your savings earn a little extra in the meantime. Deposit anytime, withdraw whenever you need.",
  },
  {
    key: 'trust',
    image: require('../../assets/images/onboarding/slide3.jpg'),
    title: 'Your Money\nIs Always Safe',
    body: "Nobody can run off with the pot and nobody can skip their turn. Smart contracts enforce every rule — no trust required.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { connect, isConnected } = useWallet();

  const scrollX     = useRef(new Animated.Value(0)).current;
  const scrollXDots = useRef(new Animated.Value(0)).current;
  const listRef     = useRef<Animated.FlatList<Slide>>(null);

  const [index, setIndex]         = useState(0);
  const [connecting, setConnecting] = useState(false);

  const IMAGE_H   = height * 0.60;
  const OVERLAP   = 32;

  React.useEffect(() => {
    if (isConnected) router.replace('/onboarding/name');
  }, [isConnected]);

  const isLast = index === SLIDES.length - 1;

  const goNext = () =>
    listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });

  const skipToLast = () => {
    const last = SLIDES.length - 1;
    listRef.current?.scrollToOffset({ offset: last * width, animated: true });
    setIndex(last);
  };

  const finish = () => {
    setConnecting(true);
    try { connect(); } finally { setTimeout(() => setConnecting(false), 1500); }
  };

  const onMomentumEnd = (e: any) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Image area ── */}
      <View style={{ height: IMAGE_H }}>
        <Animated.FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          style={{ flex: 1 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
              useNativeDriver: true,
              listener: ({ nativeEvent }: any) =>
                scrollXDots.setValue(nativeEvent.contentOffset.x),
            },
          )}
          onMomentumScrollEnd={onMomentumEnd}
          scrollEventThrottle={16}
          renderItem={({ item, index: i }) => (
            <ImagePage
              slide={item}
              index={i}
              scrollX={scrollX}
              width={width}
              height={IMAGE_H}
            />
          )}
        />

        {/* Top bar: Rolla logo + skip */}
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={14} color={GOLD} />
            </View>
            <Text style={styles.logoText}>Rolla</Text>
          </View>
          {!isLast && (
            <TouchableOpacity
              onPress={skipToLast}
              style={styles.skipBtn}
              accessibilityLabel="Skip"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* ── Bottom card — overlaps image ── */}
      <View style={[styles.card, { marginTop: -OVERLAP, paddingBottom: insets.bottom + 24 }]}>

        {/* Dots — inside card, left-aligned, forest green active pill */}
        <View style={styles.dotsWrap}>
          {SLIDES.map((_, i) => {
            const ir = [(i - 1) * width, i * width, (i + 1) * width];
            const dotW = scrollXDots.interpolate({
              inputRange: ir, outputRange: [8, 28, 8], extrapolate: 'clamp',
            });
            return (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  listRef.current?.scrollToOffset({ offset: i * width, animated: true });
                  setIndex(i);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={{ marginRight: 6 }}
              >
                <Animated.View
                  style={[styles.dot, { width: dotW, backgroundColor: i === index ? FOREST : '#D1D5DB' }]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.title}>{SLIDES[index].title}</Text>
        <Text style={styles.body}>{SLIDES[index].body}</Text>

        <View style={styles.btnRow}>
          {isLast ? (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={finish}
                disabled={connecting}
                accessibilityLabel="Get started"
              >
                {connecting ? (
                  <ActivityIndicator color={GOLD} />
                ) : (
                  <>
                    <Text style={styles.btnText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={16} color={GOLD} />
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnLater}
                onPress={() => router.replace('/(tabs)')}
              >
                <Text style={styles.btnLaterText}>I'll do this later</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={goNext}
              accessibilityLabel="Next"
            >
              <Text style={styles.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color={GOLD} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function ImagePage({
  slide, index, scrollX, width, height,
}: {
  slide: Slide; index: number; scrollX: Animated.Value; width: number; height: number;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const scale = scrollX.interpolate({
    inputRange, outputRange: [1.06, 1, 1.06], extrapolate: 'clamp',
  });

  // anchorBottom: pin the image to the bottom edge so the top (ceiling/sky)
  // gets clipped rather than the bottom where the people are.
  // The image is sized to fill the container width; if it's taller than the
  // container the excess sticks out above and is hidden by overflow:hidden.
  if (slide.anchorBottom) {
    return (
      <View style={{ width, height, overflow: 'hidden' }}>
        <Animated.Image
          source={slide.image}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width,
            // Fill from bottom: height proportional to width keeps aspect ratio.
            // Use a large value so it always covers the container height too.
            height: Math.max(height, width * 1.6),
            transform: [{ scale }],
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.Image
        source={slide.image}
        style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: FOREST,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  skipBtn: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: { height: 8, borderRadius: 4 },

  card: {
    flex: 1,
    backgroundColor: CREAM,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  title: {
    color: '#1C1C1E',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  body: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },

  btnRow: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 24,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 100,
  },
  btnPrimary: { backgroundColor: FOREST },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnLater: { paddingVertical: 4 },
  btnLaterText: { color: '#9CA3AF', fontSize: 14 },
});
