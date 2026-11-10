import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { Lumi } from "./Lumi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const G = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>`;

export function SignIn() {
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Gagal masuk dengan Google");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "daftar") {
        const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: window.location.origin, data: { nick: nick.trim().slice(0, 20) } } });
        if (error) {
          const msg = error.message.toLowerCase();
          if (error.code === "user_already_exists" || msg.includes("already registered") || msg.includes("already exists")) throw new Error("Email ini sudah terdaftar. Silakan pilih Masuk.");
          if (error.code === "weak_password" || msg.includes("password")) throw new Error("Kata sandi terlalu pendek, coba minimal 6 karakter.");
          throw error;
        }
        if (data.user && (data.user.identities?.length ?? 0) === 0) throw new Error("Email ini sudah terdaftar. Silakan pilih Masuk.");
        if (data.session) toast.success("Akun berhasil dibuat, selamat datang!");
        else setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw new Error("Email atau kata sandi salah.");
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Terjadi kesalahan"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-4 text-center">
      <Lumi mood="happy" size={150} />
      <h1 className="text-4xl font-bold">Hi<span className="text-lumi-blue">Lumi</span></h1>
      <p className="text-muted-foreground">Guru bayangan AI untuk siswa SMP se-Kota Bandung. Progresmu tersimpan aman di akunmu.</p>
      <div className="glass w-full space-y-4 rounded-3xl p-5 text-left">
        {sent ? (
          <p className="text-center font-bold">Cek email <span className="text-primary">{email}</span> lalu klik tautan konfirmasi untuk mengaktifkan akunmu. 📬</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(["masuk", "daftar"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full py-2 text-sm font-bold ${mode === m ? "bg-lumi text-primary-foreground" : "text-muted-foreground"}`}>
                  {m === "masuk" ? "Masuk" : "Daftar"}
                </button>
              ))}
            </div>
            <Button type="button" variant="google" onClick={google} className="w-full">
              <span aria-hidden="true" className="h-[18px] w-[18px]" dangerouslySetInnerHTML={{ __html: G }} />
              Lanjutkan dengan Google
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />atau dengan email<span className="h-px flex-1 bg-border" /></div>
            <form onSubmit={submit} className="space-y-3">
              {mode === "daftar" && <Input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Nickname (contoh: RaniPintar)" required maxLength={20} />}
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
              <div className="relative">
                <Input aria-label="Kata sandi" type={showPassword ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Kata sandi" required autoComplete={mode === "daftar" ? "new-password" : "current-password"} className="pr-12" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"} title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-lumi text-primary-foreground shadow-glow">{mode === "masuk" ? "Masuk" : "Buat Akun"}</Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">Sudah punya akun HiLumi lama? Pilih <b>Daftar</b> dengan email yang sama dan buat kata sandi baru, atau pakai Google. Setelah emailmu terverifikasi, progresmu otomatis kembali.</p>
          </>
        )}
      </div>
      <Link to="/admin" className="text-sm text-muted-foreground underline">Masuk sebagai Admin</Link>
    </div>
  );
}
