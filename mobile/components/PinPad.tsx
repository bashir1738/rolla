import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PIN_LENGTH = 4;

const ROWS = [
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
  disabled?: boolean;
}

export function PinPad({ length, value, onKey, error, shakeAnim, disabled }: Props) {
  return (
    <View style={styles.container}>
      {/* Dots */}
      <Animated.View
        style={[
          styles.dots,
          shakeAnim ? { transform: [{ translateX: shakeAnim }] } : undefined,
        ]}
      >
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < value.length
                    ? error ? '#EF4444' : '#1A3C2B'
                    : 'rgba(26,60,43,0.15)',
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => {
              if (key === '') {
                return <View key={ki} style={styles.keyEmpty} />;
              }
              const isBack = key === '⌫';
              return (
                <TouchableOpacity
                  key={ki}
                  onPress={() => !disabled && onKey(key)}
                  activeOpacity={0.6}
                  style={[
                    styles.key,
                    isBack && styles.keyBack,
                    disabled && styles.keyDisabled,
                  ]}
                >
                  {isBack ? (
                    <Ionicons name="backspace-outline" size={22} color="#6B7C74" />
                  ) : (
                    <Text style={styles.keyText}>{key}</Text>
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  dots: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 36,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  keypad: {
    gap: 12,
    width: '100%',
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  key: {
    width: 90,
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EDE8',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  keyBack: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyEmpty: {
    width: 90,
    height: 68,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1C1C1E',
  },
});
