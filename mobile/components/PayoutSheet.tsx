import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TxStateView } from './TxStateView';
import { useClaim } from '../hooks/useClaim';
import { useQuote } from '../hooks/useQuote';
import { TOKEN_ADDRESSES } from '../constants/addresses';

const TOKENS = [
  { symbol: 'USDT', address: TOKEN_ADDRESSES.USDT, decimals: 6, icon: 'cash-outline' as const },
  { symbol: 'ETH',  address: '0x0000000000000000000000000000000000000000' as `0x${string}`, decimals: 18, icon: 'logo-bitcoin' as const },
  { symbol: 'WETH', address: TOKEN_ADDRESSES.WETH, decimals: 18, icon: 'cube-outline' as const },
] as const;

const SLIPPAGE_OPTIONS = [0.5, 1, 2];

type PayoutTarget =
  | { type: 'circle'; circleId: number; availableUSDT: bigint; label: string }
  | { type: 'vault';  vaultId: number;  availableUSDT: bigint; label: string };

interface PayoutSheetProps {
  target: PayoutTarget;
  visible: boolean;
  onClose: () => void;
}

function fmtUSDT(n: bigint) {
  return (Number(n) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayoutSheet({ target, visible, onClose }: PayoutSheetProps) {
  const [tokenIdx, setTokenIdx] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [showSlip, setShowSlip] = useState(false);
  const [recipient, setRecipient] = useState('');

  const { claim, txState, txHash, error, reset } = useClaim();

  const selectedToken = TOKENS[tokenIdx];
  const isUSDT = selectedToken.symbol === 'USDT';

  // Get live quote when swapping out of USDT
  const { amountOut: tokenOut, isLoading: quoting } = useQuote({
    tokenIn: TOKEN_ADDRESSES.USDT,
    tokenOut: selectedToken.address,
    amountIn: target.availableUSDT,
    fee: 3000,
    enabled: !isUSDT && target.availableUSDT > 0n,
  });

  const displayAmount  = isUSDT ? target.availableUSDT : tokenOut;
  const minGuaranteed  = displayAmount * BigInt(Math.round((1 - slippage / 100) * 10000)) / 10000n;
  const displayDecimals = selectedToken.decimals;

  function fmtOut(n: bigint) {
    return (Number(n) / 10 ** displayDecimals).toLocaleString('en-US', { maximumFractionDigits: 6 });
  }

  const handleClaim = async () => {
    const args = {
      tokenOut: selectedToken.address,
      amountOutMinimum: minGuaranteed,
      poolFee: 3000,
    } as const;

    if (target.type === 'circle') {
      await claim({ type: 'circle', circleId: target.circleId, ...args });
    } else {
      await claim({ type: 'vault', vaultId: target.vaultId, ...args });
    }
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-surface">
        {/* Drag handle */}
        <View className="w-9 h-1 rounded-full bg-border self-center mt-3 mb-2" />

        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-border bg-card">
          <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#6B7C74" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-charcoal font-bold text-base">Claim Payout</Text>
            <Text className="text-muted text-xs">{target.label}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSlip((v) => !v)} accessibilityLabel="Slippage settings">
            <Ionicons name="settings-outline" size={20} color="#6B7C74" />
          </TouchableOpacity>
        </View>

        {/* Slippage settings */}
        {showSlip && (
          <View className="flex-row items-center gap-2 px-4 py-2.5 bg-card border-b border-border">
            <Text className="text-muted text-sm flex-1">Slippage</Text>
            {SLIPPAGE_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                className={`px-3 py-1.5 rounded-lg border ${
                  slippage === s ? 'bg-primary border-primary' : 'bg-surface border-border'
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

        <ScrollView contentContainerClassName="p-4 gap-5">
          {txState !== 'idle' ? (
            <TxStateView
              txState={txState}
              txHash={txHash}
              error={error}
              successMessage="Payout claimed! 💰"
              onReset={handleClose}
            />
          ) : (
            <>
              {/* Available USDT */}
              <View className="bg-primary/5 border border-primary/15 rounded-2xl p-5 items-center">
                <Text className="text-muted text-xs uppercase tracking-widest mb-1">Available</Text>
                <Text className="text-primary text-3xl font-black">${fmtUSDT(target.availableUSDT)}</Text>
                <Text className="text-muted text-xs mt-1">USDT</Text>
              </View>

              {/* Token selector */}
              <View>
                <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Receive in
                </Text>
                <View className="gap-2">
                  {TOKENS.map((tk, i) => {
                    const isSelected = tokenIdx === i;
                    return (
                      <TouchableOpacity
                        key={tk.symbol}
                        className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        onPress={() => setTokenIdx(i)}
                        accessibilityLabel={`Select ${tk.symbol}`}
                      >
                        <View className={`w-9 h-9 rounded-full items-center justify-center ${isSelected ? 'bg-primary' : 'bg-surface'}`}>
                          <Ionicons name={tk.icon} size={18} color={isSelected ? 'white' : '#6B7C74'} />
                        </View>
                        <View className="flex-1">
                          <Text className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-charcoal'}`}>
                            {tk.symbol}
                          </Text>
                          <Text className="text-muted text-xs">
                            {tk.symbol === 'USDT' ? 'Direct transfer — no swap' : `Via Uniswap V3 · ${slippage}% slippage`}
                          </Text>
                        </View>
                        {isSelected && (
                          <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                            <Ionicons name="checkmark" size={12} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Swap preview */}
              {!isUSDT && (
                <View className="bg-card border border-border rounded-2xl p-4 gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-sm">You receive</Text>
                    <Text className="text-charcoal font-semibold text-sm">
                      {quoting ? '…' : `~${fmtOut(tokenOut)} ${selectedToken.symbol}`}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-xs">Min guaranteed</Text>
                    <Text className="text-muted text-xs">
                      {fmtOut(minGuaranteed)} {selectedToken.symbol}
                    </Text>
                  </View>
                  <View className="h-px bg-border my-1" />
                  <View className="flex-row justify-between">
                    <Text className="text-muted text-xs">Slippage tolerance</Text>
                    <Text className="text-muted text-xs">{slippage}%</Text>
                  </View>
                </View>
              )}

              {/* Receiving address (editable) */}
              <View>
                <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Receiving wallet
                </Text>
                <View className="flex-row items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
                  <Ionicons name="wallet-outline" size={16} color="#6B7C74" />
                  <TextInput
                    className="flex-1 text-charcoal text-sm font-mono"
                    placeholder="Your connected wallet"
                    placeholderTextColor="#8FA98C"
                    value={recipient}
                    onChangeText={setRecipient}
                    autoCapitalize="none"
                  />
                </View>
                <Text className="text-muted text-xs mt-1 px-1">
                  Leave blank to use your connected wallet
                </Text>
              </View>

              {/* Confirm button */}
              <TouchableOpacity
                className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
                onPress={handleClaim}
                accessibilityLabel="Confirm payout"
              >
                <Ionicons name="cash" size={20} color="white" />
                <Text className="text-white font-bold text-base">
                  Confirm Payout →
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
