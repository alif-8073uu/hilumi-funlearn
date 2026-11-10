import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Lumi } from "@/components/Lumi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialForm } from "@/components/MaterialForm";
import { makeQuiz, type QuizQ } from "@/lib/ai.functions";
import { buildMaterial } from "@/lib/extract";
import { clampMinutes, clampQuestions, duelPoints, getRank, wrongReaction, MAX_MINUTES, MAX_QUESTIONS } from "@/lib/game";
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
  if (qs) return <Shell><Play qs={qs} seconds={clampMinutes(minutes) * 60} opp={opp} oppName={opp === "ai" ? "Lumi Bot" : undefined} onExit={() => setQs(null)} /></Shell>;

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
    </Shell>
  );
}

function Play({ qs, seconds, opp, oppName, onExit }: { qs: QuizQ[]; seconds: number; opp: Opp; oppName?: string | undefined; onExit: () => void }) {
  const totalXp = useStore((s) => s.xp);
  const [wrongCount,setWrongCount] = useState(0);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(seconds);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [points, setPoints] = useState(0);
  const [oppPoints, setOppPoints] = useState(0);
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState(false);
  const qStart = useRef(Date.now());
  const finished = useRef(false);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setLeft((l) => (l <= 1 ? (setDone(true), 0) : l - 1)), 1000);
    return () => clearInterval(t);
  }, [done]);

  const xp = correct * 10 + (opp !== "solo" && points > oppPoints ? 30 : 0);
  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    actions.addXp(xp);
    if (opp === "solo") actions.learned(); else actions.dueled(opp === "ai" ? undefined : opp);
  }, [done, xp, opp]);

  function answer(k: number) {
    if (picked != null) return;
    setPicked(k);
    const ok = k === qs[i]?.answer;
    const c = ok ? combo + 1 : 0;
    setCombo(c);
    if (ok) setCorrect((x) => x + 1); else setWrongCount((x) => x + 1);
    setPoints((p) => p + duelPoints(ok, (Date.now() - qStart.current) / 1000, c));
    if (opp !== "solo") { const aiOk = Math.random() < 0.65; setOppPoints((p) => p + duelPoints(aiOk, 3 + Math.random() * 10, aiOk ? 1 : 0)); }
  }
  function next() {
    if (i + 1 >= qs.length) setDone(true);
    else { setI(i + 1); setPicked(null); qStart.current = Date.now(); }
  }

  const q = qs[i];
  if (!q) return <Button onClick={onExit}>Kembali</Button>;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const score = Math.round((correct / qs.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-bold">
        <span>Soal {i + 1}/{qs.length}</span>
        <span className="rounded-full bg-secondary px-3 py-1">⏱ {mm}</span>
        {opp !== "solo" ? <span>Kamu {points} · {oppName} {oppPoints}</span> : <span>Combo x{combo}</span>}
      </div>
      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-bold">{q.q}</h2>
        <div className="mt-4 grid gap-2">
          {q.options.map((o, k) => {
            const state = picked == null ? "" : k === q.answer ? "border-success bg-success/20" : k === picked ? "border-destructive bg-destructive/20" : "opacity-60";
            return <Button variant="outline" key={k} disabled={picked != null || done} onClick={() => answer(k)} className={`h-auto min-h-12 justify-start whitespace-normal rounded-2xl border-2 px-4 py-3 text-left font-bold transition hover:border-primary ${state}`}>{"ABCD"[k]}. {o}</Button>;
          })}
        </div>
        {picked != null && (
            <div className="mt-4 flex flex-wrap items-start gap-3">
            <Lumi mood={picked === q.answer ? "victory" : wrongReaction(wrongCount)} size={90} />
            <div className="flex-1">
              <p className="font-bold">{picked === q.answer ? "Hebat! Jawabanmu benar!" : wrongReaction(wrongCount)==="laughing" ? "Aduh, salah! Hahaha, coba lagi ya!" : wrongReaction(wrongCount)==="angry" ? "Aduh, kok salah! Baca lagi materinya ya!" : "Hmm… belum tepat. Pelan-pelan saja ya."}</p>
              <p className="text-sm text-muted-foreground">{q.explain}</p>
            </div>
            <Button onClick={next}>{i + 1 >= qs.length ? "Selesai" : "Lanjut"}</Button>
          </div>
        )}
      </div>
      <Dialog open={done} onOpenChange={(o) => !o && onExit()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rangkuman Nilai</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-2 text-center">
            <Lumi mood={score >= 70 ? "victory" : "encouraging"} size={100} />
            <p className="text-5xl font-bold text-primary">{score}</p>
            <p>{correct} dari {qs.length} benar</p>
            <p className="font-bold text-primary">{getRank(totalXp).emoji} {getRank(totalXp).name}</p>
            {opp !== "solo" && <p className="font-bold">Peringkat #{points >= oppPoints ? 1 : 2} · {points === oppPoints ? "Seri" : "Duel AI"}</p>}
            {opp !== "solo" && <p className="font-bold">{points > oppPoints ? "🏆 Kamu menang!" : points === oppPoints ? "Seri!" : `${oppName} menang`} ({points} vs {oppPoints})</p>}
            <p className="rounded-full bg-flame px-4 py-1 font-bold text-primary-foreground">+{xp} XP</p>
            <Button onClick={onExit} className="mt-2">Kembali</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
