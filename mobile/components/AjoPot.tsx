import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { COLORS } from '../constants/theme';

interface AjoPotProps {
  fillPercent: number;   // 0–100
  size?: number;
  animated?: boolean;
}

export function AjoPot({ fillPercent, size = 80, animated = true }: AjoPotProps) {
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(Math.max(0, Math.min(100, fillPercent)), {
      duration: animated ? 800 : 0,
      easing: Easing.out(Easing.cubic),
    });
  }, [fillPercent]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fill.value}%`,
  }));

  const scale = size / 80;
  const bodyW  = Math.round(56 * scale);
  const bodyH  = Math.round(64 * scale);
  const rimW   = Math.round(66 * scale);
  const rimH   = Math.round(10 * scale);
  const handleW = Math.round(14 * scale);
  const handleH = Math.round(22 * scale);
  const coinSz  = Math.round(16 * scale);

  return (
    <View style={[styles.container, { width: size + 20, height: size + 20 }]}>
      {/* Coins floating above (visible at >25%) */}
      {fillPercent > 25 && (
        <View style={[styles.coinsRow, { bottom: bodyH + rimH + 4 }]}>
          {fillPercent > 75 && <Text style={[styles.coin, { fontSize: coinSz }]}>🪙</Text>}
          {fillPercent > 50 && <Text style={[styles.coin, { fontSize: coinSz }]}>🪙</Text>}
          <Text style={[styles.coin, { fontSize: coinSz }]}>🪙</Text>
        </View>
      )}

      {/* Rim */}
      <View style={[styles.rim, { width: rimW, height: rimH, borderRadius: rimH / 2 }]} />

      {/* Pot body with animated fill */}
      <View
        style={[
          styles.body,
          {
            width: bodyW,
            height: bodyH,
            borderBottomLeftRadius: bodyW / 2,
            borderBottomRightRadius: bodyW / 2,
          },
        ]}
      >
        {/* Fill layer — clips from bottom */}
        <Animated.View
          style={[
            styles.fillLayer,
            fillStyle,
            {
              borderBottomLeftRadius: bodyW / 2,
              borderBottomRightRadius: bodyW / 2,
            },
          ]}
        />
      </View>

      {/* Left handle */}
      <View
        style={[
          styles.handle,
          styles.handleLeft,
          {
            width: handleW,
            height: handleH,
            left: (size + 20 - bodyW) / 2 - handleW + 4,
            bottom: bodyH * 0.25,
            borderRadius: handleW / 2,
          },
        ]}
      />
      {/* Right handle */}
      <View
        style={[
          styles.handle,
          styles.handleRight,
          {
            width: handleW,
            height: handleH,
            right: (size + 20 - bodyW) / 2 - handleW + 4,
            bottom: bodyH * 0.25,
            borderRadius: handleW / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  coinsRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  coin: {
    opacity: 0.9,
  },
  rim: {
    backgroundColor: COLORS.primary,
    marginBottom: -2,
    zIndex: 2,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  body: {
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  fillLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    opacity: 0.85,
  },
  handle: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.primary,
    zIndex: 0,
  },
  handleLeft: {},
  handleRight: {},
});
