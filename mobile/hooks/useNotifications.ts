import { useEffect } from 'react';
import Constants from 'expo-constants';

const TASK_NAME = 'rolla-background-check';
const IN_EXPO_GO = Constants.appOwnership === 'expo';
const INTERVAL_SECONDS = 15 * 60; // 15 minutes
let taskDefined = false;

// All native modules are loaded lazily via require() inside try/catch so that a
// missing/removed module (e.g. expo-notifications in Expo Go on SDK 53+) never
// throws at import time and crashes the root layout.

async function runChecks(Notifications: any) {
  const { readContract } = require('wagmi/actions');
  const { getAccount } = require('@wagmi/core');
  const { wagmiConfig } = require('../providers/WagmiProvider');
  const { CONTRACT_ADDRESSES } = require('../constants/addresses');
  const { AJO_CIRCLE_ABI } = require('../constants/abis');

  // Only check circles belonging to the connected wallet
  const { address } = getAccount(wagmiConfig);
  if (!address) return;

  const circleIds = await readContract(wagmiConfig, {
    address: CONTRACT_ADDRESSES.AJO_CIRCLE,
    abi: AJO_CIRCLE_ABI,
    functionName: 'getUserCircles',
    args: [address],
  }) as bigint[];

  if (!circleIds?.length) return;

  const now = Math.floor(Date.now() / 1000);

  for (const id of circleIds) {
    const info = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESSES.AJO_CIRCLE,
      abi: AJO_CIRCLE_ABI,
      functionName: 'getCircleInfo',
      args: [id],
    });

    const [name, , , , , , nextPayout, , status, payoutPending] = info as any[];
    if (Number(status) !== 1) continue; // only active circles

    const hoursUntil = (Number(nextPayout) - now) / 3600;
    if (hoursUntil > 0 && hoursUntil <= 24) {
      await sendNotification(Notifications, '⏰ Contribution due soon', `${name} closes in ${Math.round(hoursUntil)}h`);
    }
    if (payoutPending) {
      await sendNotification(Notifications, '🎉 Your payout is ready', `Claim your payout from ${name}`);
    }
  }
}

async function sendNotification(Notifications: any, title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

async function setup() {
  // These throw in Expo Go (SDK 53+) — caught by the caller.
  const Notifications = require('expo-notifications');
  const BackgroundFetch = require('expo-background-fetch');
  const TaskManager = require('expo-task-manager');

  // In Expo Go (SDK 53+) the native module is not bundled — bail cleanly.
  if (!Notifications?.setNotificationHandler) throw new Error('Native notification module unavailable — use a dev build');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (!taskDefined) {
    TaskManager.defineTask(TASK_NAME, async () => {
      try {
        await runChecks(Notifications);
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
    taskDefined = true;
  }

  const perm = await Notifications.requestPermissionsAsync();
  const granted = perm?.granted === true || perm?.status === 'granted';
  if (!granted) return;

  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!registered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: INTERVAL_SECONDS,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export function useNotifications() {
  useEffect(() => {
    if (IN_EXPO_GO) return;
    setup().catch(() => {
      if (__DEV__) console.info('[Rolla] Push + background tasks require a dev build — skipped in Expo Go.');
    });
  }, []);
}

// Fire a vault-matured notification on demand (best-effort; no-ops in Expo Go).
export async function notifyVaultMatured(vaultTier: string) {
  try {
    const Notifications = require('expo-notifications');
    const perm = await Notifications.requestPermissionsAsync();
    if (!(perm?.granted === true || perm?.status === 'granted')) return;
    await sendNotification(Notifications, '✅ Vault matured', `Your ${vaultTier} Vault is ready to claim`);
  } catch {
    // Unavailable in Expo Go — ignore.
  }
}
