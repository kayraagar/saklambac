/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as locations from "../locations.js";
import type * as map from "../map.js";
import type * as messages from "../messages.js";
import type * as profiles from "../profiles.js";
import type * as push from "../push.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  auth: typeof auth;
  crons: typeof crons;
  games: typeof games;
  http: typeof http;
  lib: typeof lib;
  locations: typeof locations;
  map: typeof map;
  messages: typeof messages;
  profiles: typeof profiles;
  push: typeof push;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
