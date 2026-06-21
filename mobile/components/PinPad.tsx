import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', '⌫'],
];

interface Props {
  length: number;
  value: string;
  onKey: (key: string) => void;
  error?: boolean;
  shakeAnim?: Animated.Value;
}

/** Reusable PIN dots + numeric keypad (presentational only). */
export function PinPad({ length, value, onKey, error, shakeAnim }: Props) {
  return (
    <View className="items-center w-full">
      {/* Dots */}
      <Animated.View
        className="flex-row gap-5 mb-12"
        style={shakeAnim ? { transform: [{ translateX: shakeAnim }] } : undefined}
      >
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor:
                i < value.length
                  ? error ? '#EF4444' : '#1A3C2B'
                  : 'rgba(26,60,43,0.12)',
            }}
          />
        ))}
      </Animated.View>

      {/* Keypad */}
      <View style={{ gap: 10, width: '100%' }}>
        {KEYPAD.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            {row.map((key, ki) => {
              if (key === '') return <View key={ki} style={{ width: 92, height: 70 }} />;
              const isBack = key === '⌫';
              return (
                <TouchableOpacity
                  key={ki}
                  onPress={() => onKey(key)}
                  activeOpacity={0.55}
                  style={{
                    width: 92,
                    height: 70,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isBack ? 'transparent' : '#FFFFFF',
                    borderWidth: isBack ? 0 : 1,
                    borderColor: '#E2EDE8',
                  }}
                >
                  {isBack ? (
                    <Ionicons name="backspace-outline" size={22} color="#6B7C74" />
                  ) : (
                    <Text style={{ fontSize: 24, fontWeight: '500', color: '#1C1C1E' }}>{key}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
