import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignMessage } from 'wagmi';
import { useWallet } from '../../providers/WalletContext';
import { useDisplayName } from '../../hooks/useDisplayName';

type Stage = 'loading' | 'input' | 'saving' | 'done';

export default function NameSetup() {
  const router = useRouter();
  const { address } = useWallet();
  const { name: existingName, loaded, save } = useDisplayName(address);
  const { signMessageAsync } = useSignMessage();

  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('loading');
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
    const name = input.trim();
    if (!name) return;
    Keyboard.dismiss();
    syncStage('saving');

    let sig: string | undefined;
    try {
      sig = await signMessageAsync({ message: `Rolla name: ${name}` });
    } catch {}

    await save(name, sig);
    syncStage('done');
    setTimeout(() => router.replace('/(tabs)'), 1200);
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
                Saving your name
              </Text>
              <Text className="text-muted text-sm text-center">
                Securing it to your account — this is free.
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

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
