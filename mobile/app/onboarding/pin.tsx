import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Vibration, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { PinPad, PIN_LENGTH } from '../../components/PinPad';

type Step = 'enter' | 'confirm' | 'done';

export default function PinSetup() {
  const router = useRouter();
  const { setupPin } = useAuth();

  const [step, setStep] = useState<Step>('enter');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const firstRef = useRef('');
  const secondRef = useRef('');
  const stepRef = useRef<Step>('enter');

  const shake = () => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const onKey = (key: string) => {
    if (stepRef.current === 'enter') {
      const cur = firstRef.current;
      const val = key === '⌫' ? cur.slice(0, -1) : cur.length < PIN_LENGTH ? cur + key : cur;
      firstRef.current = val;
      setFirst(val);
      if (val.length === PIN_LENGTH) {
        stepRef.current = 'confirm';
        setTimeout(() => setStep('confirm'), 150);
      }
    } else {
      const cur = secondRef.current;
      const val = key === '⌫' ? cur.slice(0, -1) : cur.length < PIN_LENGTH ? cur + key : cur;
      secondRef.current = val;
      setSecond(val);
      if (val.length === PIN_LENGTH) {
        if (val === firstRef.current) {
          setupPin(firstRef.current).then(() => {
            setStep('done');
            setTimeout(() => router.replace('/(tabs)'), 1200);
          });
        } else {
          shake();
          setTimeout(() => { secondRef.current = ''; setSecond(''); }, 500);
        }
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        {step !== 'done' && (
          <>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="lock-closed-outline" size={30} color="#1A3C2B" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 }}>
              {step === 'enter' ? 'Create your PIN' : 'Confirm your PIN'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7C74', textAlign: 'center', marginBottom: 36, lineHeight: 20 }}>
              {step === 'enter' ? 'Choose a 4-digit PIN to secure your account.' : 'Enter the same PIN again to confirm.'}
            </Text>
            <PinPad
              length={PIN_LENGTH}
              value={step === 'enter' ? first : second}
              onKey={onKey}
              shakeAnim={shakeAnim}
            />
          </>
        )}

        {step === 'done' && (
          <>
            <View
              style={{
                width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FDF4',
                borderWidth: 1.5, borderColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Ionicons name="checkmark" size={44} color="#16A34A" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 }}>
              All set!
            </Text>
            <Text style={{ fontSize: 15, color: '#6B7C74', textAlign: 'center', marginBottom: 36 }}>
              Your PIN is secure. You'll use it to authorize transactions.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
