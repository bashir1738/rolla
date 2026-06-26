import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, Share, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { isAddress } from 'viem';
function fmtAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
import type { CircleData } from '../hooks/useCircles';

function storageKey(circleId: number) {
  return `rolla_invites_${circleId}`;
}

async function loadInvites(circleId: number): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(circleId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveInvites(circleId: number, list: string[]) {
  await AsyncStorage.setItem(storageKey(circleId), JSON.stringify(list));
}

function InvitedRow({ addr, onRemove }: { addr: string; onRemove: () => void }) {
  return (
    <View className="flex-row items-center gap-3 py-2.5 border-b border-border">
      <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
        <Ionicons name="person-outline" size={15} color="#1A3C2B" />
      </View>
      <View className="flex-1">
        <Text className="text-charcoal text-sm font-semibold font-mono" numberOfLines={1}>
          {fmtAddr(addr)}
        </Text>
      </View>
      <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
        <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <Text className="text-amber-700 text-[10px] font-semibold">Pending</Text>
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle-outline" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  visible: boolean;
  circle: CircleData;
  onClose: () => void;
}

export function InviteModal({ visible, circle, onClose }: Props) {
  const [input, setInput]       = useState('');
  const [invites, setInvites]   = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    if (visible) loadInvites(circle.id).then(setInvites);
  }, [visible, circle.id]);

  const addInvite = useCallback(async () => {
    const addr = input.trim().toLowerCase();
    if (!isAddress(addr)) {
      setInputError('Enter a valid wallet address (0x…)');
      return;
    }
    if (circle.members.map((m) => m.toLowerCase()).includes(addr)) {
      setInputError('This address is already a member');
      return;
    }
    if (invites.map((i) => i.toLowerCase()).includes(addr)) {
      setInputError('Already in your invite list');
      return;
    }
    setInputError('');
    setLoading(true);
    const updated = [...invites, input.trim()];
    await saveInvites(circle.id, updated);
    setInvites(updated);
    setInput('');
    setLoading(false);
  }, [input, invites, circle.members, circle.id]);

  const removeInvite = useCallback(async (addr: string) => {
    const updated = invites.filter((i) => i.toLowerCase() !== addr.toLowerCase());
    await saveInvites(circle.id, updated);
    setInvites(updated);
  }, [invites, circle.id]);

  const shareInvite = async () => {
    try {
      await Share.share({
        message:
          `You've been invited to join my Rolla savings circle!\n\n` +
          `Circle: ${circle.name}\n` +
          `Contribution: $${(Number(circle.contributionAmount) / 1_000_000).toFixed(0)} USDC per round\n` +
          `Members: ${circle.members.length}/${circle.maxMembers}\n\n` +
          `Circle ID: ${circle.id}\n\n` +
          `Download the Rolla app here:\nhttps://rolla-lime.vercel.app/\n\n` +
          `Once installed, tap "Join" and enter the Circle ID above.`,
      });
    } catch {}
  };

  const spotsLeft = circle.maxMembers - circle.members.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-surface">
        <View className="w-9 h-1 rounded-full bg-border self-center mt-3 mb-1" />

        {/* Header */}
        <View className="px-5 py-4 border-b border-border flex-row items-center justify-between">
          <View>
            <Text className="text-charcoal text-lg font-black">Invite Members</Text>
            <Text className="text-muted text-sm mt-0.5">
              {circle.name} · {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#6B7C74" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-5 pt-5 pb-10" showsVerticalScrollIndicator={false}>

          {/* Share card */}
          <TouchableOpacity
            className="bg-primary rounded-2xl p-4 mb-6 flex-row items-center gap-3"
            onPress={shareInvite}
            accessibilityLabel="Share invite"
          >
            <View className="w-10 h-10 rounded-full bg-white/15 items-center justify-center">
              <Ionicons name="share-social-outline" size={20} color="#D4A017" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm">Share Invite Link</Text>
              <Text className="text-white/60 text-xs mt-0.5">
                Circle ID: {circle.id} · Share via WhatsApp, SMS, etc.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {/* Add by wallet address */}
          <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-3">
            Add by Wallet Address
          </Text>
          <View className="flex-row gap-2 mb-1">
            <TextInput
              className="flex-1 bg-card border rounded-xl px-4 py-3 text-charcoal text-sm font-mono"
              style={{ borderColor: inputError ? '#EF4444' : '#D9E8E0' }}
              placeholder="0x..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={(t) => { setInput(t); setInputError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={addInvite}
            />
            <TouchableOpacity
              className="bg-primary rounded-xl px-4 items-center justify-center"
              onPress={addInvite}
              disabled={!input.trim() || loading}
              style={{ opacity: !input.trim() ? 0.4 : 1 }}
            >
              {loading
                ? <ActivityIndicator size="small" color="#D4A017" />
                : <Ionicons name="add" size={22} color="#D4A017" />}
            </TouchableOpacity>
          </View>
          {inputError ? (
            <Text className="text-red-500 text-xs mb-3">{inputError}</Text>
          ) : (
            <Text className="text-muted text-xs mb-3">
              Paste their wallet address — they'll join using the Circle ID you share.
            </Text>
          )}

          {/* Invited list */}
          {invites.length > 0 && (
            <>
              <Text className="text-muted text-xs font-bold uppercase tracking-wider mt-4 mb-2">
                Invited ({invites.length})
              </Text>
              {invites.map((addr) => (
                <InvitedRow
                  key={addr}
                  addr={addr}
                  onRemove={() => removeInvite(addr)}
                />
              ))}
            </>
          )}

          {/* Existing members */}
          <Text className="text-muted text-xs font-bold uppercase tracking-wider mt-6 mb-2">
            Current Members ({circle.members.length})
          </Text>
          {circle.members.map((m, i) => (
            <View key={m} className="flex-row items-center gap-3 py-2 border-b border-border">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                <Text className="text-white text-xs font-bold">{i + 1}</Text>
              </View>
              <Text className="flex-1 text-charcoal text-sm font-mono" numberOfLines={1}>
                {fmtAddr(m)}
              </Text>
              {i === 0 && (
                <Text className="text-xs text-accent font-semibold">Creator</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
