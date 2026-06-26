import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../providers/WalletContext';

function fmtAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }

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

export default function ProfileTab() {
  const { address, isConnected, disconnect, connect } = useWallet();
  const [notifEnabled, setNotifEnabled] = useState(false);

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
    'Sign out', 'You can sign back in anytime with the same social account.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: disconnect }],
  );

  if (!isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center gap-4 px-10">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
            <Ionicons name="person-outline" size={36} color="#1A3C2B" />
          </View>
          <Text className="text-charcoal text-xl font-black text-center">You're signed out</Text>
          <Text className="text-muted text-sm text-center leading-relaxed">
            Sign in with your social account to see your profile and manage settings.
          </Text>
          <TouchableOpacity className="bg-primary rounded-full px-8 py-3.5 mt-2" onPress={connect}>
            <Text className="text-white font-bold">Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View className="bg-primary px-5 pt-6 pb-14 items-center">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: '#D4A017' }}>
            <Ionicons name="person" size={38} color="#1A3C2B" />
          </View>
          <Text className="text-white text-sm font-mono mt-1 opacity-70">
            {address ? fmtAddr(address) : ''}
          </Text>
        </View>

        {/* Settings card */}
        <View className="mx-4 -mt-8 bg-white rounded-3xl overflow-hidden"
          style={{ shadowColor: '#1A3C2B', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>

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
              label="Sign out"
              labelColor="#C1440E"
              right={<Ionicons name="chevron-forward" size={16} color="#C1440E" />}
            />
          </TouchableOpacity>
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
    </SafeAreaView>
  );
}
