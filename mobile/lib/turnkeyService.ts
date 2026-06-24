/**
 * Turnkey backend service layer.
 *
 * All Turnkey key operations live on YOUR backend (Node.js / serverless).
 * The backend holds a Turnkey API key and manages one sub-organization per
 * user. The client never touches a private key — it only receives:
 *   • the wallet address (for display + reads)
 *   • a short-lived session token (for authorizing backend-signing requests)
 *
 * Backend endpoints you need to implement:
 *
 *   POST /api/auth/social
 *     body:     { provider: 'google' | 'apple', idToken: string }
 *     response: { address: string, userId: string, sessionToken: string }
 *     logic:    verify token → find/create Turnkey sub-org → create wallet
 *
 *   POST /api/auth/email/start
 *     body:     { email: string }
 *     response: { ok: true }
 *     logic:    send OTP to email, store pending challenge in session store
 *
 *   POST /api/auth/email/verify
 *     body:     { email: string, otp: string }
 *     response: { address: string, userId: string, sessionToken: string }
 *     logic:    verify OTP → find/create Turnkey sub-org + wallet → return session
 *
 *   POST /api/tx/sign
 *     header:   Authorization: Bearer <sessionToken>
 *     body:     { serializedTx: string }          ← RLP-encoded unsigned tx
 *     response: { signedTx: string }              ← RLP-encoded signed tx
 *
 *   POST /api/msg/sign
 *     header:   Authorization: Bearer <sessionToken>
 *     body:     { message: string }               ← hex-encoded message bytes
 *     response: { signature: string }             ← 0x... EIP-191 signature
 *
 *   GET /api/auth/me
 *     header:   Authorization: Bearer <sessionToken>
 *     response: { address: string, userId: string } | 401
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

// ─── Session type ─────────────────────────────────────────────────────────────

export interface TurnkeySession {
  address: `0x${string}`;
  userId: string;
  sessionToken: string;
}

// ─── SecureStore persistence ──────────────────────────────────────────────────

const SESSION_KEY = 'rolla_turnkey_session_v1';

export async function saveSession(session: TurnkeySession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<TurnkeySession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TurnkeySession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function requestEmailOtp(email: string): Promise<void> {
  assertApiBase();
  const res = await fetch(`${API_BASE}/api/auth/email/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  await assertOk(res, 'email/start');
}

export async function verifyEmailOtp(email: string, otp: string): Promise<TurnkeySession> {
  assertApiBase();
  const res = await fetch(`${API_BASE}/api/auth/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  await assertOk(res, 'email/verify');
  const data = await res.json();
  return {
    address: data.address as `0x${string}`,
    userId: data.userId,
    sessionToken: data.sessionToken,
  };
}

export async function authenticateWithSocial(
  provider: 'google' | 'apple',
  idToken: string,
): Promise<TurnkeySession> {
  assertApiBase();
  const res = await fetch(`${API_BASE}/api/auth/social`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, idToken }),
  });
  await assertOk(res, 'Social auth');
  const data = await res.json();
  return {
    address: data.address as `0x${string}`,
    userId: data.userId,
    sessionToken: data.sessionToken,
  };
}

export async function verifySession(sessionToken: string): Promise<boolean> {
  if (!API_BASE) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Signing ──────────────────────────────────────────────────────────────────

export async function signSerializedTx(
  sessionToken: string,
  serializedTx: string,
): Promise<`0x${string}`> {
  assertApiBase();
  const res = await fetch(`${API_BASE}/api/tx/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ serializedTx }),
  });
  await assertOk(res, 'tx/sign');
  const { signedTx } = await res.json();
  return signedTx as `0x${string}`;
}

export async function signMessage(
  sessionToken: string,
  messageHex: string,
): Promise<`0x${string}`> {
  assertApiBase();
  const res = await fetch(`${API_BASE}/api/msg/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ message: messageHex }),
  });
  await assertOk(res, 'msg/sign');
  const { signature } = await res.json();
  return signature as `0x${string}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertApiBase() {
  if (!API_BASE) throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to your .env.local.');
}

async function assertOk(res: Response, label: string) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${label} failed (${res.status}): ${text}`);
  }
}
