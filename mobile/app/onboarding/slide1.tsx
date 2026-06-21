import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Flat geometric illustration: members seated around a central savings pot.
function CircleIllustration() {
  const seats = [
    { emoji: '👨🏿', angle: 270 },
    { emoji: '👩🏾', angle: 342 },
    { emoji: '🧑🏿', angle: 54 },
    { emoji: '👨🏾', angle: 126 },
    { emoji: '👩🏿', angle: 198 },
  ];
  return (
    <View className="w-64 h-64 items-center justify-center">
      {/* concentric guide rings */}
      <View className="absolute w-60 h-60 rounded-full border border-primary/10" />
      <View className="absolute w-44 h-44 rounded-full border border-primary/10" />

      {seats.map(({ emoji, angle }, i) => {
        const rad = (angle * Math.PI) / 180;
        const r = 104;
        return (
          <View
            key={i}
            className="absolute w-14 h-14 rounded-2xl bg-card items-center justify-center border border-border"
            style={{
              transform: [{ translateX: Math.cos(rad) * r }, { translateY: Math.sin(rad) * r }],
              shadowColor: '#1A3C2B',
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </View>
        );
      })}

      {/* central pot */}
      <View
        className="w-24 h-24 rounded-3xl bg-primary items-center justify-center"
        style={{ shadowColor: '#1A3C2B', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
      >
        <Text style={{ fontSize: 44 }}>🏺</Text>
      </View>

      {/* floating gold coins */}
      <View className="absolute" style={{ top: 36, right: 64 }}>
        <View className="w-7 h-7 rounded-full bg-accent items-center justify-center">
          <Text style={{ fontSize: 13 }}>🪙</Text>
        </View>
      </View>
      <View className="absolute" style={{ top: 70, left: 56 }}>
        <View className="w-5 h-5 rounded-full bg-accent/80" />
      </View>
    </View>
  );
}

export default function Slide1() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar style="dark" />
      {/* Top bar */}
      <View className="flex-row justify-between items-center px-6 pt-2">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-xl bg-primary items-center justify-center">
            <Ionicons name="leaf" size={15} color="#D4A017" />
          </View>
          <Text className="text-primary text-xl font-black tracking-tight">Rolla</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} accessibilityLabel="Skip onboarding">
          <Text className="text-muted text-sm font-medium">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Illustration on a soft tinted panel */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full rounded-[32px] bg-primary/5 border border-primary/10 items-center justify-center py-8">
          <CircleIllustration />
          <View className="flex-row gap-2 mt-4">
            <View className="bg-card rounded-full px-3 py-1.5 border border-border">
              <Text className="text-primary text-xs font-bold">Family & friends</Text>
            </View>
            <View className="bg-accent/15 rounded-full px-3 py-1.5 border border-accent/30">
              <Text className="text-accent text-xs font-bold">Everyone gets paid</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Copy + CTA */}
      <View className="px-7 pb-10">
        <View className="flex-row gap-1.5 mb-5">
          <View className="w-6 h-2 rounded-full bg-accent" />
          <View className="w-2 h-2 rounded-full bg-primary/20" />
          <View className="w-2 h-2 rounded-full bg-primary/20" />
        </View>

        <Text className="text-charcoal text-[32px] leading-[38px] font-black tracking-tight mb-3">
          Your Circle,{'\n'}Your Rules
        </Text>
        <Text className="text-muted text-base leading-relaxed mb-7">
          Create or join a rotating savings group with people you trust. Everyone
          contributes, everyone gets paid — enforced by smart contracts, not promises.
        </Text>

        <TouchableOpacity
          className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
          onPress={() => router.push('/onboarding/slide2')}
          accessibilityLabel="Next"
        >
          <Text className="text-white text-base font-bold">Next</Text>
          <Ionicons name="arrow-forward" size={18} color="#D4A017" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
