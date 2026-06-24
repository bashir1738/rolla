import React, { useState } from 'react';
import { TouchableOpacity, Text, View, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../providers/WalletContext';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, connect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (isConnected && address) {
    const handleCopy = () => {
      Share.share({ message: address }).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };

    return (
      <TouchableOpacity
        className="flex-row items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full border border-white/20"
        onPress={handleCopy}
        accessibilityLabel="Copy wallet address"
      >
        <Ionicons
          name={copied ? 'checkmark-circle' : 'copy-outline'}
          size={13}
          color={copied ? '#4ADE80' : 'rgba(255,255,255,0.7)'}
        />
        <Text className="text-white text-xs font-semibold">
          {copied ? 'Copied!' : shortAddr(address)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className="flex-row items-center gap-1.5 border border-accent px-3 py-1.5 rounded-full"
      onPress={connect}
      accessibilityLabel="Sign in"
    >
      <Ionicons name="log-in-outline" size={14} color="#D4A017" />
      <Text className="text-accent text-xs font-semibold">Sign in</Text>
    </TouchableOpacity>
  );
}
