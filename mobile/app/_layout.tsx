// Must be the very first import — crypto + WalletConnect polyfills for React
// Native, before any wagmi code evaluates.
import '../polyfills';
import '../global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyGlobalFont } from '../lib/applyFonts';
import { WagmiQueryProvider } from '../providers/WagmiProvider';
import { WalletProvider } from '../providers/WalletContext';
import { LoginSheet } from '../components/LoginSheet';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { ProfileSidebarProvider, useProfileSidebar } from '../contexts/ProfileSidebarContext';
import { useNotifications } from '../hooks/useNotifications';
import { magic } from '../lib/magicClient';

// Force Satoshi on all text app-wide (runs once at module load).
applyGlobalFont();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { initialRouteName: 'index' };

SplashScreen.preventAutoHideAsync();

function AppContent() {
  useNotifications();
  const { sidebarVisible, closeSidebar } = useProfileSidebar();
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <LoginSheet />
      <ProfileSidebar visible={sidebarVisible} onClose={closeSidebar} />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Black': require('../assets/fonts/Satoshi-Black.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <WagmiQueryProvider>
        <WalletProvider>
          <ProfileSidebarProvider>
            <AppContent />
          </ProfileSidebarProvider>
        </WalletProvider>
      </WagmiQueryProvider>
      <magic.Relayer />
    </SafeAreaProvider>
  );
}
