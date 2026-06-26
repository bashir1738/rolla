import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, isAddress } from 'viem';
import { TOKEN_ADDRESSES } from '../constants/addresses';

type SendToken = 'ETH' | 'USDC';

const TOKENS: { symbol: SendToken; label: string; decimals: number; bg: string }[] = [
  { symbol: 'ETH',  label: 'Ξ', decimals: 18, bg: '#627EEA' },
  { symbol: 'USDC', label: '$', decimals: 6,  bg: '#2775CA' },
];

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'to',     type: 'address' as const },
      { name: 'amount', type: 'uint256' as const },
    ],
    outputs: [{ name: '', type: 'bool' as const }],
  },
] as const;

function tokenAddress(symbol: SendToken): `0x${string}` | undefined {
  if (symbol === 'USDC') return TOKEN_ADDRESSES.USDC;
  return undefined;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SendSheet({ visible, onClose }: Props) {
  const [token, setToken] = useState<SendToken>('ETH');
  const [to, setTo]       = useState('');
  const [amount, setAmount] = useState('');

  const {
    sendTransaction, data: ethHash,
    isPending: ethPending, reset: ethReset,
  } = useSendTransaction();

  const {
    writeContract, data: erc20Hash,
    isPending: erc20Pending, reset: erc20Reset,
  } = useWriteContract();

  const txHash = ethHash ?? erc20Hash;
  const isPending = ethPending || erc20Pending;

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const toValid     = isAddress(to);
  const amountValid = !!amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
  const canSend     = toValid && amountValid && !isPending && !isConfirming;

  const resetAll = () => {
    ethReset(); erc20Reset();
    setTo(''); setAmount('');
    setToken('ETH');
  };

  const handleClose = () => { resetAll(); onClose(); };

  const handleSend = async () => {
    if (!canSend) return;
    const addr = to.trim() as `0x${string}`;
    const def = TOKENS.find((t) => t.symbol === token)!;

    if (token === 'ETH') {
      sendTransaction({ to: addr, value: parseEther(amount) });
    } else {
      writeContract({
        address: tokenAddress(token)!,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [addr, parseUnits(amount, def.decimals)],
      });
    }
  };

  // Auto-close 2 s after success
  useEffect(() => {
    if (!isSuccess) return;
    const t = setTimeout(() => { resetAll(); onClose(); }, 2000);
    return () => clearTimeout(t);
  }, [isSuccess]);

  const showSpinner = isPending || isConfirming;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FAF6EE' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: '#EDE6D6', backgroundColor: '#fff',
        }}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={{ color: '#6B7C74', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: '#1C1C1E', fontSize: 17, fontWeight: '700' }}>Send</Text>
          <View style={{ width: 52 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* Success */}
          {isSuccess && (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#4ADE8020', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={40} color="#4ADE80" />
              </View>
              <Text style={{ color: '#1C1C1E', fontSize: 18, fontWeight: '800' }}>Sent!</Text>
              <Text style={{ color: '#6B7C74', fontSize: 13, textAlign: 'center' }}>
                Your transaction was confirmed on Sepolia.
              </Text>
            </View>
          )}

          {/* Sending spinner */}
          {showSpinner && !isSuccess && (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
              <ActivityIndicator size="large" color="#1A3C2B" />
              <Text style={{ color: '#1C1C1E', fontSize: 15, fontWeight: '600' }}>
                {isPending ? 'Waiting for signature…' : 'Confirming on-chain…'}
              </Text>
              <Text style={{ color: '#6B7C74', fontSize: 13 }}>
                {isConfirming ? 'This takes ~15 seconds' : 'Approve in your wallet'}
              </Text>
            </View>
          )}

          {/* Form — hidden while processing */}
          {!showSpinner && !isSuccess && (
            <>
              {/* Token picker */}
              <View>
                <Text style={label}>Token</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {TOKENS.map((t) => (
                    <TouchableOpacity
                      key={t.symbol}
                      onPress={() => { setToken(t.symbol); setAmount(''); }}
                      style={[
                        tokenBtn,
                        token === t.symbol && { borderColor: '#1A3C2B', backgroundColor: 'rgba(26,60,43,0.06)' },
                      ]}
                    >
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{t.label}</Text>
                      </View>
                      <Text style={{ color: token === t.symbol ? '#1A3C2B' : '#6B7C74', fontWeight: '700', fontSize: 13 }}>
                        {t.symbol}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Recipient */}
              <View>
                <Text style={label}>To address</Text>
                <View style={[inputWrap, to && !toValid && { borderColor: '#C1440E' }]}>
                  <Ionicons name="wallet-outline" size={16} color="#6B7C74" />
                  <TextInput
                    style={inputText}
                    placeholder="0x…"
                    placeholderTextColor="#6B7C74"
                    value={to}
                    onChangeText={setTo}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {toValid && <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />}
                </View>
                {to && !toValid && (
                  <Text style={{ color: '#C1440E', fontSize: 11, marginTop: 4 }}>Invalid address</Text>
                )}
              </View>

              {/* Amount */}
              <View>
                <Text style={label}>Amount ({token})</Text>
                <View style={inputWrap}>
                  <TextInput
                    style={[inputText, { flex: 1, fontSize: 20, fontWeight: '700' }]}
                    placeholder="0.00"
                    placeholderTextColor="#6B7C74"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: '#6B7C74', fontWeight: '600', fontSize: 13 }}>{token}</Text>
                </View>
              </View>

              {/* Send button */}
              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                style={{
                  backgroundColor: canSend ? '#1A3C2B' : 'rgba(26,60,43,0.25)',
                  borderRadius: 100, paddingVertical: 16,
                  alignItems: 'center', flexDirection: 'row',
                  justifyContent: 'center', gap: 8, marginTop: 8,
                }}
              >
                <Ionicons name="arrow-up-circle" size={20} color={canSend ? '#D4A017' : 'rgba(255,255,255,0.4)'} />
                <Text style={{ color: canSend ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 16 }}>
                  Send {amount && amountValid ? `${amount} ${token}` : ''}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Local styles (plain objects, no StyleSheet needed) ────────────────────────

const label: object = { color: '#6B7C74', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 };
const inputWrap: object = { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#D9E8E0', paddingHorizontal: 14, paddingVertical: 14 };
const inputText: object = { color: '#1C1C1E', fontSize: 15, fontWeight: '500' };
const tokenBtn: object = { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#EDE6D6', backgroundColor: '#fff' };
