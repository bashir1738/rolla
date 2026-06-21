import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignMessage } from 'wagmi';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useWallet } from '../../providers/WalletContext';
import { useDisplayName } from '../../hooks/useDisplayName';
import { PinPad } from '../../components/PinPad';

const PIN_KEY = 'rolla_pin';
const BIOMETRIC_KEY = 'rolla_biometric_enabled';
const PIN_LENGTH = 4;

type Stage = 'loading' | 'input' | 'saving' | 'biometric' | 'pin' | 'pin-confirm' | 'done';

export default function NameSetup() {
  const router = useRouter();
  const { address } = useWallet();
  const { name: existingName, loaded, save } = useDisplayName(address);
  const { signMessageAsync } = useSignMessage();

  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('loading');
  const [biometricType, setBiometricType] = useState<'face' | 'finger' | null>(null);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Refs for stable access inside keypad handler — avoids stale closure bugs
  // when multiple key presses fire before React flushes state updates.
  const pinRef = useRef('');
  const stageRef = useRef<Stage>('loading');
  const syncStage = (s: Stage) => { stageRef.current = s; setStage(s); };
  const syncPin   = (p: string) => { pinRef.current   = p; setPin(p);   };

  useEffect(() => {
    if (!loaded) return;
    // Only act during the initial load — after the user starts filling in
    // their name, existingName will update (save writes to storage) and we
    // must NOT redirect back to tabs before the PIN stage shows.
    if (stageRef.current !== 'loading') return;
    if (existingName) {
      router.replace('/(tabs)');
    } else {
      syncStage('input');
    }
  }, [loaded, existingName]);

  const handleSave = async () => {
    const name = input.trim();
    if (!name) return;
    Keyboard.dismiss();
    syncStage('saving');

    let sig: string | undefined;
    try {
      sig = await signMessageAsync({ message: `Rolla name: ${name}` });
    } catch {}

    await save(name, sig);

    // Check biometric hardware — wrapped in try/catch in case the module
    // is unavailable (e.g. Expo Go or emulators without biometric support).
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled    = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const isFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        setBiometricType(isFace ? 'face' : 'finger');
        syncStage('biometric');
        return;
      }
    } catch {}

    syncStage('pin');
  };

  const handleEnableBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: biometricType === 'face'
          ? 'Enable Face ID for Rolla'
          : 'Enable Touch ID for Rolla',
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Not now',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
      }
    } catch {}
    syncPin('');
    syncStage('pin');
  };

  const handleKey = useCallback((key: string) => {
    const isConfirm = stageRef.current === 'pin-confirm';

    if (key === '⌫') {
      if (isConfirm) setPinConfirm((c) => c.slice(0, -1));
      else syncPin(pinRef.current.slice(0, -1));
      return;
    }

    if (isConfirm) {
      setPinConfirm((c) => {
        if (c.length >= PIN_LENGTH) return c;
        const next = c + key;
        if (next.length === PIN_LENGTH) {
          // Read the saved PIN from ref so we always compare against latest value
          if (next === pinRef.current) {
            setTimeout(() => finishSetup(next), 0);
          } else {
            setTimeout(() => {
              shake();
              setPinConfirm('');
            }, 0);
          }
        }
        return next;
      });
    } else {
      const next = pinRef.current + key;
      if (next.length > PIN_LENGTH) return;
      syncPin(next);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => syncStage('pin-confirm'), 280);
      }
    }
  }, []); // empty deps — reads stageRef/pinRef for stable values

  const shake = () => {
    setPinError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start(() => setPinError(false));
  };

  const finishSetup = async (confirmedPin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, confirmedPin);
    syncStage('done');
    setTimeout(() => router.replace('/(tabs)'), 1200);
  };

  const isConfirm  = stage === 'pin-confirm';
  const activePin  = isConfirm ? pinConfirm : pin;
  const biometricLabel = biometricType === 'face' ? 'Face ID' : 'Touch ID';
  const biometricIcon  = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={stage === 'input' ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
      >
        <View className="flex-1 px-6 justify-center">

          {/* Loading */}
          {stage === 'loading' && (
            <View className="items-center">
              <ActivityIndicator color="#1A3C2B" />
            </View>
          )}

          {/* Saving */}
          {stage === 'saving' && (
            <View className="items-center gap-4">
              <ActivityIndicator size="large" color="#1A3C2B" />
              <Text className="text-charcoal font-semibold text-lg text-center">
                Saving your name
              </Text>
              <Text className="text-muted text-sm text-center">
                Approve the wallet prompt — it costs nothing.
              </Text>
            </View>
          )}

          {/* Done */}
          {stage === 'done' && (
            <View className="items-center gap-4">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0' }}
              >
                <Ionicons name="checkmark" size={36} color="#16A34A" />
              </View>
              <Text className="text-charcoal font-black text-3xl text-center mt-2">
                {input.trim()}
              </Text>
              <Text className="text-muted text-base text-center">You're all set.</Text>
            </View>
          )}

          {/* Name input */}
          {stage === 'input' && (
            <View>
              <Text className="text-charcoal text-[30px] font-black leading-[36px] mb-2">
                What should we{'\n'}call you?
              </Text>
              <Text className="text-muted text-base mb-8 leading-relaxed">
                This is what your circle will see.
              </Text>

              <TextInput
                className="text-charcoal text-base font-medium bg-white px-4 py-4 rounded-2xl mb-8"
                style={{ borderWidth: 1, borderColor: '#D9E8E0' }}
                placeholderTextColor="#6B7C74"
                placeholder="Your name or nickname"
                value={input}
                onChangeText={setInput}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoFocus
              />

              <TouchableOpacity
                className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
                onPress={handleSave}
                disabled={!input.trim()}
                style={{ opacity: !input.trim() ? 0.3 : 1 }}
              >
                <Text className="text-white text-base font-bold">Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#D4A017" />
              </TouchableOpacity>
            </View>
          )}

          {/* Biometric setup */}
          {stage === 'biometric' && (
            <View className="items-center">
              <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-8">
                <Ionicons name={biometricIcon as any} size={38} color="#D4A017" />
              </View>

              <Text className="text-charcoal text-[26px] font-black text-center leading-[32px] mb-3">
                Enable {biometricLabel}
              </Text>
              <Text className="text-muted text-base text-center leading-relaxed mb-10">
                {biometricType === 'face'
                  ? 'Use Face ID to open Rolla instantly.'
                  : 'Use your fingerprint to open Rolla instantly.'}
              </Text>

              <TouchableOpacity
                className="w-full bg-primary rounded-full py-4 items-center mb-4"
                onPress={handleEnableBiometric}
              >
                <Text className="text-white text-base font-bold">Enable {biometricLabel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-3"
                onPress={() => { syncPin(''); syncStage('pin'); }}
              >
                <Text className="text-muted text-sm">Skip, use PIN only</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PIN entry + confirm */}
          {(stage === 'pin' || stage === 'pin-confirm') && (
            <View className="items-center">
              <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-7">
                <Ionicons name="lock-closed-outline" size={34} color="#D4A017" />
              </View>

              <Text className="text-charcoal text-[26px] font-black text-center leading-[32px] mb-1">
                {isConfirm ? 'Confirm your PIN' : 'Create a PIN'}
              </Text>
              <Text className="text-muted text-sm text-center mb-10">
                {isConfirm ? 'Enter it once more' : '4-digit PIN to secure your account'}
              </Text>

              <PinPad
                length={PIN_LENGTH}
                value={activePin}
                onKey={handleKey}
                error={pinError}
                shakeAnim={shakeAnim}
              />

              {isConfirm && (
                <TouchableOpacity
                  className="mt-8 py-2"
                  onPress={() => { setPinConfirm(''); syncPin(''); syncStage('pin'); }}
                >
                  <Text className="text-muted text-sm">Change PIN</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
