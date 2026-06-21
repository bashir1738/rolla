import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export const PIN_KEY = 'rolla_pin';
export const BIOMETRIC_KEY = 'rolla_biometric_enabled';
export const PIN_LENGTH = 4;

export type BiometricType = 'face' | 'finger' | null;

/** Manages the local PIN + biometric lock stored in SecureStore. */
export function usePin() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);

  const refresh = useCallback(async () => {
    try {
      const pin = await SecureStore.getItemAsync(PIN_KEY);
      setHasPin(!!pin);
      const bio = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(bio === 'true');
    } catch {
      setHasPin(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Detect available biometric hardware once.
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && enrolled) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          setBiometricType(
            types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
              ? 'face'
              : 'finger',
          );
        }
      } catch {}
    })();
  }, [refresh]);

  const verifyPin = useCallback(async (pin: string) => {
    try {
      const saved = await SecureStore.getItemAsync(PIN_KEY);
      return saved != null && saved === pin;
    } catch {
      return false;
    }
  }, []);

  const savePin = useCallback(async (pin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, pin);
    setHasPin(true);
  }, []);

  const clearPin = useCallback(async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    setHasPin(false);
    setBiometricEnabled(false);
  }, []);

  /** Runs the OS biometric prompt; on success stores the enabled flag. */
  const enableBiometric = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          biometricType === 'face' ? 'Enable Face ID for Rolla' : 'Enable Touch ID for Rolla',
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Not now',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
        setBiometricEnabled(true);
        return true;
      }
    } catch {}
    return false;
  }, [biometricType]);

  const disableBiometric = useCallback(async () => {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    setBiometricEnabled(false);
  }, []);

  return {
    hasPin,
    biometricEnabled,
    biometricType,
    biometricLabel: biometricType === 'face' ? 'Face ID' : 'Touch ID',
    refresh,
    verifyPin,
    savePin,
    clearPin,
    enableBiometric,
    disableBiometric,
  };
}
