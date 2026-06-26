import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '../providers/WagmiProvider';
import { useDisplayName } from '../hooks/useDisplayName';
import { useWallet } from '../providers/WalletContext';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { USERNAME_REGISTRY_ABI } from '../constants/abis';

export function ClaimNameButton() {
  const { address } = useWallet();
  const { localName, onChainName } = useDisplayName(address);
  const { writeContractAsync } = useWriteContract();

  const [claiming, setClaiming] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Don't show if no local name or already on-chain
  if (!localName || onChainName) return null;

  const handleClaim = async () => {
    if (!localName || !address) return;

    setClaiming(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.USERNAME_REGISTRY,
        abi: USERNAME_REGISTRY_ABI,
        functionName: 'claim',
        args: [localName.toLowerCase()],
      });

      // Wait for confirmation
      await waitForTransactionReceipt(wagmiConfig, { hash });

      setModalVisible(false);
      Alert.alert('Success!', `Your name "@${localName}" has been claimed on-chain!`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('NameTaken')) {
        Alert.alert('Name Taken', 'This name has already been claimed.');
      } else if (msg.includes('insufficient')) {
        Alert.alert('Insufficient Gas', 'You need more ETH to claim your name.');
      } else {
        Alert.alert('Error', `Failed to claim name: ${msg.slice(0, 100)}`);
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: '#D4A01720',
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <Ionicons name="alert-circle-outline" size={16} color="#D4A017" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#1A3C2B', fontSize: 12, fontWeight: '600' }}>
            Claim your name on-chain
          </Text>
          <Text style={{ color: '#6B7C74', fontSize: 11, marginTop: 2 }}>
            @{localName} · costs a bit of ETH gas
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#6B7C74" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#D4A01720', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="shield-checkmark" size={32} color="#D4A017" />
              </View>
              <Text style={{ color: '#1C1C1E', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
                Claim @{localName}?
              </Text>
            </View>

            <Text style={{ color: '#6B7C74', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              This will permanently register your name on the blockchain. Everyone in your circles will see it.
            </Text>

            <TouchableOpacity
              onPress={handleClaim}
              disabled={claiming}
              style={{
                backgroundColor: '#1A3C2B',
                borderRadius: 12,
                paddingVertical: 14,
                marginBottom: 10,
                alignItems: 'center',
              }}
            >
              {claiming ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Claim Name</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              disabled={claiming}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#6B7C74', fontWeight: '500', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
