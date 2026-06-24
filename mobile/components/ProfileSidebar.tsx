import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Animated, TouchableOpacity, Dimensions,
  TouchableWithoutFeedback, ScrollView, Switch, Alert,
  TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSignMessage } from 'wagmi';
import { useWallet } from '../providers/WalletContext';
import { useDisplayName, fmtAddr } from '../hooks/useDisplayName';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.86;

type EditStage = 'idle' | 'signing' | 'done';

function SidebarRow({
  icon, iconBg, iconColor = '#1A3C2B', label, labelColor = '#1C1C1E', right,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string; iconColor?: string; label: string; labelColor?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
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
    let sig: string | undefined;
    try { sig = await signMessageAsync({ message: `Rolla name: ${name}` }); } catch {}
    await save(name, sig);
    setStage('done');
    setTimeout(onDone, 700);
  };

  if (stage === 'signing') {
    return (
      <View style={styles.editorCenter}>
        <ActivityIndicator color="#1A3C2B" />
        <Text style={styles.editorTitle}>Saving your name…</Text>
        <Text style={styles.editorSub}>If your wallet asks, tap approve — it's free</Text>
      </View>
    );
  }
  if (stage === 'done') {
    return (
      <View style={[styles.editorCenter, { paddingVertical: 20 }]}>
        <Ionicons name="checkmark-circle" size={28} color="#4ADE80" />
        <Text style={[styles.editorTitle, { color: '#1A3C2B' }]}>Name saved!</Text>
      </View>
    );
  }
  return (
    <View style={styles.editorWrap}>
      <View style={styles.editorInput}>
        <Ionicons name="person-outline" size={16} color="#6B7C74" />
        <TextInput
          style={styles.editorText}
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
      <View style={styles.editorActions}>
        <TouchableOpacity
          style={[styles.editorSave, { opacity: !input.trim() ? 0.4 : 1 }]}
          onPress={handleSave}
          disabled={!input.trim()}
        >
          <Text style={styles.editorSaveText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editorCancel} onPress={onDone}>
          <Text style={styles.editorCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSidebar({ visible, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const { address, isConnected, disconnect, connect } = useWallet();
  const { display, name, save, clear } = useDisplayName(address);
  const [editingName, setEditingName] = useState(false);
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

  useEffect(() => {
    if (visible) {
      // mount first, then animate in
      setMounted(true);
      slideAnim.setValue(SIDEBAR_WIDTH);
      overlayAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayAnim, { toValue: 0.5, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      // animate out, then unmount
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SIDEBAR_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

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
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { onClose(); setTimeout(disconnect, 300); } },
    ],
  );

  const confirmClear = () => Alert.alert(
    'Remove name', `Remove "${name}" from your profile?`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: clear }],
  );

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dimmed overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sidebar panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#1A3C2B" />
              </View>
              <View>
                <Text style={styles.displayName} numberOfLines={1}>{display}</Text>
                {address && (
                  <Text style={styles.addrText} numberOfLines={1}>{fmtAddr(address)}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#6B7C74" />
            </TouchableOpacity>
          </View>

          {!isConnected ? (
            <View style={styles.signedOut}>
              <View style={styles.signedOutIcon}>
                <Ionicons name="person-outline" size={32} color="#1A3C2B" />
              </View>
              <Text style={styles.signedOutTitle}>You're signed out</Text>
              <Text style={styles.signedOutSub}>Sign in to manage your profile and settings.</Text>
              <TouchableOpacity style={styles.signInBtn} onPress={connect}>
                <Text style={styles.signInText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              <Text style={styles.sectionLabel}>Profile</Text>
              <View style={styles.card}>
                {editingName ? (
                  <NameEditor currentName={name} save={save} onDone={() => setEditingName(false)} />
                ) : (
                  <TouchableOpacity onPress={() => setEditingName(true)}>
                    <SidebarRow
                      icon="pencil-outline"
                      iconBg="rgba(26,60,43,0.08)"
                      label={name ? 'Change name' : 'Set a name'}
                      right={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.rowMeta} numberOfLines={1}>{name ?? 'Not set'}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#6B7C74" />
                        </View>
                      }
                    />
                  </TouchableOpacity>
                )}

                {name && !editingName && (
                  <TouchableOpacity onPress={confirmClear}>
                    <SidebarRow
                      icon="trash-outline" iconBg="rgba(193,68,14,0.08)" iconColor="#C1440E"
                      label="Remove name" labelColor="#C1440E"
                      right={<Ionicons name="chevron-forward" size={14} color="#C1440E" />}
                    />
                  </TouchableOpacity>
                )}

                <SidebarRow
                  icon="notifications-outline" iconBg="rgba(212,160,23,0.12)" iconColor="#D4A017"
                  label="Push Notifications"
                  right={
                    <Switch value={notifEnabled} onValueChange={toggleNotifications}
                      trackColor={{ false: '#D9E8E0', true: '#D4A017' }} thumbColor="#FFF" />
                  }
                />

                <TouchableOpacity onPress={confirmDisconnect}>
                  <SidebarRow
                    icon="log-out-outline" iconBg="rgba(193,68,14,0.10)" iconColor="#C1440E"
                    label="Sign out" labelColor="#C1440E"
                    right={<Ionicons name="chevron-forward" size={16} color="#C1440E" />}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Network</Text>
              <View style={[styles.card, { paddingHorizontal: 20, paddingVertical: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' }} />
                  <Text style={{ color: '#1C1C1E', fontSize: 14, fontWeight: '600' }}>Sepolia Testnet</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Animated.View>

    </View>
  );
}

export function ProfileButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.profileBtn}
      accessibilityLabel="Open profile"
    >
      <Ionicons name="person" size={18} color="#1A3C2B" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 }, elevation: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#EDE6D6',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#D4A017', alignItems: 'center', justifyContent: 'center',
  },
  displayName: { color: '#1C1C1E', fontSize: 16, fontWeight: '800' },
  addrText: { color: '#6B7C74', fontSize: 11, fontFamily: 'monospace', marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0EBE0', alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    color: '#6B7C74', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 8, marginHorizontal: 20,
  },
  card: {
    marginHorizontal: 16, backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDE6D6',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#EDE6D6',
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  rowMeta: { color: '#6B7C74', fontSize: 12 },
  editorCenter: {
    paddingHorizontal: 20, paddingVertical: 24,
    borderBottomWidth: 1, borderBottomColor: '#EDE6D6',
    alignItems: 'center', gap: 8,
  },
  editorTitle: { color: '#1C1C1E', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  editorSub: { color: '#6B7C74', fontSize: 12, textAlign: 'center' },
  editorWrap: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EDE6D6' },
  editorInput: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#D9E8E0',
    backgroundColor: '#FAF6EE', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
  },
  editorText: { flex: 1, color: '#1C1C1E', fontSize: 14, fontWeight: '500' },
  editorActions: { flexDirection: 'row', gap: 8 },
  editorSave: {
    flex: 1, backgroundColor: '#1A3C2B', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  editorSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  editorCancel: {
    paddingHorizontal: 20, borderWidth: 1, borderColor: '#D9E8E0',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  editorCancelText: { color: '#6B7C74', fontSize: 14, fontWeight: '600' },
  signedOut: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  signedOutIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(26,60,43,0.08)', alignItems: 'center', justifyContent: 'center' },
  signedOutTitle: { color: '#1C1C1E', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  signedOutSub: { color: '#6B7C74', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  signInBtn: { backgroundColor: '#1A3C2B', borderRadius: 100, paddingHorizontal: 32, paddingVertical: 14, marginTop: 4 },
  signInText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  profileBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#D4A017', alignItems: 'center', justifyContent: 'center',
  },
});
