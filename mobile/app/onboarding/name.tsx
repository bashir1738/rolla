import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../providers/WalletContext';
import { useDisplayName } from '../../hooks/useDisplayName';

type Stage = 'loading' | 'input' | 'saving' | 'done';

export default function NameSetup() {
  const router = useRouter();
  const { address } = useWallet();
  const { name: existingName, loaded, saveLocal } = useDisplayName(address);

  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState('');
  const stageRef = useRef<Stage>('loading');
  const syncStage = (s: Stage) => { stageRef.current = s; setStage(s); };

  useEffect(() => {
    if (!loaded) return;
    if (stageRef.current !== 'loading') return;
    if (existingName) {
      router.replace('/(tabs)');
    } else {
      syncStage('input');
    }
  }, [loaded, existingName]);

  const handleSave = async () => {
    const name = input.trim().toLowerCase();
    if (!name || !address) return;
    Keyboard.dismiss();
    syncStage('saving');
    setError('');

    try {
      await saveLocal(name);

      syncStage('done');
      // Go to PIN setup after name is saved
      setTimeout(() => router.replace('/onboarding/pin'), 1200);
    } catch (e: any) {
      console.error('Name save error:', e);
      const msg = e?.message || String(e);
      setError(`Error: ${msg.slice(0, 80)}`);
      syncStage('input');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={stage === 'input' ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
      >
        <View className="flex-1 px-6 justify-center">

          {stage === 'loading' && (
            <View className="items-center">
              <ActivityIndicator color="#1A3C2B" />
            </View>
          )}

          {stage === 'saving' && (
            <View className="items-center gap-4">
              <ActivityIndicator size="large" color="#1A3C2B" />
              <Text className="text-charcoal font-semibold text-lg text-center">
                Setting up your profile
              </Text>
              <Text className="text-muted text-sm text-center">
                Your name will be saved and ready to use.
              </Text>
            </View>
          )}

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

          {stage === 'input' && (
            <View>
              <Text className="text-charcoal text-[30px] font-black leading-[36px] mb-2">
                What should we{'\n'}call you?
              </Text>
              <Text className="text-muted text-base mb-8 leading-relaxed">
                Your Rolla name — make it memorable. You can claim it on-chain anytime later.
              </Text>

              <TextInput
                className="text-charcoal text-base font-medium bg-white px-4 py-4 rounded-2xl mb-4"
                style={{ borderWidth: 1, borderColor: error ? '#EF4444' : '#D9E8E0' }}
                placeholderTextColor="#6B7C74"
                placeholder="yourname"
                value={input}
                onChangeText={(text) => { setInput(text); setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoFocus
              />

              {error && (
                <Text className="text-red-600 text-sm mb-4 font-medium">{error}</Text>
              )}

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

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
