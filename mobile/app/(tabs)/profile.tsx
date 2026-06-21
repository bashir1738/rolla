import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, Alert,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSignMessage } from 'wagmi';
import { useWallet } from '../../providers/WalletContext';
import { useDisplayName, fmtAddr } from '../../hooks/useDisplayName';
import { usePin } from '../../hooks/usePin';
import { ChangePinModal } from '../../components/ChangePinModal';

type EditStage = 'idle' | 'signing' | 'done';

function SettingRow({
  icon, iconBg, iconColor = '#1A3C2B', label, labelColor = '#1C1C1E', right,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string; iconColor?: string; label: string; labelColor?: string;
  right: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center px-5 py-4 border-b border-[#EDE6D6]">
      <View className="w-9 h-9 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: iconBg }}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text className="flex-1 text-sm font-semibold" style={{ color: labelColor }}>{label}</Text>
      {right}
    </View>
  );
}

function NameEditor({ currentName, save, onDone }: {
  currentName: string | null;
  save: (name: string, sig?: string) => Promise<void>;
  onDone: () => void;
}) {
  const { signMessageAsync } = useSignMessage();
  const [input, setInput] = useState(currentName ?? '');
  const [stage, setStage] = useState<EditStage>('idle');

  const handleSave = async () => {
    const name = input.trim();
    if (!name) { onDone(); return; }

    setStage('signing');

    // Try signing — optional, never blocks the save
    let sig: string | undefined;
    try {
      sig = await signMessageAsync({ message: `Rolla name: ${name}` });
    } catch {
      // Rejected or unavailable — save without signature
    }

    await save(name, sig);
    setStage('done');
    setTimeout(onDone, 700);
  };

  if (stage === 'signing') {
    return (
      <View className="px-5 py-6 border-b border-[#EDE6D6] items-center gap-3">
        <ActivityIndicator color="#1A3C2B" />
        <Text className="text-charcoal text-sm font-semibold text-center">Saving your name…</Text>
        <Text className="text-muted text-xs text-center">If your wallet asks, tap approve — it's free</Text>
      </View>
    );
  }

  if (stage === 'done') {
    return (
      <View className="px-5 py-5 border-b border-[#EDE6D6] items-center gap-2">
        <Ionicons name="checkmark-circle" size={28} color="#4ADE80" />
        <Text className="text-primary font-bold text-sm">Name saved!</Text>
      </View>
    );
  }

  return (
    <View className="px-5 py-4 border-b border-[#EDE6D6]">
      <View className="flex-row items-center gap-3 rounded-xl border border-[#D9E8E0] bg-surface px-4 py-3 mb-3">
        <Ionicons name="person-outline" size={16} color="#6B7C74" />
        <TextInput
          className="flex-1 text-charcoal text-sm font-medium"
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
      </View>
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="flex-1 bg-primary rounded-xl py-3 items-center"
          onPress={handleSave}
          disabled={!input.trim()}
          style={{ opacity: !input.trim() ? 0.4 : 1 }}
        >
          <Text className="text-white text-sm font-bold">Save</Text>
        </TouchableOpacity>
        <TouchableOpacity className="px-5 border border-[#D9E8E0] rounded-xl py-3 items-center" onPress={onDone}>
          <Text className="text-muted text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileTab() {
  const { address, isConnected, disconnect, connect } = useWallet();
  const { display, name, save, clear } = useDisplayName(address);
  const {
    hasPin, biometricEnabled, biometricType, biometricLabel,
    enableBiometric, disableBiometric,
  } = usePin();
  const [editingName, setEditingName] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);

  const toggleBiometric = async (value: boolean) => {
    if (value) await enableBiometric();
    else await disableBiometric();
  };

  useEffect(() => {
    (async () => {
      try {
        const N = require('expo-notifications');
        const perm = await N.getPermissionsAsync();
        setNotifEnabled(perm?.granted === true || perm?.status === 'granted');
      } catch {}
    })();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    if (!value) { setNotifEnabled(false); return; }
    try {
      const N = require('expo-notifications');
      const perm = await N.requestPermissionsAsync();
      const granted = perm?.granted === true || perm?.status === 'granted';
      setNotifEnabled(granted);
      if (!granted) Alert.alert('Permission required', 'Enable notifications in your device Settings.');
    } catch {
      Alert.alert('Unavailable', 'Push notifications require a development build.');
    }
  };

  const confirmDisconnect = () => Alert.alert(
    'Disconnect wallet', 'Are you sure?',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: disconnect }],
  );

  const confirmClear = () => Alert.alert(
    'Remove name', `Remove "${name}" from your profile?`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: clear }],
  );

  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center gap-4 px-10">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
            <Ionicons name="person-outline" size={36} color="#1A3C2B" />
          </View>
          <Text className="text-charcoal text-xl font-black text-center">No wallet connected</Text>
          <Text className="text-muted text-sm text-center leading-relaxed">
            Connect your wallet to see your profile and manage settings.
          </Text>
          <TouchableOpacity className="bg-primary rounded-full px-8 py-3.5 mt-2" onPress={connect}>
            <Text className="text-white font-bold">Connect Wallet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar style="light" />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View className="bg-primary px-5 pt-6 pb-14 items-center">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: '#D4A017' }}>
            <Ionicons name="person" size={38} color="#1A3C2B" />
          </View>
          <Text className="text-white text-xl font-black tracking-tight">{display}</Text>
          {name && address && (
            <Text className="text-white/50 text-xs mt-1 font-mono">{fmtAddr(address)}</Text>
          )}
        </View>

        {/* Settings card */}
        <View className="mx-4 -mt-8 bg-white rounded-3xl overflow-hidden"
          style={{ shadowColor: '#1A3C2B', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>

          {editingName ? (
            <NameEditor currentName={name} save={save} onDone={() => setEditingName(false)} />
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <SettingRow
                icon="pencil-outline"
                iconBg="rgba(26,60,43,0.08)"
                label={name ? 'Change name' : 'Set a name'}
                right={
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-muted text-xs" numberOfLines={1}>{name ?? 'Not set'}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#6B7C74" />
                  </View>
                }
              />
            </TouchableOpacity>
          )}

          {name && !editingName && (
            <TouchableOpacity onPress={confirmClear}>
              <SettingRow
                icon="trash-outline"
                iconBg="rgba(193,68,14,0.08)"
                iconColor="#C1440E"
                label="Remove name"
                labelColor="#C1440E"
                right={<Ionicons name="chevron-forward" size={14} color="#C1440E" />}
              />
            </TouchableOpacity>
          )}

          <SettingRow
            icon="notifications-outline"
            iconBg="rgba(212,160,23,0.12)"
            iconColor="#D4A017"
            label="Push Notifications"
            right={
              <Switch
                value={notifEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#D9E8E0', true: '#D4A017' }}
                thumbColor="#FFFFFF"
              />
            }
          />

          <TouchableOpacity onPress={confirmDisconnect}>
            <SettingRow
              icon="log-out-outline"
              iconBg="rgba(193,68,14,0.10)"
              iconColor="#C1440E"
              label="Disconnect Wallet"
              labelColor="#C1440E"
              right={<Ionicons name="chevron-forward" size={16} color="#C1440E" />}
            />
          </TouchableOpacity>
        </View>

        {/* Security */}
        <Text className="text-muted text-xs uppercase tracking-widest mt-6 mb-2 px-6">Security</Text>
        <View className="mx-4 bg-white rounded-3xl overflow-hidden"
          style={{ shadowColor: '#1A3C2B', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>

          <TouchableOpacity onPress={() => setShowChangePin(true)}>
            <SettingRow
              icon="lock-closed-outline"
              iconBg="rgba(26,60,43,0.08)"
              label={hasPin ? 'Change PIN' : 'Set up a PIN'}
              right={
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-muted text-xs">{hasPin ? '••••' : 'Not set'}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#6B7C74" />
                </View>
              }
            />
          </TouchableOpacity>

          {biometricType && (
            <SettingRow
              icon={biometricType === 'face' ? 'scan-outline' : 'finger-print-outline'}
              iconBg="rgba(212,160,23,0.12)"
              iconColor="#D4A017"
              label={biometricLabel}
              right={
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#D9E8E0', true: '#D4A017' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          )}
        </View>

        {/* Network */}
        <View className="mx-4 mt-4 bg-white rounded-3xl px-5 py-4"
          style={{ shadowColor: '#1A3C2B', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <Text className="text-muted text-xs uppercase tracking-widest mb-3">Network</Text>
          <View className="flex-row items-center gap-2.5">
            <View className="w-2 h-2 rounded-full bg-green-400" />
            <Text className="text-charcoal text-sm font-semibold">Sepolia Testnet</Text>
          </View>
        </View>

      </ScrollView>

      <ChangePinModal
        visible={showChangePin}
        hasPin={!!hasPin}
        onClose={() => setShowChangePin(false)}
      />
    </SafeAreaView>
  );
}
