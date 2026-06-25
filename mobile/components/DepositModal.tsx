import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VAULT_TIERS, type VaultTier } from '../hooks/useVaults';
import { useDeposit } from '../hooks/useDeposit';
import { useQuote } from '../hooks/useQuote';
import { TxStateView } from './TxStateView';
import { TOKEN_ADDRESSES } from '../constants/addresses';

const TOKENS = [
  { symbol: 'USDC', address: TOKEN_ADDRESSES.USDC, decimals: 6 },
  { symbol: 'ETH',  address: '0x0000000000000000000000000000000000000000' as `0x${string}`, decimals: 18 },
];

const SLIPPAGE = [0.5, 1, 2];

function fmtUSDC(n: bigint) {
  return (Number(n) / 1_000_000).toFixed(2);
}

function projEarnings(principal: number, aprBps: number, days: number) {
  return ((principal * aprBps * days) / (365 * 10_000)).toFixed(2);
}

export function DepositModal({ tier, visible, onClose }: {
  tier: VaultTier; visible: boolean; onClose: () => void;
}) {
  const t = VAULT_TIERS[tier];
  const { deposit, txState, txHash, error, reset } = useDeposit();
  const [tokenIdx, setTokenIdx] = useState(0);
  const [rawAmt, setRawAmt] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSlip, setShowSlip] = useState(false);

  const token = TOKENS[tokenIdx];
  const amountIn = rawAmt ? BigInt(Math.floor(parseFloat(rawAmt) * 10 ** token.decimals)) : 0n;
  const { amountOut: usdcOut, isLoading: quoting } = useQuote({
    tokenIn: token.address, tokenOut: TOKEN_ADDRESSES.USDC,
    amountIn, fee: 3000, enabled: amountIn > 0n && token.symbol !== 'USDC',
  });

  const displayUSDC = token.symbol === 'USDC' ? amountIn : usdcOut;
  const minUSDC = displayUSDC * BigInt(Math.round((1 - slippage / 100) * 10000)) / 10000n;
  const principal = Number(displayUSDC) / 1_000_000;
  const meetsMin = principal >= t.minUSDC;

  const handleClose = () => { reset(); setRawAmt(''); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-5 pb-3 border-b border-border bg-card">
          <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
            <Text className="text-muted text-base">Cancel</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <Ionicons name={t.icon as any} size={20} color="#1A3C2B" />
            <Text className="text-charcoal font-bold text-lg">{tier} Vault</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSlip((v) => !v)} accessibilityLabel="Slippage">
            <Ionicons name="settings-outline" size={20} color="#6B7C74" />
          </TouchableOpacity>
        </View>

        {/* Slippage settings */}
        {showSlip && (
          <View className="flex-row items-center gap-2 px-4 py-2.5 bg-surface border-b border-border">
            <Text className="text-muted text-sm flex-1">Slippage</Text>
            {SLIPPAGE.map((s) => (
              <TouchableOpacity
                key={s}
                className={`px-3 py-1.5 rounded-lg border ${
                  slippage === s ? 'bg-primary border-primary' : 'bg-card border-border'
                }`}
                onPress={() => setSlippage(s)}
              >
                <Text className={`text-xs font-bold ${slippage === s ? 'text-white' : 'text-charcoal'}`}>
                  {s}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView contentContainerClassName="p-4 gap-4">
          {txState !== 'idle' ? (
            <TxStateView txState={txState} txHash={txHash} error={error}
              successMessage={`${tier} Vault created — earning ${(t.aprBps / 100).toFixed(1)}% APR`}
              onReset={handleClose} />
          ) : (
            <>
              {/* Token selector */}
              <View>
                <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
                  You deposit
                </Text>
                <View className="flex-row gap-2">
                  {TOKENS.map((tk, i) => (
                    <TouchableOpacity
                      key={tk.symbol}
                      className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl border ${
                        tokenIdx === i ? 'bg-accent/10 border-accent' : 'bg-card border-border'
                      }`}
                      onPress={() => { setTokenIdx(i); setRawAmt(''); }}
                    >
                      <Text className={`font-bold text-sm ${tokenIdx === i ? 'text-accent' : 'text-muted'}`}>
                        {tk.symbol}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount input */}
              <View className="bg-card border border-border rounded-2xl px-4 py-4">
                <TextInput
                  className="text-charcoal text-2xl "
                  placeholder={`Min ${t.minUSDC} USDC`}
                  placeholderTextColor="#6B7C74"
                  value={rawAmt}
                  onChangeText={setRawAmt}
                  keyboardType="numeric"
                />
              </View>

              {/* Quick fill */}
              <View className="flex-row gap-2">
                {[1, 2, 5].map((m) => (
                  <TouchableOpacity
                    key={m}
                    className="flex-1 bg-card border border-border rounded-xl py-2.5 items-center"
                    onPress={() => setRawAmt(String(t.minUSDC * m))}
                  >
                    <Text className="text-charcoal font-semibold text-sm">
                      {m === 1 ? 'Min' : `${m}×`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Swap quote */}
              {amountIn > 0n && token.symbol !== 'USDC' && (
                <View className="bg-primary/5 border border-primary/15 rounded-xl p-4 gap-1.5">
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-sm">You deposit</Text>
                    <Text className="text-charcoal font-semibold text-sm">{rawAmt} {token.symbol}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-sm">Estimated receive</Text>
                    <Text className="text-charcoal font-semibold text-sm">
                      {quoting ? '…' : `~${fmtUSDC(usdcOut)} USDC`}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-xs">Min guaranteed ({slippage}%)</Text>
                    <Text className="text-muted text-xs">{fmtUSDC(minUSDC)} USDC</Text>
                  </View>
                </View>
              )}

              {/* Lock warning */}
              {t.lockDays > 0 && (
                <View className="flex-row gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <Text className="flex-1 text-charcoal text-sm">
                    Funds locked for <Text className="font-bold">{t.lockDays} days</Text>.
                    Withdrawals not possible before maturity.
                  </Text>
                </View>
              )}

              {/* Earnings projection */}
              {principal > 0 && (
                <View className="bg-card border border-border rounded-xl p-4">
                  <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-3">
                    Projected Earnings ({(t.aprBps / 100).toFixed(1)}% APR)
                  </Text>
                  {([30, t.lockDays || 365] as const).map((days) => (
                    <View key={days} className="flex-row justify-between py-1.5">
                      <Text className="text-muted text-sm">{days} days</Text>
                      <Text className={`font-bold text-sm ${days === t.lockDays ? 'text-primary text-base' : 'text-charcoal'}`}>
                        +${projEarnings(principal, t.aprBps, days)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                className={`rounded-full py-4 items-center flex-row justify-center gap-2 ${
                  meetsMin ? 'bg-primary' : 'bg-primary/30'
                }`}
                onPress={() => deposit({
                  tier: t.tier, tokenIn: token.address, amountIn, amountOutMinimum: minUSDC, poolFee: 3000,
                })}
                disabled={!meetsMin}
                accessibilityLabel="Sign and send deposit"
              >
                <Ionicons name="wallet" size={18} color={meetsMin ? 'white' : 'rgba(255,255,255,0.5)'} />
                <Text className={`font-bold text-base ${meetsMin ? 'text-white' : 'text-white/50'}`}>
                  {!meetsMin ? `Min ${t.minUSDC} USDC` : 'Sign & Send →'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
