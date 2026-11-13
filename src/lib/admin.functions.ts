/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TTL = 8 * 60 * 60 * 1000; // admin session lasts 8 hours

async function hmac(msg: string) {
  const secret = process.env["ADMIN_LOGIN_CODE"];
  if (!secret) throw new Error("Kode admin belum diatur.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`hilumi-admin:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, "");
}

async function verify(token: string) {
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() || (await hmac(exp)) !== sig) throw new Error("Sesi admin tidak valid, silakan masuk lagi.");
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().max(100) }))
  .handler(async ({ data }) => {
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    if (data.code.trim() !== process.env["ADMIN_LOGIN_CODE"]) throw new Error("ID admin salah.");
    const exp = String(Date.now() + TTL);
    return { token: `${exp}.${await hmac(exp)}` };
  });

export type AdminUser = { id: string; email: string; nick: string; lumi_id: string; progress: Record<string, any>; updated_at: string; last_sign_in: string | null };

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    await verify(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("profiles").select("id, nick, lumi_id, progress, updated_at").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: au } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const byId = new Map((au?.users ?? []).map((u) => [u.id, u]));
    const now = new Date(Date.now() + 7 * 3600e3);
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 7 * 3600e3).toISOString();
    const { count: visitsToday } = await supabaseAdmin.from("site_visits").select("id", { count: "exact", head: true }).gte("visited_at", start);
    return {
      visitsToday: visitsToday ?? 0,
      users: (rows ?? []).map((r) => ({
        ...r,
        progress: (r.progress ?? {}) as Record<string, any>,
        email: byId.get(r.id)?.email ?? "",
        last_sign_in: byId.get(r.id)?.last_sign_in_at ?? null,
      })) as AdminUser[],
    };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    token: z.string(),
    id: z.string().uuid(),
    nick: z.string().min(1).max(20).optional(),
    addXp: z.number().int().min(-100000).max(100000).optional(),
    setXp: z.number().int().min(0).max(1000000).optional(),
    streakCount: z.number().int().min(0).max(10000).optional(),
    resetRecoveries: z.boolean().optional(),
    clearDecks: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    await verify(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("profiles").select("progress, nick").eq("id", data.id).single();
    if (error || !row) throw new Error("Pengguna tidak ditemukan.");
    const p = { ...((row.progress ?? {}) as Record<string, unknown>) };
    const streak = { count: 0, lastActive: null, diedAt: null, frozenCount: 0, recoveriesUsed: 0, recoveryMonth: "", ...((p["streak"] as object) ?? {}) } as Record<string, unknown>;
    let xp = Number(p["xp"] ?? 0);
    if (data.setXp != null) xp = data.setXp;
    if (data.addXp != null) xp = Math.max(0, xp + data.addXp);
    p["xp"] = xp;
    if (data.streakCount != null) Object.assign(streak, { count: data.streakCount, lastActive: Date.now(), diedAt: null, frozenCount: 0 });
    if (data.resetRecoveries) streak["recoveriesUsed"] = 0;
    p["streak"] = streak;
    if (data.clearDecks) p["decks"] = [];
    const { error: e2 } = await supabaseAdmin.from("profiles").update({ progress: p as never, nick: data.nick ?? row.nick, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });
