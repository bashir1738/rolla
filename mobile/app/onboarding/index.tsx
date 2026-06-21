import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../providers/WalletContext';
import { SavingsCircleArt, GrowthArt, TrustArt } from '../../components/OnboardingArt';

interface Slide {
  key: string;
  Art: (p: { size?: number }) => React.ReactElement;
  title: string;
  body: string;
  chips: string[];
}

const SLIDES: Slide[] = [
  {
    key: 'circle',
    Art: SavingsCircleArt,
    title: 'Save Together,\nWin Together',
    body:
      "Start a savings group with people you trust. Everyone chips in, and each round one person takes home the full pot. It's the ajo you grew up with — just safer.",
    chips: [''],
  },
  {
    key: 'grow',
    Art: GrowthArt,
    title: 'Watch Your\nMoney Grow',
    body:
      'Waiting for your turn? Let your savings earn a little extra in the meantime. Put money in whenever you like, and take it out whenever you need it.',
    chips: [''],
  },
  {
    key: 'trust',
    Art: TrustArt,
    title: 'Your Money\nIs Always Safe',
    body:
      "No more worrying about who's holding the cash. Nobody can run off with the pot, and nobody can skip their turn. Everyone sees everything, always.",
    chips: [''],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { connect, isConnected } = useWallet();
  const scrollX = useRef(new Animated.Value(0)).current;
  // Separate JS-driven value for dots — 'width' can't animate on the native driver
  const scrollXDots = useRef(new Animated.Value(0)).current;
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [connecting, setConnecting] = useState(false);

  React.useEffect(() => {
    if (isConnected) router.replace('/onboarding/name');
  }, [isConnected]);

  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) return;
    listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
  };

  const finish = () => {
    setConnecting(true);
    try {
      connect();
    } finally {
      setTimeout(() => setConnecting(false), 1500);
    }
  };

  const onMomentumEnd = (e: any) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar style="dark" />

      {/* Top bar */}
      <View className="flex-row justify-between items-center px-6 pt-2 z-10">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-xl bg-primary items-center justify-center">
            <Ionicons name="leaf" size={15} color="#D4A017" />
          </View>
          <Text className="text-primary text-xl font-black tracking-tight">Rolla</Text>
        </View>
        {!isLast && (
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} accessibilityLabel="Skip">
            <Text className="text-muted text-sm font-medium">Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Swipeable pages */}
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: ({ nativeEvent }: any) => {
              scrollXDots.setValue(nativeEvent.contentOffset.x);
            },
          },
        )}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        renderItem={({ item, index: i }) => (
          <Page slide={item} index={i} scrollX={scrollX} width={width} />
        )}
      />

      {/* Bottom controls */}
      <View className="px-7 pb-10 pt-2">
        {/* pill dots */}
        <View className="flex-row items-center mb-6 justify-center">
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollXDots.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollXDots.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  listRef.current?.scrollToOffset({ offset: i * width, animated: true });
                  setIndex(i);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={{ marginHorizontal: 3 }}
              >
                <Animated.View
                  style={{
                    width: dotWidth,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#D4A017',
                    opacity,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {isLast ? (
          <>
            <TouchableOpacity
              className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2 mb-3"
              onPress={finish}
              disabled={connecting}
              accessibilityLabel="Connect wallet"
            >
              {connecting ? (
                <ActivityIndicator color="#D4A017" />
              ) : (
                <>
                  <Ionicons name="wallet" size={20} color="#D4A017" />
                  <Text className="text-white text-base font-bold">Connect Wallet</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity className="py-1 items-center" onPress={() => router.replace('/(tabs)')}>
              <Text className="text-muted text-sm">I'll do this later →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
            onPress={goNext}
            accessibilityLabel="Next"
          >
            <Text className="text-white text-base font-bold">Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#D4A017" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function Page({
  slide, index, scrollX, width,
}: { slide: Slide; index: number; scrollX: Animated.Value; width: number }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  // Parallax + scale + fade for a polished transition between screens.
  const artScale = scrollX.interpolate({ inputRange, outputRange: [0.78, 1, 0.78], extrapolate: 'clamp' });
  const artTranslate = scrollX.interpolate({ inputRange, outputRange: [width * 0.18, 0, -width * 0.18], extrapolate: 'clamp' });
  const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const textTranslate = scrollX.interpolate({ inputRange, outputRange: [40, 0, -40], extrapolate: 'clamp' });

  const { Art } = slide;
  const artSize = Math.min(width * 0.8, 320);

  return (
    <View style={{ width }} className="flex-1 px-7">
      {/* Illustration on a soft tinted panel */}
      <View className="flex-1 items-center justify-center">
        <Animated.View
          style={{ transform: [{ translateX: artTranslate }, { scale: artScale }] }}
          className="w-full rounded-[32px] bg-primary/5 border border-primary/10 items-center justify-center py-6"
        >
          <Art size={artSize} />
          <View className="flex-row gap-2 mt-1">

          </View>
        </Animated.View>
      </View>

      {/* Copy */}
      <Animated.View style={{ opacity: textOpacity, transform: [{ translateX: textTranslate }] }} className="pb-2">
        <Text className="text-charcoal text-[32px] leading-[38px] font-black tracking-tight mb-3">
          {slide.title}
        </Text>
        <Text className="text-muted text-base leading-relaxed">{slide.body}</Text>
      </Animated.View>
    </View>
  );
}
