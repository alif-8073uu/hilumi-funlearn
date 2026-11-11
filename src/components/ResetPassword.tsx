import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle, Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createMultiplication, canResetPassword, type Multiplication } from "@/lib/password-reset";
import { Lumi } from "./Lumi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function ResetPassword() {
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [question, setQuestion] = useState<Multiplication | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [answer, setAnswer] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    async function verify() {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (recovery && data.user && !error) {
        setQuestion((q) => q ?? createMultiplication());
        setStatus("ready");
        window.history.replaceState(null, "", window.location.pathname);
      } else setStatus("invalid");
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { recovery = true; setTimeout(() => { void verify(); }, 0); }
      if (event === "SIGNED_OUT" && active) setStatus("invalid");
    });
    void verify().catch(() => { if (active) setStatus("invalid"); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !question) return;
    setError("");
    if (!canResetPassword(status === "ready", question, answer)) { setError("Jawaban perkalian belum benar. Coba lagi, ya!"); return; }
    if (password.length < 6) { setError("Kata sandi minimal 6 karakter."); return; }
    if (password !== confirm) { setError("Kedua kata sandi belum sama."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError("Kata sandi belum bisa diubah. Tautan mungkin kedaluwarsa; minta tautan baru dari Lupa password."); return; }
      setStatus("done");
      setPassword(""); setConfirm(""); setAnswer("");
    } catch { setError("Koneksi bermasalah. Coba lagi sebentar."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-10 text-center">
    <Lumi mood={status === "done" ? "victory" : "encouraging"} size={110} />
    <h1 className="mt-3 font-display text-3xl font-bold text-lumi-blue">{status === "done" ? "Kata sandi berhasil diubah!" : "Kata sandi baru"}</h1>
    {status === "checking" ? <p role="status" className="mt-5 flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Memeriksa tautan pemulihan…</p> : status === "invalid" ? <div className="mt-5 space-y-4"><p role="alert" className="text-muted-foreground">Tautan tidak valid atau sudah kedaluwarsa. Buka Lupa password di halaman masuk untuk meminta tautan baru.</p><Button asChild><Link to="/">Kembali ke halaman masuk</Link></Button></div> : status === "done" ? <div className="mt-5 flex flex-col items-center gap-4"><CheckCircle className="h-10 w-10 text-success" /><p className="text-muted-foreground">Sekarang kamu bisa masuk dengan kata sandi baru.</p><Button asChild className="bg-lumi text-primary-foreground"><Link to="/">Lanjut ke HiLumi</Link></Button></div> : <form onSubmit={submit} className="mt-6 w-full space-y-4 text-left">
      <label className="block space-y-2 text-sm font-bold">Kata sandi baru<div className="relative"><Input type={visible ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pr-12" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-0 h-9 w-9" aria-label={visible ? "Sembunyikan kata sandi" : "Lihat kata sandi"} title={visible ? "Sembunyikan kata sandi" : "Lihat kata sandi"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></label>
      <label className="block space-y-2 text-sm font-bold">Ulangi kata sandi baru<Input type={visible ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} /></label>
      <div className="border-y border-accent/40 py-4"><p className="font-display text-lg text-sun">Tantangan kecil dari Lumi</p><label className="mt-2 block space-y-2 text-sm font-bold">{question?.left} × {question?.right} = ?<Input inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value)} required placeholder="Jawaban perkalian" aria-label="Jawaban perkalian" /></label></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full gap-2 bg-lumi text-primary-foreground">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Ubah password</Button>
    </form>}
  </main>;
}