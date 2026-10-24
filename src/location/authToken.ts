/**
 * Shared auth-token storage for the UI (`ConvexAuthProvider`) and for code that
 * runs outside React (the background location task, push registration).
 *
 * @convex-dev/auth stores its tokens under `${baseKey}_${namespace}` where
 * namespace = the Convex URL with every non-[a-zA-Z0-9] character removed
 * (see `useNamespacedStorage` in @convex-dev/auth/dist/react/client.js), e.g.
 *   __convexAuthJWT_http1270013211
 *   __convexAuthRefreshToken_http1270013211
 * The storage adapter then maps that key through `secureStoreKey` before
 * touching SecureStore. Both the UI adapter and this module MUST use the same
 * function — import `secureAuthStorage` (preferred) or `secureStoreKey`.
 */
import { ConvexHttpClient } from "convex/browser";
import * as SecureStore from "expo-secure-store";

import { api } from "../../convex/_generated/api";

export const JWT_STORAGE_KEY = "__convexAuthJWT";
export const REFRESH_TOKEN_STORAGE_KEY = "__convexAuthRefreshToken";

/** SecureStore keys only allow [A-Za-z0-9._-]; every other char becomes "_". */
export function secureStoreKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

/**
 * iOS: the background task usually runs while the phone is locked in a pocket.
 * The default keychain class (WHEN_UNLOCKED) is unreadable then, so every item
 * the background task reads must be written with AFTER_FIRST_UNLOCK.
 */
export const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/**
 * Storage adapter for `<ConvexAuthProvider storage={secureAuthStorage}>`.
 * Uses `secureStoreKey` + AFTER_FIRST_UNLOCK so the background task can read
 * the JWT with the screen locked.
 */
export const secureAuthStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(secureStoreKey(key), SECURE_STORE_OPTIONS),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(secureStoreKey(key), value, SECURE_STORE_OPTIONS),
  removeItem: (key: string) => SecureStore.deleteItemAsync(secureStoreKey(key), SECURE_STORE_OPTIONS),
};

export function convexUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_CONVEX_URL;
  return url ? url : null;
}

/** Same namespacing as @convex-dev/auth's `useNamespacedStorage` (namespace = Convex URL). */
export function convexAuthStorageKey(baseKey: string, url: string): string {
  return `${baseKey}_${url.replace(/[^a-zA-Z0-9]/g, "")}`;
}

async function readStored(baseKey: string, url: string): Promise<string | null> {
  try {
    return await secureAuthStorage.getItem(convexAuthStorageKey(baseKey, url));
  } catch (e) {
    // e.g. iOS keychain locked when the item was stored with WHEN_UNLOCKED.
    console.warn("[auth] SecureStore read failed", e);
    return null;
  }
}

function base64UrlDecode(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return typeof globalThis.atob === "function" ? globalThis.atob(padded) : null;
  } catch {
    return null;
  }
}

/** JWT `exp` in ms, or null when it can't be decoded. */
export function jwtExpiresAt(jwt: string): number | null {
  const payload = jwt.split(".")[1];
  if (!payload) return null;
  const json = base64UrlDecode(payload);
  if (!json) return null;
  try {
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

const EXPIRY_SKEW_MS = 30_000;

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchange the stored refresh token for a fresh JWT and write both back, the
 * same way the React provider does. Only used when the stored JWT is already
 * expired (i.e. the UI is not alive to refresh it, e.g. Android headless
 * relaunch after >1 h). Never clears storage: on failure we just skip.
 */
async function refreshToken(url: string): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh = await readStored(REFRESH_TOKEN_STORAGE_KEY, url);
    if (!refresh) return null;
    try {
      const client = new ConvexHttpClient(url);
      const result = await client.action(api.auth.signIn, { refreshToken: refresh });
      const tokens = result.tokens;
      if (!tokens) return null;
      await secureAuthStorage.setItem(convexAuthStorageKey(JWT_STORAGE_KEY, url), tokens.token);
      await secureAuthStorage.setItem(
        convexAuthStorageKey(REFRESH_TOKEN_STORAGE_KEY, url),
        tokens.refreshToken,
      );
      return tokens.token;
    } catch (e) {
      console.warn("[auth] background token refresh failed", e);
      return null;
    }
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Returns a non-expired JWT for the current user, or null (signed out, keychain
 * locked, refresh failed). Never throws.
 */
export async function readAuthToken(): Promise<string | null> {
  const url = convexUrl();
  if (!url) return null;
  const jwt = await readStored(JWT_STORAGE_KEY, url);
  if (!jwt) return null;
  const exp = jwtExpiresAt(jwt);
  if (exp === null || exp - EXPIRY_SKEW_MS > Date.now()) return jwt;
  return refreshToken(url);
}

/** A ConvexHttpClient authenticated as the current user, or null. */
export async function authedHttpClient(): Promise<ConvexHttpClient | null> {
  const url = convexUrl();
  if (!url) {
    console.warn("[auth] EXPO_PUBLIC_CONVEX_URL is not set");
    return null;
  }
  const token = await readAuthToken();
  if (!token) return null;
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}
