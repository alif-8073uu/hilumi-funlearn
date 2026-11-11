import { useState } from "react";
import { Button } from "./ui/button";
import { MathInline } from "./MathText";
import { reviewSummary, type ReviewItem } from "@/lib/game";
import { cn } from "@/lib/utils";

/** Full answer review: what you picked, the correct answer and Lumi's explanation for every question. */
export function QuizReview({ items }: { items: ReviewItem[] }) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  const sum = reviewSummary(items);
  const shown = items.map((it, i) => ({ ...it, n: i + 1 })).filter((it) => !onlyWrong || it.picked !== it.answer);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-bold">📖 Pembahasan Soal</h2>
        <span className="rounded-full bg-success/20 px-3 py-1 text-sm font-bold text-success">✓ {sum.correct} benar</span>
        <span className="rounded-full bg-destructive/20 px-3 py-1 text-sm font-bold text-destructive">✗ {sum.wrong} salah</span>
        {sum.skipped > 0 && <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold">– {sum.skipped} kosong</span>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={onlyWrong ? "secondary" : "default"} onClick={() => setOnlyWrong(false)}>Semua soal</Button>
        <Button size="sm" variant={onlyWrong ? "default" : "secondary"} onClick={() => setOnlyWrong(true)}>Hanya yang salah</Button>
      </div>
      {shown.length === 0 && <p className="glass rounded-2xl p-4 text-center font-bold">🎉 Tidak ada yang salah. Keren!</p>}
      {shown.map((it) => {
        const ok = it.picked === it.answer;
        return (
          <article key={it.n} className={cn("glass rounded-2xl border-l-4 p-4", ok ? "border-l-success" : "border-l-destructive")}>
            <p className="mb-2 text-sm font-bold">{ok ? "✅" : it.picked == null ? "⏳" : "❌"} Soal {it.n}</p>
            <p className="font-bold"><MathInline>{it.q}</MathInline></p>
            <ul className="mt-3 grid gap-1.5">
              {it.options.map((o, k) => (
                <li key={k} className={cn("rounded-xl border-2 px-3 py-2 text-sm", k === it.answer ? "border-success bg-success/15 font-bold" : k === it.picked ? "border-destructive bg-destructive/15" : "border-transparent opacity-70")}>
                  {"ABCD"[k]}. <MathInline>{o}</MathInline>
                  {k === it.answer && <span className="ml-2 text-success">✓ Kunci</span>}
                  {k === it.picked && k !== it.answer && <span className="ml-2 text-destructive">✗ Jawabanmu</span>}
                </li>
              ))}
            </ul>
            {it.picked == null && <p className="mt-2 text-sm text-muted-foreground">Kamu belum menjawab soal ini.</p>}
            {it.explain && <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">💡 <MathInline>{it.explain}</MathInline></p>}
          </article>
        );
      })}
    </section>
  );
}

/** Live scoreboard row list: name, points, progress bar of answered questions. */
export function LiveBoard({ rows, total }: { rows: { id: string; name: string; points: number; correct: number; answered: number; me?: boolean; done?: boolean }[]; total: number }) {
  const sorted = [...rows].sort((a, b) => b.points - a.points || b.answered - a.answered);
  return (
    <div className="glass rounded-2xl p-3" aria-live="polite">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /> LIVE SKOR</p>
      <ol className="space-y-2">
        {sorted.map((r, i) => (
          <li key={r.id} className={cn("rounded-xl px-2 py-1.5", r.me && "bg-primary/15")}>
            <div className="flex items-center justify-between text-sm font-bold">
              <span>{["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`} {r.name}{r.me ? " (Kamu)" : ""}{r.done ? " ✓" : ""}</span>
              <span>{r.points} poin <span className="font-normal text-muted-foreground">· {r.correct}/{r.answered} benar</span></span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total ? (r.answered / total) * 100 : 0}%` }} /></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
