import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Platform,
  TextInput, KeyboardAvoidingView,
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../providers/WalletContext';

export function LoginSheet() {
  const { loginVisible, closeLogin, loginWithEmail } = useWallet();
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const onSubmit = () => {
    if (!email.trim()) return;
    // Store email and close — Magic is called in onModalHide, AFTER the modal
    // finishes animating out. If we call Magic while the backdrop is still
    // animating, it intercepts all touches on the OTP WebView.
    setPendingEmail(email.trim());
    closeLogin();
  };

  const onClose = () => {
    setEmail('');
    setPendingEmail(null);
    closeLogin();
  };

  const onModalHide = () => {
    if (pendingEmail) {
      loginWithEmail(pendingEmail);
      setPendingEmail(null);
      setEmail('');
    }
  };

  return (
    <Modal
      isVisible={loginVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onModalHide={onModalHide}
      backdropOpacity={0.55}
      style={{ justifyContent: 'flex-end', margin: 0 }}
      useNativeDriver
      useNativeDriverForBackdrop
      avoidKeyboard
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="bg-surface rounded-t-3xl px-6 pt-3 pb-10">
          <View className="self-center w-10 h-1 rounded-full bg-charcoal/15 mb-6" />

          <View className="items-center mb-7">
            <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center mb-4">
              <Ionicons name="leaf" size={28} color="#D4A017" />
            </View>
            <Text className="text-charcoal text-2xl font-black text-center">Sign in to Rolla</Text>
            <Text className="text-muted text-sm text-center mt-2 leading-relaxed px-2">
              Enter your email and we'll send you a one-time code — no password needed.
            </Text>
          </View>

          <View className="gap-3">
            <TextInput
              className="text-charcoal text-base bg-white px-4 py-4 rounded-2xl"
              style={{ borderWidth: 1, borderColor: '#D9E8E0' }}
              placeholder="you@example.com"
              placeholderTextColor="#6B7C74"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={onSubmit}
            />

            <TouchableOpacity
              className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
              onPress={onSubmit}
              disabled={!email.trim()}
              style={{ opacity: !email.trim() ? 0.3 : 1 }}
            >
              <Ionicons name="mail" size={18} color="#D4A017" />
              <Text className="text-white text-base font-bold">Send Code</Text>
            </TouchableOpacity>

            <TouchableOpacity className="py-3 items-center" onPress={onClose}>
              <Text className="text-muted text-sm">Not now</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-muted/70 text-[11px] text-center mt-5 leading-relaxed">
            Secured by Magic. Your wallet is yours alone.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
