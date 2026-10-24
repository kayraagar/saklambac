// Define the background location task before anything renders, so it also
// exists on a headless Android relaunch.
import "./src/location/task";
import "expo-router/entry";
