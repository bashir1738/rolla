import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CircleCard } from '../../components/CircleCard';
import { CircleDetail } from '../../components/CircleDetail';
import { CreateCircleWizard } from '../../components/CreateCircleWizard';
import { useCircles, type CircleData } from '../../hooks/useCircles';
import { useCreateCircle } from '../../hooks/useCreateCircle';
import { useWallet } from '../../providers/WalletContext';

export default function CirclesTab() {
  const { isConnected } = useWallet();
  const { circles, isLoading } = useCircles();
  const { createCircle, txState, txHash, error, reset, isSuccess } = useCreateCircle();
  const [selected, setSelected] = useState<CircleData | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  React.useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => { setShowCreate(false); reset(); }, 1800);
      return () => clearTimeout(t);
    }
  }, [isSuccess]);

  const active = circles.filter((c) => c.status === 1);
  const recruiting = circles.filter((c) => c.status === 0);
  const completed = circles.filter((c) => c.status === 2);

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      {/* Header */}
      <View className="bg-primary px-5 pt-3 pb-6">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-white text-2xl font-black">Circles</Text>
            <Text className="text-white/60 text-sm mt-1">
              {active.length} active · {recruiting.length} recruiting
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-accent px-4 py-2.5 rounded-full"
            onPress={() => setShowCreate(true)}
            accessibilityLabel="Create new circle"
          >
            <Ionicons name="add" size={16} color="#1A3C2B" />
            <Text className="text-primary font-bold text-sm">Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 bg-surface rounded-t-3xl overflow-hidden">
      {!isConnected ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="wallet-outline" size={52} color="#8FA98C" />
          <Text className="text-charcoal font-bold text-lg">Connect your wallet</Text>
          <Text className="text-muted text-sm text-center">
            Connect to view and join savings circles
          </Text>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1A3C2B" size="large" />
        </View>
      ) : circles.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="people-circle-outline" size={52} color="#8FA98C" />
          <Text className="text-charcoal font-bold text-lg">No circles yet</Text>
          <Text className="text-muted text-sm text-center">
            Create your first circle or join one from a friend
          </Text>
          <TouchableOpacity
            className="mt-2 bg-primary px-7 py-3.5 rounded-full"
            onPress={() => setShowCreate(true)}
          >
            <Text className="text-white font-bold">Create your first circle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pt-4 pb-8"
          showsVerticalScrollIndicator={false}
        >
          {active.length > 0 && (
            <SectionHeader icon="radio-button-on" label="Active" />
          )}
          {active.map((c) => (
            <CircleCard key={c.id} circle={c} onPress={() => setSelected(c)} />
          ))}

          {recruiting.length > 0 && (
            <SectionHeader icon="person-add-outline" label="Recruiting" />
          )}
          {recruiting.map((c) => (
            <CircleCard key={c.id} circle={c} onPress={() => setSelected(c)} />
          ))}

          {completed.length > 0 && (
            <SectionHeader icon="checkmark-circle-outline" label="Completed" />
          )}
          {completed.map((c) => (
            <CircleCard key={c.id} circle={c} onPress={() => setSelected(c)} />
          ))}
        </ScrollView>
      )}
      </View>

      {selected && (
        <CircleDetail circle={selected} visible={!!selected} onClose={() => setSelected(null)} />
      )}
      <CreateCircleWizard
        visible={showCreate}
        onClose={() => { reset(); setShowCreate(false); }}
        txState={txState}
        txHash={txHash}
        txError={error}
        onCreate={async (p) => { await createCircle(p); }}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-2 mt-2">
      <Ionicons name={icon} size={14} color="#6B7C74" />
      <Text className="text-muted text-xs font-bold uppercase tracking-wider">{label}</Text>
    </View>
  );
}
