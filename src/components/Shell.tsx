import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, MessageCircle, Swords, Layers, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { getRank } from "@/lib/game";
import { SignIn } from "./SignIn";
import { Lumi } from "./Lumi";
import { WelcomeTour } from "./WelcomeTour";

const NAV = [
  { to: "/", label: "Lobby", icon: Home },
  { to: "/belajar", label: "Belajar", icon: MessageCircle },
  { to: "/kuis", label: "Kuis & Duel", icon: Swords },
  { to: "/flashcard", label: "Flashcard", icon: Layers },
  { to: "/teman", label: "Teman", icon: Users },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const user = useStore((s) => s.user);
  const ready = useStore((s) => s.authReady);
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak.count);
  const rank = getRank(xp);
  return (
    <div className="min-h-screen pb-24">
      {[8, 22, 47, 70, 88].map((l, i) => (
        <span key={l} className="bubble" style={{ left: `${l}%`, width: 8 + i * 3, height: 8 + i * 3, animationDuration: `${12 + i * 4}s`, animationDelay: `-${i * 3}s` }} />
      ))}
      <header className="sticky top-0 z-20 glass border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-2xl font-bold">Hi<span className="text-lumi-blue">Lumi</span></Link>
          {user && (
            <Link to="/profil" className="flex items-center gap-3 text-sm font-bold">
              <span className="rounded-full bg-flame px-3 py-1 text-primary-foreground">🔥 {streak}</span>
              <span className="hidden sm:inline">{rank.emoji} {rank.name}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-lumi text-primary-foreground">{user.nick[0]?.toUpperCase()}</span>
            </Link>
          )}
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-6">
        {!ready ? <div className="flex justify-center pt-20"><Lumi mood="thinking" size={100} /></div> : user ? children : <SignIn />}
      </main>
      {user && (
        <WelcomeTour />
      )}
      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-20 glass border-x-0 border-b-0">
          <div className="mx-auto flex max-w-xl justify-around py-2">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs font-bold text-muted-foreground data-[status=active]:text-primary">
                <Icon className="h-5 w-5" />{label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
