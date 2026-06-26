import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TxStateView } from './TxStateView';
import type { TxState } from '../providers/WalletContext';

const FREQUENCIES = [
  { label: '10 minutes', value: 10 * 60    },
  { label: 'Weekly',     value: 7 * 86400  },
  { label: 'Bi-weekly', value: 14 * 86400 },
  { label: 'Monthly',   value: 30 * 86400 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  txState?: TxState;
  txHash?: string | null;
  txError?: string | null;
  onCreate: (p: {
    name: string;
    maxMembers: number;
    contributionUSDC: number;
    frequencySeconds: number;
  }) => Promise<void>;
}

export function CreateCircleWizard({ visible, onClose, txState, txHash, txError, onCreate }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [freqIdx, setFreqIdx] = useState(0);
  const [members] = useState(2);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setStep(0); setName(''); setAmount('');
    setFreqIdx(0); setCreating(false);
  };
  const close = () => { reset(); onClose(); };

  const canNext = [name.trim().length > 0, parseFloat(amount) > 0, true][step];

  const create = async () => {
    setCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        maxMembers: members,
        contributionUSDC: parseFloat(amount),
        frequencySeconds: FREQUENCIES[freqIdx].value,
      });
    } catch {
      setCreating(false);
    }
  };

  const freq = FREQUENCIES[freqIdx];
  const pot = parseFloat(amount || '0') * members;
  const isTxActive = txState && txState !== 'idle';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View className="flex-1 bg-surface">

        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-5 pb-3 border-b border-border bg-card">
          <TouchableOpacity onPress={close}>
            <Text className="text-muted">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-charcoal font-bold">Create Circle</Text>
          <View style={{ width: 55 }} />
        </View>

        {isTxActive ? (
          /* Transaction state overlay */
          <ScrollView contentContainerClassName="flex-1 px-4 py-8">
            <TxStateView
              txState={txState}
              txHash={txHash}
              error={txError}
              successMessage="Circle created — others can now join."
              onReset={close}
            />
          </ScrollView>
        ) : (
          <>
            {/* Step indicator */}
            <View className="flex-row gap-1.5 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`}
                />
              ))}
            </View>
            <Text className="text-muted text-xs px-4 mb-3">Step {step + 1} of 3</Text>

            <ScrollView contentContainerClassName="px-4 pb-8">

              {/* Step 1 — Name */}
              {step === 0 && (
                <View className="gap-5">
                  <Text className="text-charcoal text-xl font-black">Name your circle</Text>
                  <TextInput
                    className="bg-card border border-border rounded-2xl px-4 py-4 text-charcoal text-base"
                    placeholder="e.g. Lagos Tech Builders"
                    placeholderTextColor="#6B7C74"
                    value={name}
                    onChangeText={setName}
                    maxLength={40}
                    autoFocus
                  />
                  <View className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex-row gap-2">
                    <Ionicons name="information-circle-outline" size={16} color="#1A3C2B" />
                    <Text className="text-muted text-xs flex-1 leading-5">
                      Choose a name your group will recognise — you can't change it after creation.
                    </Text>
                  </View>
                </View>
              )}

              {/* Step 2 — Amount & frequency */}
              {step === 1 && (
                <View className="gap-5">
                  <Text className="text-charcoal text-xl font-black">Contribution & schedule</Text>

                  <View>
                    <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
                      Amount per round (USDC)
                    </Text>
                    <TextInput
                      className="bg-card border border-border rounded-2xl px-4 py-4 text-charcoal text-2xl font-black"
                      placeholder="100"
                      placeholderTextColor="#6B7C74"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                    />
                  </View>

                  <View>
                    <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-2">
                      Frequency
                    </Text>
                    {FREQUENCIES.map((f, i) => (
                      <TouchableOpacity
                        key={f.value}
                        className={`flex-row items-center gap-3 px-4 py-3.5 rounded-xl border mb-2 ${
                          freqIdx === i ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        onPress={() => setFreqIdx(i)}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={freqIdx === i ? '#1A3C2B' : '#6B7C74'}
                        />
                        <Text className={`font-semibold flex-1 ${freqIdx === i ? 'text-primary' : 'text-charcoal'}`}>
                          {f.label}
                        </Text>
                        {freqIdx === i && (
                          <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                            <Ionicons name="checkmark" size={12} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Step 3 — Members & summary */}
              {step === 2 && (
                <View className="gap-5">
                  <Text className="text-charcoal text-xl font-black">Circle size</Text>

                  <View className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
                    <Text className="text-charcoal text-3xl font-black text-center mb-2">
                      2 Members
                    </Text>
                    <Text className="text-muted text-sm text-center">
                      Circles are limited to 2 members for tighter group dynamics.
                    </Text>
                  </View>

                  <View className="bg-card border border-border rounded-2xl p-4 gap-1">
                    {[
                      { label: 'Circle name',   value: name },
                      { label: 'Members',       value: `${members}` },
                      { label: 'Per round',     value: `${amount || 0} USDC` },
                      { label: 'Frequency',     value: freq.label },
                      { label: 'Pot per round', value: `${pot.toFixed(0)} USDC`, bold: true },
                      { label: 'Total rounds',  value: `${members}` },
                    ].map((row) => (
                      <View
                        key={row.label}
                        className="flex-row justify-between py-2.5 border-b border-border/50 last:border-0"
                      >
                        <Text className="text-muted text-sm">{row.label}</Text>
                        <Text
                          className={`text-sm ${
                            row.bold ? 'text-primary font-black text-base' : 'text-charcoal font-semibold'
                          }`}
                        >
                          {row.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

            </ScrollView>

            {/* Navigation */}
            <View className="px-4 pb-8 pt-3 border-t border-border gap-2">
              {step < 2 ? (
                <TouchableOpacity
                  className={`rounded-full py-4 items-center flex-row justify-center gap-2 ${
                    canNext ? 'bg-primary' : 'bg-primary/30'
                  }`}
                  onPress={() => canNext && setStep((s) => s + 1)}
                  disabled={!canNext}
                >
                  <Text className={`font-bold text-base ${canNext ? 'text-white' : 'text-white/50'}`}>
                    Next
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={canNext ? 'white' : 'rgba(255,255,255,0.5)'}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className={`rounded-full py-4 items-center flex-row justify-center gap-2 ${
                    creating ? 'bg-primary/50' : 'bg-primary'
                  }`}
                  onPress={create}
                  disabled={creating}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                  <Text className="text-white font-bold text-base">
                    {creating ? 'Waiting for wallet…' : 'Create Circle'}
                  </Text>
                </TouchableOpacity>
              )}
              {step > 0 && !creating && (
                <TouchableOpacity className="py-3 items-center" onPress={() => setStep((s) => s - 1)}>
                  <Text className="text-muted text-sm">Back</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

      </View>
    </Modal>
  );
}
