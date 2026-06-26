import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuth from 'expo-local-authentication';

const PIN_HASH_KEY  = 'rolla_pin_hash';
const SESSION_TTL   = 5 * 60 * 1000; // 5 minutes

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthMode = 'setup' | 'unlock' | 'transaction';

interface AuthContextValue {
  isAuthenticated: boolean;
  isSetup: boolean;
  hasBiometrics: boolean;
  isInitialized: boolean;
  authVisible: boolean;
  authMode: AuthMode;
  /** Call before any sensitive operation. Resolves true on success, false on cancel. */
  requireAuth: () => Promise<boolean>;
  /** First-time: save a new PIN. */
  setupPin: (pin: string) => Promise<void>;
  /** Called by AuthGate/AuthModal on success. */
  onAuthSuccess: () => void;
  /** Called by AuthGate/AuthModal on cancel/dismiss. */
  onAuthCancel: () => void;
  /** Verify the entered PIN — returns true if correct. */
  verifyPin: (pin: string) => Promise<boolean>;
  /** Trigger OS biometric prompt — returns true on success. */
  verifyBiometric: () => Promise<boolean>;
  /** Lock the session (e.g. user logs out of wallet). */
  lock: () => void;
  /** Clear PIN on logout — called when user disconnects wallet. */
  clearPin: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
export const useAuth = () => useContext(AuthContext);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('unlock');
  const [isInitialized, setIsInitialized] = useState(false);

  const sessionAt = useRef<number>(0);
  // Queue of pending Promise resolvers waiting for auth
  const pendingRef = useRef<((ok: boolean) => void)[]>([]);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      console.log('🔄 AuthProvider initializing...');
      try {
        const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
        const hasPIN = !!stored;
        console.log(`🔐 SecureStore PIN check: ${hasPIN ? '✅ PIN found' : '❌ No PIN stored'}`);
        setIsSetup(hasPIN);
        if (!hasPIN) {
          console.log('⚠️ User will need to set up PIN on next auth gate');
        }
      } catch (e: any) {
        console.error('❌ SecureStore read failed:', e?.message || e);
        setIsSetup(false);
      }

      try {
        const compatible = await LocalAuth.hasHardwareAsync();
        const enrolled   = await LocalAuth.isEnrolledAsync();
        const bioAvailable = compatible && enrolled;
        console.log(`👆 Biometric available: ${bioAvailable}`);
        setHasBiometrics(bioAvailable);
      } catch (e: any) {
        console.error('❌ Biometric check failed:', e?.message || e);
        setHasBiometrics(false);
      }

      // Mark as initialized only after all checks complete
      console.log('✅ AuthProvider initialized');
      setIsInitialized(true);
    })();
  }, []);

  // Lock when app goes to background
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        setIsAuthenticated(false);
        sessionAt.current = 0;
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const hashPin = (pin: string) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);

  const setupPin = useCallback(async (pin: string) => {
    try {
      const hash = await hashPin(pin);
      console.log('💾 Saving PIN hash to SecureStore...');
      await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
      console.log('✅ PIN saved successfully');
      setIsSetup(true);
    } catch (e) {
      console.error('❌ Failed to save PIN:', e);
      throw e;
    }
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
    if (!stored) return false;
    const hash = await hashPin(pin);
    return hash === stored;
  }, []);

  const verifyBiometric = useCallback(async () => {
    try {
      const compatible = await LocalAuth.hasHardwareAsync();
      const enrolled   = await LocalAuth.isEnrolledAsync();
      if (!compatible || !enrolled) return false;

      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  }, []);

  // ── requireAuth ─────────────────────────────────────────────────────────────

  const requireAuth = useCallback((): Promise<boolean> => {
    // Session still fresh — skip modal for subsequent actions in same session
    if (isAuthenticated && Date.now() - sessionAt.current < SESSION_TTL) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      pendingRef.current.push(resolve);
      setAuthMode('transaction');
      setAuthVisible(true);
    });
  }, [isAuthenticated]);

  const onAuthSuccess = useCallback(() => {
    setIsAuthenticated(true);
    sessionAt.current = Date.now();
    setAuthVisible(false);
    // Resolve all pending promises
    pendingRef.current.forEach((resolve) => resolve(true));
    pendingRef.current = [];
  }, []);

  const onAuthCancel = useCallback(() => {
    setAuthVisible(false);
    pendingRef.current.forEach((resolve) => resolve(false));
    pendingRef.current = [];
  }, []);

  const lock = useCallback(() => {
    setIsAuthenticated(false);
    sessionAt.current = 0;
  }, []);

  const clearPin = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    } catch (e) {
      if (__DEV__) console.warn('Failed to delete PIN:', e);
    }
    // Clear state regardless of deletion success
    setIsSetup(false);
    setIsAuthenticated(false);
    sessionAt.current = 0;
    setAuthVisible(false);
    pendingRef.current = [];
  }, []);

  // ── App-open auth gate ───────────────────────────────────────────────────────
  // Only fires AFTER isInitialized — ensures SecureStore check completed first.
  // Without this guard, isSetup is still false during initialization and the
  // gate would show SetupScreen even when a PIN already exists in storage.
  useEffect(() => {
    if (!isInitialized) return;

    if (isSetup && !isAuthenticated) {
      setAuthMode('unlock');
      setAuthVisible(true);
    }
    if (!isSetup) {
      setAuthVisible(false);
      pendingRef.current = [];
    }
  }, [isSetup, isAuthenticated, isInitialized]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isSetup, hasBiometrics, isInitialized,
      authVisible, authMode,
      requireAuth, setupPin,
      onAuthSuccess, onAuthCancel,
      verifyPin, verifyBiometric, lock, clearPin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
