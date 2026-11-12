import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Lumi } from "@/components/Lumi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialForm } from "@/components/MaterialForm";
import { MathInline } from "@/components/MathText";
import { makeQuiz, type QuizQ } from "@/lib/ai.functions";
import { buildMaterial } from "@/lib/extract";
import { clampMinutes, clampQuestions, duelPoints, getRank, reviewSummary, wrongReaction, MAX_MINUTES, MAX_QUESTIONS, type QuizRecord } from "@/lib/game";
import { QuizReview, LiveBoard } from "@/components/QuizReview";
import { actions, useStore } from "@/lib/store";
import { inviteQuiz } from "@/lib/shared";
import { InvitedQuiz } from "@/components/InvitedQuiz";

export const Route = createFileRoute("/kuis")({
  validateSearch: (s: Record<string,unknown>): { group?: string | undefined; invite?: string | undefined } => ({ group: typeof s["group"] === "string" ? s["group"] : undefined, invite: typeof s["invite"] === "string" ? s["invite"] : undefined }),
  head: () => ({
    meta: [
      { title: "Kuis, Mode Panik & Duel — HiLumi" },
      { name: "description", content: "Buat kuis dari materimu sendiri, hingga 75 soal dan 60 menit. Duel melawan AI atau teman." },
      { property: "og:title", content: "Kuis & Duel — HiLumi" },
      { property: "og:description", content: "Kuis kustom sampai 75 soal dan 60 menit, duel lawan AI atau teman." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Kuis,
});

type Opp = "solo" | "ai" | string;

function Kuis() {
  const {group,invite} = Route.useSearch();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(10);
  const [opp, setOpp] = useState<Opp>("solo");
  const [loading, setLoading] = useState(false);
  const [qs, setQs] = useState<QuizQ[] | null>(null);

  async function start() {
    setLoading(true);
    try {
      const material = await buildMaterial(text, files);
      const r = await makeQuiz({ data: { material, count: clampQuestions(count) } });
      if (group) {
        const id = await inviteQuiz(group, text.trim().slice(0,80) || "Kuis Bersama Lumi", r.questions, clampMinutes(minutes));
        if (!id) throw new Error("Undangan gagal dibuat");
        await nav({to:"/kuis",search:{invite:id}});
        return;
      }
      setQs(r.questions);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membuat kuis"); }
    finally { setLoading(false); }
  }

  if (invite) return <Shell><InvitedQuiz key={invite} id={invite}/></Shell>;
  if (qs) return <Shell><Play qs={qs} seconds={clampMinutes(minutes) * 60} opp={opp} oppName={opp === "ai" ? "Lumi Bot" : undefined} title={text.trim().slice(0,60) || "Kuis Lumi"} onExit={() => setQs(null)} /></Shell>;

  return (
    <Shell>
      <h1 className="mb-4 text-3xl font-bold">{group ? "Undang Kuis Bersama" : "Kuis & Duel"}</h1>
      <MaterialForm text={text} setText={setText} files={files} setFiles={setFiles} placeholder="Materi apa yang mau diuji? Tulis topik atau unggah catatan…">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">Jumlah soal (maks {MAX_QUESTIONS})
            <Input type="number" min={1} max={MAX_QUESTIONS} value={count} onChange={(e) => setCount(+e.target.value)} onBlur={() => setCount(clampQuestions(count))} />
          </label>
          <label className="text-sm font-bold">Waktu menit (maks {MAX_MINUTES})
            <Input type="number" min={1} max={MAX_MINUTES} value={minutes} onChange={(e) => setMinutes(+e.target.value)} onBlur={() => setMinutes(clampMinutes(minutes))} />
          </label>
        </div>
        {!group && <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={opp === "solo" ? "default" : "secondary"} onClick={() => setOpp("solo")}>Sendiri</Button>
          <Button size="sm" variant={opp === "ai" ? "default" : "secondary"} onClick={() => setOpp("ai")}>Duel lawan AI</Button>
          <Link to="/teman"><Button size="sm" variant="secondary">Undang Duo / Grup</Button></Link>
        </div>}
        <Button className="w-full bg-lumi text-primary-foreground" disabled={loading} onClick={start}>{loading ? "Lumi menyiapkan soal…" : group ? "Buat & Kirim Undangan" : "Mulai Kuis"}</Button>
      </MaterialForm>
      {loading && <div className="mt-6 flex justify-center"><Lumi mood="thinking" size={110} /></div>}
      {!group && <History />}
    </Shell>
  );
}

function Play({ qs, seconds, opp, oppName, title, onExit }: { qs: QuizQ[]; seconds: number; opp: Opp; oppName?: string | undefined; title: string; onExit: () => void }) {
  const totalXp = useStore((s) => s.xp);
  const nick = useStore((s) => s.user?.nick ?? "Kamu");
  const [wrongCount,setWrongCount] = useState(0);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(seconds);
  const [picks, setPicks] = useState<(number | null)[]>(() => qs.map(() => null));
  const [correct, setCorrect] = useState(0);
  const [points, setPoints] = useState(0);
  const [oppPoints, setOppPoints] = useState(0);
  const [oppCorrect, setOppCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const qStart = useRef(Date.now());
  const finished = useRef(false);
  const quizId = useRef(`q-${Date.now()}`);
  const picked = picks[i] ?? null;
  const answered = picks.filter((p) => p != null).length;

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setLeft((l) => (l <= 1 ? (setDone(true), 0) : l - 1)), 1000);
    return () => clearInterval(t);
  }, [done]);

  const xp = correct * 10 + (opp !== "solo" && points > oppPoints ? 30 : 0);
  const items = qs.map((q, k) => ({ ...q, picked: picks[k] ?? null }));
  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    actions.addXp(xp);
    actions.saveQuiz({ id: quizId.current, title, mode: opp === "solo" ? "solo" : "ai", at: Date.now(), items });
    if (opp === "solo") actions.learned(); else actions.dueled(opp === "ai" ? undefined : opp);
  }, [done, xp, opp, title, items]);

  function answer(k: number) {
    if (picked != null || done) return;
    setPicks((s) => { const a = [...s]; a[i] = k; return a; });
    const ok = k === qs[i]?.answer;
    const c = ok ? combo + 1 : 0;
    setCombo(c);
    if (ok) setCorrect((x) => x + 1); else setWrongCount((x) => x + 1);
    setPoints((p) => p + duelPoints(ok, (Date.now() - qStart.current) / 1000, c));
    if (opp !== "solo") { const aiOk = Math.random() < 0.65; if (aiOk) setOppCorrect((x) => x + 1); setOppPoints((p) => p + duelPoints(aiOk, 3 + Math.random() * 10, aiOk ? 1 : 0)); }
  }
  function next() {
    if (i + 1 >= qs.length) setDone(true);
    else { setI(i + 1); qStart.current = Date.now(); }
  }

  const q = qs[i];
  if (!q) return <Button onClick={onExit}>Kembali</Button>;
  if (reviewing) return <div className="space-y-4"><QuizReview items={items} /><Button onClick={onExit}>Kembali ke Kuis</Button></div>;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const score = Math.round((correct / qs.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-bold">
        <span>Soal {i + 1}/{qs.length}</span>
        <span className="rounded-full bg-secondary px-3 py-1">⏱ {mm}</span>
        <span>Combo x{combo}</span>
      </div>
      {opp !== "solo"
        ? <LiveBoard total={qs.length} rows={[{ id: "me", name: nick, points, correct, answered, me: true }, { id: "bot", name: oppName ?? "Lawan", points: oppPoints, correct: oppCorrect, answered }]} />
        : <div className="flex flex-wrap gap-1" aria-label="Jejak jawaban">{items.map((it, k) => <span key={k} className={`h-2.5 w-5 rounded-full ${it.picked == null ? "bg-secondary" : it.picked === it.answer ? "bg-success" : "bg-destructive"}`} />)}<span className="ml-auto text-sm font-bold">✓ {correct} · ✗ {answered - correct}</span></div>}
      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-bold"><MathInline>{q.q}</MathInline></h2>
        <div className="mt-4 grid gap-2">
          {q.options.map((o, k) => {
            const state = picked == null ? "" : k === q.answer ? "border-success bg-success/20" : k === picked ? "border-destructive bg-destructive/20" : "opacity-60";
            return <Button variant="outline" key={k} disabled={picked != null || done} onClick={() => answer(k)} className={`h-auto min-h-12 justify-start whitespace-normal rounded-2xl border-2 px-4 py-3 text-left font-bold transition hover:border-primary ${state}`}>{"ABCD"[k]}.&nbsp;<MathInline>{o}</MathInline>{picked != null && k === q.answer && <span className="ml-auto pl-2">✓</span>}{k === picked && k !== q.answer && <span className="ml-auto pl-2">✗</span>}</Button>;
          })}
        </div>
        {picked != null && (
            <div className="mt-4 flex flex-wrap items-start gap-3">
            <Lumi mood={picked === q.answer ? "victory" : wrongReaction(wrongCount)} size={90} />
            <div className="flex-1">
              <p className={`font-bold ${picked === q.answer ? "text-success" : "text-destructive"}`}>{picked === q.answer ? "✅ Benar! Hebat!" : `❌ Salah — jawaban benar: ${"ABCD"[q.answer]}`}</p>
              <p className="text-sm font-bold">{picked === q.answer ? "" : wrongReaction(wrongCount)==="laughing" ? "Aduh, salah! Hahaha, coba lagi ya!" : wrongReaction(wrongCount)==="angry" ? "Aduh, kok salah! Baca lagi materinya ya!" : "Hmm… belum tepat. Pelan-pelan saja ya."}</p>
              <p className="text-sm text-muted-foreground">💡 <MathInline>{q.explain}</MathInline></p>
            </div>
            <Button onClick={next}>{i + 1 >= qs.length ? "Selesai" : "Lanjut"}</Button>
          </div>
        )}
      </div>
      <Dialog open={done && !reviewing} onOpenChange={(o) => !o && onExit()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rangkuman Nilai</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-2 text-center">
            <Lumi mood={score >= 70 ? "victory" : "encouraging"} size={100} />
            <p className="text-5xl font-bold text-primary">{score}</p>
            <p>{correct} benar · {answered - correct} salah{qs.length - answered ? ` · ${qs.length - answered} kosong` : ""}</p>
            <p className="font-bold text-primary">{getRank(totalXp).emoji} {getRank(totalXp).name}</p>
            {opp !== "solo" && <p className="font-bold">{points > oppPoints ? "🏆 Kamu menang!" : points === oppPoints ? "Seri!" : `${oppName} menang`} ({points} vs {oppPoints})</p>}
            <p className="rounded-full bg-flame px-4 py-1 font-bold text-primary-foreground">+{xp} XP</p>
            <div className="mt-2 flex gap-2"><Button onClick={() => setReviewing(true)}>📖 Lihat Pembahasan</Button><Button variant="secondary" onClick={onExit}>Kembali</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function History() {
  const list = useStore((s) => s.quizHistory ?? []);
  const [open, setOpen] = useState<QuizRecord | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const label = { solo: "Mandiri", ai: "Lawan AI", grup: "Duo/Grup" } as const;
  return (
    <section className="mt-8">
      <Button type="button" variant="secondary" className="w-full justify-between rounded-2xl px-4 py-6" aria-expanded={showHistory} aria-controls="quiz-history" onClick={() => setShowHistory((v) => !v)}>
        <span>🗂️ Histori Pengerjaan Kuis {list.length > 0 && <span className="ml-1 rounded-full bg-background/60 px-2 py-0.5 text-xs">{list.length}</span>}</span>
        <span aria-hidden="true" className={`transition-transform ${showHistory ? "rotate-180" : ""}`}>⌄</span>
      </Button>
      {showHistory && <div id="quiz-history" className="mt-3 space-y-3">
        <p className="text-sm text-muted-foreground">Pilih kuis untuk melihat jawaban, benar/salah, dan pembahasannya.</p>
        {list.length === 0 ? <p className="glass rounded-2xl p-5 text-center text-sm text-muted-foreground">Belum ada histori. Selesaikan kuis pertamamu dulu, ya! 🪼</p> : <ul className="grid gap-2">
          {list.map((r) => { const s = reviewSummary(r.items); return (
            <li key={r.id}><button type="button" onClick={() => setOpen(r)} className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:border-primary">
              <span className="text-2xl font-bold text-primary">{s.score}</span>
              <span className="min-w-0 flex-1"><b className="block truncate">{r.title}</b><span className="text-xs text-muted-foreground">{label[r.mode]} · {new Date(r.at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ✓ {s.correct} ✗ {s.wrong}</span></span>
              <span className="text-sm font-bold">Review →</span>
            </button></li>); })}
        </ul>}
      </div>}
      <Dialog open={open != null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{open?.title}</DialogTitle></DialogHeader>
          {open && <QuizReview items={open.items} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
