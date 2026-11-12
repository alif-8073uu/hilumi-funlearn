import { useState, type FormEvent } from "react";
import { KeyRound, ArrowLeft, LoaderCircle, CheckCircle } from "lucide-react";
import { checkResetEmail, resetWithAnswers } from "@/lib/reset.functions";
import { createMultiplication, isCorrectAnswer } from "@/lib/password-reset";
import { TIERS, TIER_EMOJI } from "@/lib/game";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

type Step = "email" | "verify" | "done";

export function ForgotPassword({ initialEmail }: { initialEmail: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [nick, setNick] = useState("");
  const [streak, setStreak] = useState("");
  const [tier, setTier] = useState("");
  const [pass, setPass] = useState("");
  const [q, setQ] = useState(createMultiplication);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() { setEmail(initialEmail); setStep("email"); setNick(""); setStreak(""); setTier(""); setPass(""); setAnswer(""); setError(""); setQ(createMultiplication()); }

  async function checkEmail(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      const { exists } = await checkResetEmail({ data: { email: email.trim() } });
      if (exists) setStep("verify"); else setError("Email ini tidak terdaftar di HiLumi. Reset dibatalkan.");
    } catch { setError("Email tidak valid atau koneksi bermasalah."); }
    finally { setBusy(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; setError("");
    if (tier === "") return setError("Pilih rank kamu.");
    if (pass.length < 6) return setError("Kata sandi minimal 6 karakter.");
    if (!isCorrectAnswer(q, answer)) { setQ(createMultiplication()); setAnswer(""); return setError("Jawaban perkalian belum benar. Coba soal baru, ya!"); }
    setBusy(true);
    try {
      await resetWithAnswers({ data: { email: email.trim(), nick, streak: Number(streak) || 0, tier: Number(tier), password: pass } });
      setStep("done");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal mengubah kata sandi."); setQ(createMultiplication()); setAnswer(""); }
    finally { setBusy(false); }
  }

  return <>
    <Button type="button" variant="link" className="w-full text-lumi-blue" onClick={() => { reset(); setOpen(true); }}>Lupa password?</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border-accent/40 bg-card">
        <KeyRound className="h-9 w-9 text-lumi-blue" />
        <DialogTitle className="font-display text-2xl tracking-normal">{step === "done" ? "Kata sandi berhasil diubah!" : "Lupa kata sandi?"}</DialogTitle>
        <DialogDescription className="leading-relaxed">{step === "email" ? "Masukkan email akun HiLumi kamu." : step === "verify" ? "Buktikan ini akunmu dengan menjawab pertanyaan tentang akunmu." : "Sekarang kamu bisa masuk dengan kata sandi baru."}</DialogDescription>
        {step === "email" && <form onSubmit={checkEmail} className="space-y-4">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email yang kamu daftarkan" aria-label="Email akun" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full gap-2 bg-lumi text-primary-foreground">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Lanjutkan</Button>
        </form>}
        {step === "verify" && <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1 text-sm font-bold">1. Apa nickname akunmu?<Input value={nick} onChange={(e) => setNick(e.target.value)} required maxLength={40} /></label>
          <label className="block space-y-1 text-sm font-bold">2. Berapa streak 🔥 kamu sekarang?<Input inputMode="numeric" value={streak} onChange={(e) => setStreak(e.target.value.replace(/\D/g, ""))} required placeholder="Contoh: 0" /></label>
          <label className="block space-y-1 text-sm font-bold">3. Apa rank kamu sekarang?
            <select value={tier} onChange={(e) => setTier(e.target.value)} required className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Pilih rank</option>
              {TIERS.map((t, i) => <option key={t} value={i}>{TIER_EMOJI[i]} {t}</option>)}
            </select></label>
          <label className="block space-y-1 text-sm font-bold">Kata sandi baru<Input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} /></label>
          <label className="block space-y-1 border-t border-accent/40 pt-3 text-sm font-bold"><span className="font-display text-sun">Tantangan Lumi:</span> {q.left} × {q.right} = ?<Input inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} required aria-label="Jawaban perkalian" /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => { setStep("email"); setError(""); }}><ArrowLeft className="h-4 w-4" /></Button>
          <Button type="submit" disabled={busy} className="flex-1 gap-2 bg-lumi text-primary-foreground">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Selesai</Button></div>
        </form>}
        {step === "done" && <div className="flex flex-col items-center gap-3"><CheckCircle className="h-10 w-10 text-success" /><Button className="bg-lumi text-primary-foreground" onClick={() => setOpen(false)}>Masuk sekarang</Button></div>}
      </DialogContent>
    </Dialog>
  </>;
}
