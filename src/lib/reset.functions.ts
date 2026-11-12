import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { evaluateStreak, getRank, newStreak, type Streak } from "./game";
import { answersMatch } from "./password-reset";

const MAX_FAILS = 5;
const WINDOW = 60 * 60 * 1000;

async function findUser(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    const u = data?.users.find((x) => x.email?.toLowerCase() === target);
    if (u) return { admin: supabaseAdmin, id: u.id, email: target };
    if (!data || data.users.length < 1000) break;
  }
  return null;
}

export const checkResetEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email().max(255) }))
  .handler(async ({ data }) => ({ exists: !!(await findUser(data.email)) }));

export const resetWithAnswers = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email().max(255), nick: z.string().max(40), streak: z.number().int().min(0).max(100000), tier: z.number().int().min(0).max(4), password: z.string().min(6).max(72) }))
  .handler(async ({ data }) => {
    await new Promise((r) => setTimeout(r, 500));
    const u = await findUser(data.email);
    if (!u) throw new Error("Email tidak terdaftar.");
    const { data: att } = await u.admin.from("password_reset_attempts").select("failures, window_start").eq("email", u.email).maybeSingle();
    const fresh = !att || Date.now() - new Date(att.window_start).getTime() > WINDOW;
    const failures = fresh ? 0 : att.failures;
    if (failures >= MAX_FAILS) throw new Error("Terlalu banyak percobaan salah. Coba lagi 1 jam lagi.");
    const { data: prof } = await u.admin.from("profiles").select("nick, progress").eq("id", u.id).maybeSingle();
    const p = (prof?.progress ?? {}) as { xp?: number; streak?: Streak };
    const streak = evaluateStreak(p.streak ?? newStreak(), Date.now()).count;
    const ok = answersMatch({ nick: prof?.nick ?? "", streak, tier: getRank(p.xp ?? 0).tier }, data);
    if (!ok) {
      await u.admin.from("password_reset_attempts").upsert({ email: u.email, failures: failures + 1, window_start: fresh ? new Date().toISOString() : att!.window_start });
      throw new Error(`Jawaban belum cocok. Sisa percobaan: ${MAX_FAILS - failures - 1}.`);
    }
    const { error } = await u.admin.auth.admin.updateUserById(u.id, { password: data.password });
    if (error) throw new Error("Kata sandi belum bisa diubah. Coba lagi.");
    await u.admin.from("password_reset_attempts").delete().eq("email", u.email);
    return { ok: true };
  });
