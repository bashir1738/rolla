import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Animated, Vibration, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { PinPad, PIN_LENGTH } from './PinPad';

// ── PIN Pad ───────────────────────────────────────────────────────────────────

// ── Setup Screen ──────────────────────────────────────────────────────────────

function SetupScreen({ onDone }: { onDone: () => void }) {
  const { setupPin } = useAuth();
  const [step, setStep]     = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst]   = useState('');
  const [second, setSecond] = useState('');
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const firstRef   = useRef('');
  const secondRef  = useRef('');
  const stepRef    = useRef<'enter' | 'confirm'>('enter');

  const shake = () => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
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
          setupPin(firstRef.current).then(onDone);
        } else {
          shake();
          setTimeout(() => { secondRef.current = ''; setSecond(''); }, 500);
        }
      }
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
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
    </View>
  );
}

// ── Unlock / Transaction Screen ───────────────────────────────────────────────

function UnlockScreen({ onSuccess, onCancel, isTransaction }: {
  onSuccess: () => void;
  onCancel: () => void;
  isTransaction: boolean;
}) {
  const { verifyPin, verifyBiometric, hasBiometrics } = useAuth();
  const [pin, setPin]           = useState('');
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const shakeAnim      = useRef(new Animated.Value(0)).current;
  const pinRef         = useRef('');
  const verifying      = useRef(false);
  const bioTriggered   = useRef(false);

  const tryBiometric = async () => {
    const ok = await verifyBiometric();
    if (ok) onSuccess();
  };

  // Trigger as soon as hasBiometrics is confirmed true.
  // Cannot use [] — the hardware check is async and hasBiometrics starts false.
  useEffect(() => {
    if (hasBiometrics && !bioTriggered.current) {
      bioTriggered.current = true;
      tryBiometric();
    }
  }, [hasBiometrics]); // eslint-disable-line react-hooks/exhaustive-deps

  const shake = () => {
    Vibration.vibrate(300);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const onKey = async (key: string) => {
    if (verifying.current) return; // block input while checking

    const cur = pinRef.current;
    let next: string;
    if (key === '⌫') {
      next = cur.slice(0, -1);
    } else if (cur.length < PIN_LENGTH) {
      next = cur + key;
    } else {
      return;
    }

    pinRef.current = next;
    setPin(next);

    if (next.length < PIN_LENGTH) return;

    verifying.current = true;
    setChecking(true);
    const ok = await verifyPin(next);
    setChecking(false);
    verifying.current = false;

    if (ok) {
      onSuccess();
    } else {
      setAttempts((a) => a + 1);
      shake();
      setTimeout(() => { pinRef.current = ''; setPin(''); }, 600);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons
          name={isTransaction ? 'shield-checkmark-outline' : 'lock-closed-outline'}
          size={30}
          color="#1A3C2B"
        />
      </View>

      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 }}>
        {isTransaction ? 'Confirm transaction' : 'Welcome back'}
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7C74', textAlign: 'center', marginBottom: 36 }}>
        {isTransaction
          ? 'Enter your PIN or use biometrics to authorise this transaction.'
          : 'Enter your PIN or use biometrics to unlock Rolla.'}
      </Text>

      {attempts > 0 && (
        <Text style={{ color: '#C1440E', fontSize: 13, marginBottom: 12, fontWeight: '600' }}>
          Incorrect PIN{attempts >= 3 ? ` · ${attempts} attempts` : ''}
        </Text>
      )}

      <PinPad
        length={PIN_LENGTH}
        value={pin}
        onKey={onKey}
        error={attempts > 0}
        shakeAnim={shakeAnim}
        disabled={checking}
      />

      {hasBiometrics && (
        <TouchableOpacity
          onPress={tryBiometric}
          style={{ marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons
            name={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print-outline'}
            size={22}
            color="#1A3C2B"
          />
          <Text style={{ color: '#1A3C2B', fontWeight: '600', fontSize: 14 }}>
            {Platform.OS === 'ios' ? 'Use Face ID' : 'Use Fingerprint'}
          </Text>
        </TouchableOpacity>
      )}

      {isTransaction && (
        <TouchableOpacity onPress={onCancel} style={{ marginTop: 20 }}>
          <Text style={{ color: '#6B7C74', fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── AuthGate ──────────────────────────────────────────────────────────────────

import { useWallet } from '../providers/WalletContext';

export function AuthGate() {
  const {
    isSetup, authVisible, authMode,
    onAuthSuccess, onAuthCancel, isInitialized,
  } = useAuth();
  const { isConnected, isReady } = useWallet();

  // Wait until both the wallet session and SecureStore check are done.
  // isReady = Magic session check complete; isInitialized = SecureStore check complete.
  if (!isReady || !isInitialized) return null;

  // Don't show the gate if the user is logged out of their wallet.
  if (!isConnected) return null;

  // Don't show if no auth is currently needed.
  if (!authVisible) return null;

  const isTransaction = authMode === 'transaction';

  // Full-screen for app unlock; modal sheet for transaction confirmation
  if (isTransaction) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onAuthCancel}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF6EE' }}>
          <UnlockScreen
            onSuccess={onAuthSuccess}
            onCancel={onAuthCancel}
            isTransaction
          />
        </SafeAreaView>
      </Modal>
    );
  }

  // App-open gate — full screen, no dismiss
  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF6EE' }}>
        {!isSetup
          ? <SetupScreen onDone={onAuthSuccess} />
          : <UnlockScreen onSuccess={onAuthSuccess} onCancel={onAuthCancel} isTransaction={false} />
        }
      </SafeAreaView>
    </Modal>
  );
}
