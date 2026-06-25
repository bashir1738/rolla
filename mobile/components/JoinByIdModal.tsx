import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../constants/addresses';
import { AJO_CIRCLE_ABI } from '../constants/abis';

function fmtUSDC(n: bigint) {
  return (Number(n) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

const AJO = { address: CONTRACT_ADDRESSES.AJO_CIRCLE, abi: AJO_CIRCLE_ABI } as const;

export function JoinByIdModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [idInput, setIdInput] = useState('');
  const [circleId, setCircleId] = useState<number | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [joined, setJoined] = useState(false);

  const parsedId = circleId !== null ? circleId : -1;

  const { data: info, isLoading: infoLoading } = useReadContract({
    ...AJO,
    functionName: 'getCircleInfo',
    args: [BigInt(Math.max(0, parsedId))],
    query: { enabled: parsedId >= 0 },
  });

  const { data: members } = useReadContract({
    ...AJO,
    functionName: 'getMembers',
    args: [BigInt(Math.max(0, parsedId))],
    query: { enabled: parsedId >= 0 },
  });

  const { writeContract, data: txHash, isPending: signing } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  React.useEffect(() => {
    if (isSuccess) setJoined(true);
  }, [isSuccess]);

  const lookup = () => {
    const n = parseInt(idInput.trim(), 10);
    if (isNaN(n) || n < 0) {
      setLookupError('Enter a valid circle ID number');
      return;
    }
    setLookupError('');
    setJoined(false);
    setCircleId(n);
  };

  const circleInfo = info as any;
  const circleMembers = (members as string[]) ?? [];

  const hasCircle = !!circleInfo;
  const [name, maxMembers, contributionAmount, , , , , , status] = hasCircle
    ? circleInfo as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, number, boolean, number]
    : [null, null, null, null, null, null, null, null, null, null, null];

  const isRecruiting = Number(status) === 0;
  const isFull = hasCircle && circleMembers.length >= Number(maxMembers);

  const handleJoin = () => {
    if (circleId === null) return;
    writeContract({ ...AJO, functionName: 'joinCircle', args: [BigInt(circleId)] });
  };

  const handleClose = () => {
    setIdInput('');
    setCircleId(null);
    setLookupError('');
    setJoined(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-surface px-5 pt-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-charcoal text-xl font-black">Join a Circle</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={22} color="#6B7C74" />
          </TouchableOpacity>
        </View>

        {/* ID input */}
        <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
          Circle ID
        </Text>
        <View className="flex-row gap-2 mb-1">
          <TextInput
            className="flex-1 bg-card border rounded-xl px-4 py-3 text-charcoal text-base font-semibold"
            style={{ borderColor: lookupError ? '#EF4444' : '#D9E8E0' }}
            placeholder="Enter the Circle ID"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            value={idInput}
            onChangeText={(t) => { setIdInput(t); setLookupError(''); setCircleId(null); setJoined(false); }}
            returnKeyType="search"
            onSubmitEditing={lookup}
          />
          <TouchableOpacity
            className="bg-primary rounded-xl px-5 items-center justify-center"
            onPress={lookup}
            disabled={!idInput.trim() || infoLoading}
            style={{ opacity: !idInput.trim() ? 0.4 : 1 }}
          >
            {infoLoading
              ? <ActivityIndicator size="small" color="#D4A017" />
              : <Text className="text-white font-bold">Look up</Text>}
          </TouchableOpacity>
        </View>
        {lookupError ? (
          <Text className="text-red-500 text-xs mb-4">{lookupError}</Text>
        ) : (
          <Text className="text-muted text-xs mb-6">
            Ask the circle creator to share their Circle ID with you.
          </Text>
        )}

        {/* Circle preview */}
        {hasCircle && !infoLoading && (
          <View className="bg-card border border-border rounded-2xl p-5 mb-6">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1">
                <Text className="text-charcoal text-lg font-black">{name}</Text>
                <Text className="text-muted text-sm mt-0.5">
                  {circleMembers.length} / {Number(maxMembers)} members
                </Text>
              </View>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: isRecruiting && !isFull ? '#F0FDF4' : '#FFF7ED' }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: isRecruiting && !isFull ? '#16A34A' : '#EA580C' }}
                >
                  {isFull ? 'Full' : isRecruiting ? 'Open' : 'Active'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <View>
                <Text className="text-muted text-xs">Contribution</Text>
                <Text className="text-charcoal font-bold text-sm">
                  ${fmtUSDC(contributionAmount as bigint)} USDC
                </Text>
              </View>
              <View>
                <Text className="text-muted text-xs">Spots left</Text>
                <Text className="text-charcoal font-bold text-sm">
                  {Number(maxMembers) - circleMembers.length}
                </Text>
              </View>
            </View>

            {/* Slot bar */}
            <View className="flex-row gap-1 mt-4">
              {Array.from({ length: Number(maxMembers) }).map((_, i) => (
                <View
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{ backgroundColor: i < circleMembers.length ? '#1A3C2B' : '#EDE6D6' }}
                />
              ))}
            </View>
          </View>
        )}

        {/* Success */}
        {joined && (
          <View className="bg-green-50 border border-green-200 rounded-2xl p-4 items-center gap-2 mb-4">
            <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
            <Text className="text-green-800 font-bold">You've joined {name}!</Text>
            <Text className="text-green-700 text-sm text-center">
              Head back to your circles to see it.
            </Text>
          </View>
        )}

        {/* Join button */}
        {hasCircle && isRecruiting && !isFull && !joined && (
          <TouchableOpacity
            className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
            onPress={handleJoin}
            disabled={signing || confirming}
          >
            {signing || confirming ? (
              <>
                <ActivityIndicator color="#D4A017" />
                <Text className="text-white font-bold">
                  {signing ? 'Confirm in wallet…' : 'Joining…'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="people-outline" size={18} color="#D4A017" />
                <Text className="text-white font-bold text-base">Join Circle</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {hasCircle && (isFull || !isRecruiting) && !joined && (
          <View className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex-row items-center gap-3">
            <Ionicons name="information-circle-outline" size={20} color="#EA580C" />
            <Text className="text-orange-800 text-sm flex-1">
              {isFull ? 'This circle is full.' : 'This circle is no longer recruiting.'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
