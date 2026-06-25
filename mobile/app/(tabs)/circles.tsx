import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CircleCard } from '../../components/CircleCard';
import { CircleDetail } from '../../components/CircleDetail';
import { CreateCircleWizard } from '../../components/CreateCircleWizard';
import { ProfileButton } from '../../components/ProfileSidebar';
import { useProfileSidebar } from '../../contexts/ProfileSidebarContext';
import { useCircles, type CircleData } from '../../hooks/useCircles';
import { useCreateCircle } from '../../hooks/useCreateCircle';
import { JoinByIdModal } from '../../components/JoinByIdModal';
import { useWallet } from '../../providers/WalletContext';
import { useRefresh } from '../../hooks/useRefresh';


export default function CirclesTab() {
  const { isConnected } = useWallet();
  const { circles, isLoading } = useCircles();
  const { createCircle, txState, txHash, error, reset, isSuccess } = useCreateCircle();
  const { openSidebar } = useProfileSidebar();
  const { refreshing, refresh } = useRefresh();
  const [selected, setSelected] = useState<CircleData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [query, setQuery] = useState('');

  React.useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => { setShowCreate(false); reset(); }, 1800);
      return () => clearTimeout(t);
    }
  }, [isSuccess]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return circles;
    return circles.filter((c) => c.name.toLowerCase().includes(q));
  }, [circles, query]);

  const active     = filtered.filter((c) => c.status === 1);
  const recruiting = filtered.filter((c) => c.status === 0);
  const completed  = filtered.filter((c) => c.status === 2);

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top']}>
      {/* Header */}
      <View className="bg-primary px-5 pt-3 pb-6">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-white text-2xl font-semibold">Circles</Text>
            
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-white/15 px-4 py-2.5 rounded-full"
              onPress={() => setShowJoin(true)}
              accessibilityLabel="Join a circle"
            >
              <Ionicons name="enter-outline" size={16} color="#fff" />
              <Text className="text-white font-bold text-sm">Join</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-accent px-4 py-2.5 rounded-full"
              onPress={() => setShowCreate(true)}
              accessibilityLabel="Create new circle"
            >
              <Ionicons name="add" size={16} color="#1A3C2B" />
              <Text className="text-primary font-bold text-sm">Create</Text>
            </TouchableOpacity>
            <ProfileButton onPress={openSidebar} />
          </View>
        </View>
        {/* Search bar */}
        <View className="flex-row items-center gap-2 mt-4 bg-white/10 rounded-2xl px-3 py-2.5">
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search circles…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            className="flex-1 text-white text-sm"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-white/60 text-sm mt-3">
          {query
            ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"`
            : `${active.length} active · ${recruiting.length} recruiting · ${completed.length} completed`}
        </Text>
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
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pt-4 pb-8"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1A3C2B" colors={['#1A3C2B']} />
            }
          >
            {circles.length > 0 ? (
              <>
                {active.length > 0 && <SectionHeader icon="radio-button-on" label="Active" />}
                {active.map((c) => (
                  <CircleCard key={c.id} circle={c} onPress={() => setSelected(c)} />
                ))}

                {recruiting.length > 0 && <SectionHeader icon="person-add-outline" label="Recruiting" />}
                {recruiting.map((c) => (
                  <CircleCard key={c.id} circle={c} onPress={() => setSelected(c)} />
                ))}

                {completed.length > 0 && <SectionHeader icon="checkmark-circle-outline" label="Completed" />}
                {completed.map((c) => (
                  <CircleCard key={c.id} circle={c} onPress={() => setSelected(c)} />
                ))}
              </>
            ) : query ? (
              <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
                <Ionicons name="search-outline" size={48} color="#8FA98C" />
                <Text className="text-charcoal font-bold text-lg text-center">No results</Text>
                <Text className="text-muted text-sm text-center">
                  No circles match "{query}"
                </Text>
                <TouchableOpacity onPress={() => setQuery('')} className="mt-2">
                  <Text className="text-primary font-semibold text-sm">Clear search</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
                <Ionicons name="people-circle-outline" size={52} color="#8FA98C" />
                <Text className="text-charcoal font-bold text-lg text-center">No circles yet</Text>
                <Text className="text-muted text-sm text-center">
                  Create a savings circle and invite people you trust.
                </Text>
                <TouchableOpacity
                  className="mt-2 bg-primary px-7 py-3.5 rounded-full"
                  onPress={() => setShowCreate(true)}
                >
                  <Text className="text-white font-bold">Create your first circle</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {selected && (
        <CircleDetail circle={selected} visible={!!selected} onClose={() => setSelected(null)} />
      )}
      <JoinByIdModal visible={showJoin} onClose={() => setShowJoin(false)} />
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
    <View className="flex-row items-center gap-2 mb-2 mt-4 first:mt-0">
      <Ionicons name={icon} size={14} color="#6B7C74" />
      <Text className="text-muted text-xs font-bold uppercase tracking-wider">{label}</Text>
    </View>
  );
}
