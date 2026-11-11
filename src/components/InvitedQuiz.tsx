import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Lumi } from "./Lumi";
import { MathInline } from "./MathText";
import { QuizReview, LiveBoard } from "./QuizReview";
import { useStore, actions } from "@/lib/store";
import { quizStandings, getRank, wrongReaction, type ReviewItem } from "@/lib/game";
import type { QuizQ } from "@/lib/ai.functions";

type OpenQ = Omit<QuizQ, "answer" | "explain">;
type Feedback = { correct: boolean; choice: number; answer: number; explain: string };

export function InvitedQuiz({ id }: { id: string }) {
  const uid = useStore((s) => s.uid);
  const xp = useStore((s) => s.xp);
  const [questions, setQuestions] = useState<OpenQ[]>([]);
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [wrong, setWrong] = useState(0);
  const [result, setResult] = useState<{ correct: number; points: number } | null>(null);
  const finishing = useRef(false);

  const query = useQuery({ queryKey: ["invited-quiz", id, uid], enabled: Boolean(uid), refetchInterval: 8000, queryFn: async () => {
    const { data: quiz, error } = await supabase.from("shared_quizzes").select("id,group_id,title,minutes,expires_at,credited").eq("id", id).single();
    if (error) throw error;
    const [players, names] = await Promise.all([supabase.from("shared_quiz_players").select("*").eq("quiz_id", id), supabase.rpc("streak_member_names", { g: quiz.group_id })]);
    if (players.error || names.error) throw players.error ?? names.error;
    return { quiz, players: players.data ?? [], names: names.data ?? [] };
  } });
  const { refetch } = query;
  const me = query.data?.players.find((p) => p.user_id === uid);
  const ended = Boolean(result || me?.completed_at);

  // Live score: refresh the roster the moment any player answers.
  useEffect(() => {
    const ch = supabase.channel(`quiz-live-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_quiz_players", filter: `quiz_id=eq.${id}` }, () => { void refetch(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id, refetch]);

  const review = useQuery({ queryKey: ["quiz-review", id, uid], enabled: ended, staleTime: Infinity, queryFn: async () => {
    const { data, error } = await supabase.rpc("review_streak_quiz", { qid: id });
    if (error) throw error;
    const r = data as unknown as { questions: QuizQ[]; picks: (number | null)[] | null };
    return r.questions.map((q, k): ReviewItem => ({ ...q, picked: r.picks?.[k] ?? null }));
  } });
  const title = query.data?.quiz.title;
  useEffect(() => {
    if (review.data && title) actions.saveQuiz({ id: `grup-${id}`, title, mode: "grup", at: Date.now(), items: review.data });
  }, [review.data, title, id]);

  useEffect(() => {
    if (!questions.length || ended) return;
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [questions.length, ended]);
  useEffect(() => { if (questions.length && left === 0 && !ended) void finish(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  async function join() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("start_streak_quiz", { qid: id });
      if (error) throw error;
      const started = data as unknown as { questions: OpenQ[]; seconds: number };
      setIndex(Math.min(me?.answered ?? 0, started.questions.length - 1));
      setQuestions(started.questions); setLeft(started.seconds);
      if ((me?.answered ?? 0) >= started.questions.length) void finish();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membuka kuis"); }
    finally { setBusy(false); }
  }
  async function answer(k: number) {
    if (feedback || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("answer_streak_quiz", { qid: id, i: index, choice: k });
      if (error) throw error;
      const f = data as unknown as Feedback;
      setFeedback(f); if (!f.correct) setWrong((w) => w + 1);
      void refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal mengirim jawaban"); }
    finally { setBusy(false); }
  }
  function next() {
    if (index + 1 >= questions.length) void finish();
    else { setIndex((s) => s + 1); setFeedback(null); }
  }
  async function finish() {
    if (finishing.current) return;
    finishing.current = true; setBusy(true);
    try {
      const { data, error } = await supabase.rpc("finish_streak_quiz", { qid: id, answers: [] });
      if (error) throw error;
      const r = data as unknown as { correct: number; points: number };
      setResult(r); actions.addXp(r.correct * 10); actions.learned(); await refetch();
    } catch (e) { finishing.current = false; toast.error(e instanceof Error ? e.message : "Gagal menyimpan jawaban"); }
    finally { setBusy(false); }
  }

  if (query.isPending) return <p>Memuat undangan…</p>;
  if (query.error || !query.data) return <div role="alert"><p>Undangan tidak tersedia untuk akun ini.</p><Link to="/teman"><Button>Kembali</Button></Link></div>;
  const { quiz, players, names } = query.data;
  const nameOf = (u: string) => names.find((n) => n.id === u)?.nick ?? "Teman";
  const standings = quizStandings(players.map((p) => ({ ...p, userId: p.user_id, completed: Boolean(p.completed_at) })));
  const total = questions.length || review.data?.length || 0;
  const board = players.map((p) => ({ id: p.user_id, name: nameOf(p.user_id), points: p.points, correct: p.correct, answered: p.answered, me: p.user_id === uid, done: Boolean(p.completed_at) }));
  const q = questions[index];

  return <div className="space-y-5">
    <h1 className="text-3xl font-bold">{quiz.title}</h1>
    {ended ? <>
      <div className="flex items-center gap-4"><Lumi mood="victory" size={100} /><div><h2 className="text-xl font-bold">Kuis Selesai</h2><p>{result?.correct ?? me?.correct} jawaban benar · {result?.points ?? me?.points} poin</p><p className="font-bold text-primary">{getRank(xp).emoji} {getRank(xp).name}</p></div></div>
      <h2 className="text-xl font-bold">Peringkat Pertandingan</h2>
      <ol className="divide-y">{standings.map((p) => <li key={p.userId} className="flex justify-between py-3"><span>#{p.place} {nameOf(p.userId)}{p.userId === uid ? " (Kamu)" : ""}</span><b>{p.points} poin</b></li>)}</ol>
      {players.some((p) => !p.completed_at) && <LiveBoard total={total} rows={board} />}
      <p className="text-sm text-muted-foreground">{quiz.credited ? "🔥 Semua anggota selesai — streak bersama menyala!" : `${players.filter((p) => p.completed_at).length}/${players.length} selesai · peringkat sementara`}</p>
      {review.data ? <QuizReview items={review.data} /> : review.isPending ? <p>Memuat pembahasan…</p> : null}
      <Link to="/teman"><Button>Kembali ke Streak</Button></Link>
    </> : q ? <>
      <div className="flex justify-between font-bold"><span>Soal {index + 1}/{questions.length}</span><span className="rounded-full bg-secondary px-3 py-1">⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span></div>
      <LiveBoard total={questions.length} rows={board} />
      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-bold"><MathInline>{q.q}</MathInline></h2>
        <div className="mt-4 grid gap-2">{q.options.map((option, k) => {
          const state = !feedback ? "" : k === feedback.answer ? "border-success bg-success/20" : k === feedback.choice ? "border-destructive bg-destructive/20" : "opacity-60";
          return <Button key={k} variant="outline" disabled={Boolean(feedback) || busy || left === 0} className={`h-auto min-h-12 justify-start whitespace-normal rounded-2xl border-2 px-4 py-3 text-left font-bold ${state}`} onClick={() => answer(k)}>{"ABCD"[k]}.&nbsp;<MathInline>{option}</MathInline>{feedback && k === feedback.answer && <span className="ml-auto pl-2">✓</span>}</Button>;
        })}</div>
        {feedback && <div className="mt-4 flex flex-wrap items-start gap-3">
          <Lumi mood={feedback.correct ? "victory" : wrongReaction(wrong)} size={80} />
          <div className="flex-1">
            <p className={`font-bold ${feedback.correct ? "text-success" : "text-destructive"}`}>{feedback.correct ? "✅ Benar! +10 poin" : `❌ Salah — jawaban benar: ${"ABCD"[feedback.answer]}`}</p>
            {feedback.explain && <p className="text-sm text-muted-foreground">💡 <MathInline>{feedback.explain}</MathInline></p>}
          </div>
          <Button onClick={next} disabled={busy}>{index + 1 >= questions.length ? (busy ? "Menyimpan…" : "Selesai & Lihat Peringkat") : "Lanjut"}</Button>
        </div>}
      </div>
      {left === 0 && <p className="text-destructive">Waktu habis. Menyimpan jawaban…</p>}
    </> : <>
      <p>{players.length} anggota · {quiz.minutes} menit</p><p className="text-sm text-muted-foreground">Berakhir {new Date(quiz.expires_at).toLocaleString("id-ID")}</p>
      <ul className="divide-y">{players.map((p) => <li key={p.user_id} className="flex justify-between py-3"><b>{nameOf(p.user_id)}</b><span>{p.completed_at ? "✓ Selesai" : p.started_at ? `Mengerjakan · ${p.answered} soal` : "Diundang"}</span></li>)}</ul>
      <Button onClick={join} disabled={busy || new Date(quiz.expires_at).getTime() < Date.now()}>{busy ? "Membuka…" : me?.started_at ? "Lanjutkan Kuis" : "Terima & Mulai Kuis"}</Button>
    </>}
  </div>;
}
