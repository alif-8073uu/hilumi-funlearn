import { useState, type FormEvent } from "react";
import { Mail, ArrowLeft, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

export function ForgotPassword({ initialEmail }: { initialEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) {
        setError(error.status === 429 ? "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi." : "Tautan belum bisa dikirim. Periksa email dan coba lagi.");
      } else setSent(true);
    } catch { setError("Koneksi bermasalah. Coba lagi sebentar."); }
    finally { setBusy(false); }
  }

  return <>
    <Button type="button" variant="link" className="w-full text-lumi-blue" onClick={() => { setEmail(initialEmail); setSent(false); setError(""); setOpen(true); }}>Lupa password?</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-3xl border-accent/40 bg-card">
        <Mail className="h-9 w-9 text-lumi-blue" />
        <DialogTitle className="font-display text-2xl tracking-normal">Lupa kata sandi?</DialogTitle>
        <DialogDescription className="leading-relaxed">Masukkan email akun HiLumi. Buka tautan dari email untuk membuat kata sandi baru.</DialogDescription>
        {sent ? <div className="space-y-4">
          <p role="status" className="text-sm leading-relaxed text-success">Jika email ini terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan spam. Email yang tidak terdaftar tidak dapat digunakan untuk mengubah kata sandi.</p>
          <Button variant="ghost" onClick={() => setSent(false)}><ArrowLeft className="h-4 w-4" />Ganti email</Button>
        </div> : <form onSubmit={send} className="space-y-4">
          <label className="block space-y-2 text-sm font-bold">Email akun<Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email yang kamu daftarkan" /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full gap-2 bg-lumi text-primary-foreground">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Kirim tautan pemulihan</Button>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}