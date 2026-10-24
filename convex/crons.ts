import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly("cleanup expired games", { minuteUTC: 7 }, internal.games.cleanupExpired, {});

export default crons;
