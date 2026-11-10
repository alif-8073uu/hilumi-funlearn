import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Lumi } from "@/components/Lumi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getRank, SUBS, TIERS, TIER_EMOJI, RECOVERIES_PER_MONTH } from "@/lib/game";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil & Rank — HiLumi" },
      { name: "description", content: "Lihat ID unik, nickname, XP, dan 25 tingkatan rank permanen dari Plankton hingga Paus Samudra." },
      { property: "og:title", content: "Profil & Rank — HiLumi" },
      { property: "og:description", content: "ID unik, XP, dan 25 rank permanen dari Plankton hingga Paus Samudra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profil,
});

function Profil() {
  const user = useStore((s) => s.user);
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak);
  const [nick, setNick] = useState(user?.nick ?? "");
  const nav = useNavigate();
  const rank = getRank(xp);
  const [restoreBusy, setRestoreBusy] = useState(false);
  async function restoreLegacy() {
    if (!user?.email) return;
    setRestoreBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/profil` } });
    setRestoreBusy(false);
    if (error) toast.error("Gagal mengirim tautan, coba lagi sebentar.");
    else toast.success(`Tautan dikirim ke ${user.email}. Buka di perangkat ini.`);
  }
  return (
    <Shell>
      <div className="glass flex flex-col items-center gap-3 rounded-3xl p-6 text-center">
        <Lumi mood="victory" size={110} />
        <p className="font-bold text-muted-foreground">{user?.id}</p>
        <div className="flex gap-2">
          <Input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={20} />
          <Button onClick={() => nick.trim() && actions.setNick(nick.trim())}>Simpan</Button>
        </div>
        <p className="text-2xl font-bold">{rank.emoji} {rank.name} · {xp} XP</p>
        <p className="text-sm">🔥 Streak {streak.count} · Pemulihan tersisa {RECOVERIES_PER_MONTH - streak.recoveriesUsed}/{RECOVERIES_PER_MONTH} bulan ini</p>
      </div>
      <h2 className="mt-6 mb-3 text-xl font-bold">Tangga Rank (permanen, tanpa reset)</h2>
      <div className="grid gap-3 sm:grid-cols-5">
        {TIERS.map((t, ti) => (
          <div key={t} className={`glass rounded-3xl p-3 text-center ${rank.tier === ti ? "shadow-glow" : ""}`}>
            <div className="text-3xl">{TIER_EMOJI[ti]}</div>
            <b>{t}</b>
            <div className="mt-2 flex justify-center gap-1">
              {SUBS.map((s, si) => <span key={s} className={`rounded-md px-1.5 text-xs font-bold ${ti * 5 + si <= rank.level ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="glass mt-8 rounded-3xl p-4 text-sm">
        <b>Punya akun HiLumi lama?</b>
        <p className="mt-1 text-muted-foreground">Kami kirim tautan ke {user?.email}. Buka tautannya untuk membuktikan email ini milikmu, lalu XP, streak, dan grup lamamu kembali.</p>
        <Button variant="outline" className="mt-3" disabled={restoreBusy || !user?.email} onClick={restoreLegacy}>Pulihkan progres lama</Button>
      </div>
      <Button variant="secondary" className="mt-8" onClick={async () => { await actions.signOut(); nav({ to: "/", replace: true }); }}>Keluar</Button>
    </Shell>
  );
}
