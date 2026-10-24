// Safety net: importing the public API also defines the background task.
// The app entry / root layout should still import "@/location/task" directly.
import "./task";

export { startGameTracking, stopGameTracking } from "./tracking";
export type { StartResult } from "./tracking";
export { useLocationPermission, useMyPosition } from "./hooks";
export type { LocationPermissionStatus } from "./hooks";
export { secureAuthStorage, secureStoreKey } from "./authToken";
export { LOCATION_TASK_NAME } from "./activeGame";
