import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL tanımlı değil (.env.local).");
}

export const convex = new ConvexReactClient(url, { unsavedChangesWarning: false });

/**
 * Convex Auth token storage: SecureStore with AFTER_FIRST_UNLOCK, shared with
 * the background location task so it can read the JWT while the phone is locked.
 */
export { secureAuthStorage } from "@/location/authToken";
