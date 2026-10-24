import { v } from "convex/values";
import { internalAction, mutation } from "./_generated/server";
import { fail, requirePlayer } from "./lib";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const registerToken = mutation({
  args: { gameId: v.id("games"), token: v.string() },
  handler: async (ctx, { gameId, token }) => {
    const { player } = await requirePlayer(ctx, gameId);
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) fail("Geçersiz bildirim anahtarı.");
    await ctx.db.patch(player._id, { pushToken: token });
    return null;
  },
});

/** Sends one notification to many Expo push tokens (chunks of 100). */
export const send = internalAction({
  args: {
    tokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (_ctx, { tokens, title, body, data }) => {
    const unique = [...new Set(tokens)];
    for (let i = 0; i < unique.length; i += 100) {
      const chunk = unique.slice(i, i + 100).map((to) => ({
        to,
        title,
        body,
        data,
        priority: "high",
        channelId: "game", // silent, vibrate-only channel; no `sound` so hiders aren't given away
      }));
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
            ...(process.env.EXPO_ACCESS_TOKEN
              ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
              : {}),
          },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) console.error("Expo push failed", res.status, await res.text());
      } catch (e) {
        console.error("Expo push error", e);
      }
    }
  },
});
