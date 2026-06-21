import React, { useState, useRef, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PinPad } from './PinPad';
import { usePin, PIN_LENGTH } from '../hooks/usePin';

type Stage = 'verify' | 'create' | 'confirm' | 'done';

export function ChangePinModal({
  visible, hasPin, onClose,
}: {
  visible: boolean;
  hasPin: boolean;
  onClose: () => void;
}) {
  const { verifyPin, savePin } = usePin();

  const [stage, setStage] = useState<Stage>(hasPin ? 'verify' : 'create');
  const [entry, setEntry] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Stable refs so the keypad handler never reads stale state on fast taps.
  const stageRef = useRef<Stage>(hasPin ? 'verify' : 'create');
  const newPinRef = useRef('');
  const busyRef = useRef(false);
  const setStageSynced = (s: Stage) => { stageRef.current = s; setStage(s); };

  const reset = () => {
    const initial: Stage = hasPin ? 'verify' : 'create';
    stageRef.current = initial;
    newPinRef.current = '';
    busyRef.current = false;
    setStage(initial); setEntry(''); setNewPin(''); setError(false);
  };

  const close = () => { reset(); onClose(); };

  const shake = () => {
    setError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start(() => setError(false));
  };

  const handleKey = useCallback((key: string) => {
    if (busyRef.current) return;

    if (key === '⌫') {
      setEntry((e) => e.slice(0, -1));
      return;
    }

    setEntry((e) => {
      if (e.length >= PIN_LENGTH) return e;
      const next = e + key;
      if (next.length === PIN_LENGTH) {
        busyRef.current = true;
        setTimeout(() => onComplete(next), 60);
      }
      return next;
    });
  }, []);

  const onComplete = async (value: string) => {
    const stage = stageRef.current;

    if (stage === 'verify') {
      const ok = await verifyPin(value);
      if (ok) {
        setEntry('');
        setStageSynced('create');
      } else {
        shake();
        setEntry('');
      }
      busyRef.current = false;
      return;
    }

    if (stage === 'create') {
      newPinRef.current = value;
      setNewPin(value);
      setEntry('');
      setStageSynced('confirm');
      busyRef.current = false;
      return;
    }

    if (stage === 'confirm') {
      if (value === newPinRef.current) {
        await savePin(value);
        setStageSynced('done');
        setTimeout(close, 1100);
      } else {
        shake();
        setEntry('');
        busyRef.current = false;
      }
    }
  };

  const titles: Record<Stage, { title: string; sub: string }> = {
    verify:  { title: 'Enter current PIN', sub: 'Confirm it’s you' },
    create:  { title: hasPin ? 'New PIN' : 'Create a PIN', sub: `${PIN_LENGTH}-digit PIN to secure your account` },
    confirm: { title: 'Confirm new PIN', sub: 'Enter it once more' },
    done:    { title: 'PIN updated', sub: 'Your new PIN is saved' },
  };
  const t = titles[stage];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-4 pb-3">
          <TouchableOpacity onPress={close}>
            <Text className="text-muted text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-charcoal font-bold">Change PIN</Text>
          <View style={{ width: 55 }} />
        </View>

        <View className="flex-1 px-6 justify-center items-center">
          {stage === 'done' ? (
            <View className="items-center gap-4">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0' }}
              >
                <Ionicons name="checkmark" size={36} color="#16A34A" />
              </View>
              <Text className="text-charcoal font-black text-2xl text-center">{t.title}</Text>
              <Text className="text-muted text-base text-center">{t.sub}</Text>
            </View>
          ) : (
            <>
              <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-7">
                <Ionicons name="lock-closed-outline" size={34} color="#D4A017" />
              </View>
              <Text className="text-charcoal text-[26px] font-black text-center leading-[32px] mb-1">
                {t.title}
              </Text>
              <Text className="text-muted text-sm text-center mb-10">{t.sub}</Text>

              <PinPad
                length={PIN_LENGTH}
                value={entry}
                onKey={handleKey}
                error={error}
                shakeAnim={shakeAnim}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
