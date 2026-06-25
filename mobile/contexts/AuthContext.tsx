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

  const sessionAt = useRef<number>(0);
  // Queue of pending Promise resolvers waiting for auth
  const pendingRef = useRef<((ok: boolean) => void)[]>([]);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
      setIsSetup(!!stored);

      const compatible = await LocalAuth.hasHardwareAsync();
      const enrolled   = await LocalAuth.isEnrolledAsync();
      setHasBiometrics(compatible && enrolled);
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
    const hash = await hashPin(pin);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    setIsSetup(true);
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

  // ── App-open auth gate ───────────────────────────────────────────────────────
  // Show whenever PIN is set AND user is not authenticated.
  // Fires on mount (initial check) and whenever isAuthenticated flips to false
  // (e.g. app comes back from background via the AppState handler above).
  useEffect(() => {
    if (isSetup && !isAuthenticated && !authVisible) {
      setAuthMode('unlock');
      setAuthVisible(true);
    }
  }, [isSetup, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isSetup, hasBiometrics,
      authVisible, authMode,
      requireAuth, setupPin,
      onAuthSuccess, onAuthCancel,
      verifyPin, verifyBiometric, lock,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
