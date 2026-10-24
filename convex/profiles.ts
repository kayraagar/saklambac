import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, requireUser } from "./lib";

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export const upsert = mutation({
  args: { name: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const name = args.name.trim();
    const username = args.username.trim().toLowerCase();
    if (name.length < 1 || name.length > 30) fail("İsim 1-30 karakter olmalı.");
    if (!USERNAME_RE.test(username)) {
      fail("Kullanıcı adı 3-20 karakter olmalı; sadece harf (a-z), rakam, nokta ve alt çizgi.");
    }
    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
    if (taken && taken.userId !== userId) fail("Bu kullanıcı adı alınmış.");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { name, username });
      return existing._id;
    }
    return await ctx.db.insert("profiles", { userId, name, username });
  },
});

/** Signed-out → null. Signed-in without a profile → { profile: null, email }. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      userId,
      email: user?.email ?? null,
      profile: profile ? { name: profile.name, username: profile.username } : null,
    };
  },
});
