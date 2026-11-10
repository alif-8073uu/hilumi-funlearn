import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { ArrowRight, Flame, Swords, Users } from "lucide-react";
import { StreakPet } from "@/components/StreakPet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { actions, useStore } from "@/lib/store";
import { canRecover, getRank, RECOVERIES_PER_MONTH } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HiLumi — Guru Bayangan AI untuk Siswa SMP" },
      { name: "description", content: "Belajar bareng Lumi si ubur-ubur AI: tanya PR, kuis, duel teman, flashcard, streak dan rank." },
      { property: "og:title", content: "HiLumi — Guru Bayangan AI" },
      { property: "og:description", content: "Belajar bareng Lumi: tanya PR, kuis, duel, flashcard, streak & rank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lobby,
});

const FEATURES = [
  { to: "/belajar", title: "Tanya PR & Belajar", desc: "Petunjuk bertahap, anti-menyontek", emoji: "💬" },
  { to: "/kuis", title: "Kuis, Panik & Duel", desc: "Sampai 75 soal, 60 menit", emoji: "⚔️" },
  { to: "/flashcard", title: "Kartu Kilat Lumi", desc: "Kartu 3D + pengulangan berjarak", emoji: "🃏" },
  { to: "/teman", title: "Streak Duo & Grup", desc: "Undangan kuis bersama", emoji: "🫂" },
] as const;

function Lobby() {
  const user = useStore((s) => s.user);
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak);
  const rank = getRank(xp);
  const dead = streak.diedAt != null && streak.frozenCount > 0;
  const lit = streak.count > 0 && streak.lastActive != null && new Date(streak.lastActive).toDateString() === new Date().toDateString();

  return (
    <Shell>
      <section className="glass flex flex-col items-center gap-4 rounded-3xl p-6 sm:flex-row">
        <StreakPet days={streak.count} label="Pet Individual" stacked />
        <div className="min-w-0 w-full flex-1 space-y-3">
          <p className="text-sm font-bold text-muted-foreground">{user?.id}</p>
          <h1 className="text-3xl font-bold">Halo, {user?.nick}!</h1>
          <p className="rounded-2xl bg-secondary px-4 py-2 font-bold">
            {dead ? "Brrr… apiku padam. Pulihkan streak sebelum 24 jam!" : lit ? "Apinya menyala! Mantap, lanjutkan!" : "Ayo belajar hari ini biar apiku menyala!"}
          </p>
          <div>
            <div className="mb-1 flex justify-between text-sm font-bold"><span>{rank.emoji} {rank.name}</span><span>{xp} XP</span></div>
            <Progress value={rank.progress * 100} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-flame px-4 py-1.5 font-bold text-primary-foreground">🔥 {streak.count} hari</span>
            {dead && (
              <Button size="sm" disabled={!canRecover(streak, Date.now())} onClick={actions.recover}>
                Pulihkan ({RECOVERIES_PER_MONTH - streak.recoveriesUsed}x tersisa)
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link key={f.to} to={f.to} className="glass group rounded-3xl p-5 transition hover:shadow-glow">
            <div className="text-4xl">{f.emoji}</div>
            <h2 className="mt-2 text-xl font-bold group-hover:text-primary">{f.title}</h2>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-5 border-y py-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Users className="h-7 w-7" /><Flame className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background p-1 text-flame" /></div>
          <div><h2 className="text-xl font-bold">Streak Bersama</h2><p className="mt-1 text-sm text-muted-foreground">Duo, grup & undangan kuis</p></div>
        </div>
        <Link to="/teman"><Button variant="secondary" className="gap-2"><Swords className="h-4 w-4" />Lihat Streak<ArrowRight className="h-4 w-4" /></Button></Link>
      </section>
    </Shell>
  );
}
