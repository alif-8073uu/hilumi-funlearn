import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Lumi } from "./Lumi";
import { useStore, actions } from "@/lib/store";
import { quizStandings, getRank, wrongReaction } from "@/lib/game";
import type { QuizQ } from "@/lib/ai.functions";
import type { Json } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { MathInline } from "@/components/MathText";

export function InvitedQuiz({ id }: { id: string }) {
  const uid = useStore((s) => s.uid);
  const xp = useStore((s) => s.xp);
  const [questions, setQuestions] = useState<Omit<QuizQ,"answer"|"explain">[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<QuizQ[]>([]);
  const [result, setResult] = useState<{correct:number;points:number} | null>(null);
  const query = useQuery({ queryKey: ["invited-quiz",id,uid], enabled: Boolean(uid), refetchInterval: 4000, queryFn: async () => {
    const { data: quiz, error } = await supabase.from("shared_quizzes").select("id,group_id,title,minutes,expires_at,credited").eq("id",id).single();
    if (error) throw error;
    const [players,names] = await Promise.all([supabase.from("shared_quiz_players").select("*").eq("quiz_id",id),supabase.rpc("streak_member_names",{g:quiz.group_id})]);
    if (players.error || names.error) throw players.error ?? names.error;
    return { quiz, players: players.data ?? [], names: names.data ?? [] };
  }});
  const me = query.data?.players.find((p) => p.user_id === uid);
  useEffect(() => {
    if (!questions.length || result || busy) return;
    const timer = setInterval(() => setLeft((s) => Math.max(0,s-1)),1000);
    return () => clearInterval(timer);
  },[questions.length,result,busy]);
  async function join() {
    setBusy(true);
    try {
      const {data,error} = await supabase.rpc("start_streak_quiz",{qid:id});
      if (error) throw error;
      const started = data as unknown as {questions:Omit<QuizQ,"answer"|"explain">[];seconds:number};
      setQuestions(started.questions); setLeft(started.seconds);
    } catch(e) { toast.error(e instanceof Error ? e.message : "Gagal membuka kuis"); }
    finally { setBusy(false); }
  }
  async function finish() {
    setBusy(true);
    try {
      const {data,error} = await supabase.rpc("finish_streak_quiz",{qid:id,answers:answers as Json});
      if(error) throw error;
      const r = data as unknown as {correct:number;points:number;questions?:QuizQ[]};
      setResult(r); setReview(r.questions ?? []); actions.addXp(r.correct*10); actions.learned(); await query.refetch();
    } catch(e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan jawaban"); }
    finally { setBusy(false); }
  }
  if(query.isPending) return <p>Memuat undangan…</p>;
  if(query.error || !query.data) return <div role="alert"><p>Undangan tidak tersedia untuk akun ini.</p><Link to="/teman"><Button>Kembali</Button></Link></div>;
  const {quiz,players,names} = query.data;
  const standings = quizStandings(players.map((p) => ({...p,userId:p.user_id,completed:Boolean(p.completed_at)})));
  const q = questions[index];
  const ended = result || me?.completed_at;
  return <div className="space-y-5">
    <h1 className="text-3xl font-bold">{quiz.title}</h1>
    {ended ? <>
      <div className="flex items-center gap-4"><Lumi mood="victory" size={100} /><div><h2 className="text-xl font-bold">Kuis Selesai</h2><p>{result?.correct ?? me?.correct} jawaban benar · {result?.points ?? me?.points} poin</p><p className="font-bold text-primary">{getRank(xp).emoji} {getRank(xp).name}</p></div></div>
      <h2 className="text-xl font-bold">Peringkat Pertandingan</h2>
      <ol className="divide-y">{standings.map((p) => <li key={p.userId} className="flex justify-between py-3"><span>#{p.place} {names.find((n) => n.id===p.userId)?.nick}{p.userId===uid ? " (Kamu)" : ""}</span><b>{p.points} poin</b></li>)}</ol>
      <p className="text-sm text-muted-foreground">{quiz.credited ? "🔥 Semua anggota selesai — streak bersama menyala!" : `${players.filter((p) => p.completed_at).length}/${players.length} selesai · peringkat sementara`}</p>
      {review.map((r,i) => <div key={i} className="flex gap-3 border-t py-4"><Lumi mood={answers[i]===r.answer ? "victory" : wrongReaction(review.slice(0,i+1).filter((a,k) => answers[k]!==a.answer).length)} size={65}/><div><b><MathInline>{r.q}</MathInline></b><p className="text-success"><MathInline>{r.options[r.answer] ?? ""}</MathInline></p><p className="text-sm text-muted-foreground"><MathInline>{r.explain}</MathInline></p></div></div>)}
      <Link to="/teman"><Button>Kembali ke Streak</Button></Link>
    </> : q ? <>
      <div className="flex justify-between font-bold"><span>Soal {index+1}/{questions.length}</span><span>⏱ {Math.floor(left/60)}:{String(left%60).padStart(2,"0")}</span></div>
      <h2 className="text-xl font-bold"><MathInline>{q.q}</MathInline></h2>
      <div className="grid gap-3">{q.options.map((option,k) => <Button key={k} variant={answers[index]===k ? "default":"secondary"} disabled={left===0||busy} className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left" onClick={() => setAnswers((s) => { const a=[...s]; a[index]=k; return a; })}>{"ABCD"[k]}.&nbsp;<MathInline>{option}</MathInline></Button>)}</div>
      <div className="flex justify-between"><Button variant="secondary" disabled={index===0||busy} onClick={() => setIndex((s) => s-1)}>Sebelumnya</Button>{index+1<questions.length && left>0 ? <Button disabled={answers[index]==null} onClick={() => setIndex((s) => s+1)}>Lanjut</Button> : <Button onClick={finish} disabled={busy}>{busy?"Menyimpan…":"Selesai & Lihat Peringkat"}</Button>}</div>
      {left===0 && <p className="text-destructive">Waktu habis. Kirim jawaban sekarang.</p>}
    </> : <>
      <p>{players.length} anggota · {quiz.minutes} menit</p><p className="text-sm text-muted-foreground">Berakhir {new Date(quiz.expires_at).toLocaleString("id-ID")}</p>
      <ul className="divide-y">{players.map((p) => <li key={p.user_id} className="flex justify-between py-3"><b>{names.find((n) => n.id===p.user_id)?.nick}</b><span>{p.completed_at?"✓ Selesai":p.started_at?"Mengerjakan":"Diundang"}</span></li>)}</ul>
      <Button onClick={join} disabled={busy||new Date(quiz.expires_at).getTime()<Date.now()}>{busy?"Membuka…":"Terima & Mulai Kuis"}</Button>
    </>}
  </div>;
}