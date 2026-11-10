import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { Lumi } from "./Lumi";
import { AboutHiLumi } from "./AboutHiLumi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";

const TAKEN = "Email ini sudah terdaftar. Silakan pilih Masuk.";


export function SignIn() {
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [nick, setNick] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Hide the floating "Kenalan yuk" pill once the Tentang section is on screen.
  useEffect(() => {
    const section = document.getElementById("tentang-hilumi")?.closest("section");
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => setShowHint(!entries[0]?.isIntersecting),
      { threshold: 0.08 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTaken(false);
    try {
      if (mode === "daftar") {
        const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: window.location.origin, data: { nick: nick.trim().slice(0, 20) } } });
        if (error) {
          const msg = error.message.toLowerCase();
          if (error.code === "user_already_exists" || error.code === "email_exists" || msg.includes("already registered") || msg.includes("already exists")) { setTaken(true); throw new Error(TAKEN); }
          if (msg.includes("at least")) throw new Error("Kata sandi minimal 6 karakter.");
          if (error.code === "email_address_invalid" || msg.includes("email address")) throw new Error("Alamat email tidak valid.");
          throw error;
        }
        if (data.user && (data.user.identities?.length ?? 0) === 0) { setTaken(true); throw new Error(TAKEN); }
        if (!data.session) {
          const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pass });
          if (e2) throw new Error("Akun dibuat, tapi gagal masuk. Coba pilih Masuk.");
        }
        toast.success("Akun berhasil dibuat, selamat datang!");
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
      <p className="text-muted-foreground">Guru bayangan AI untuk siswa sekolah yang keren dan unik !!!</p>
      <div className="glass w-full space-y-4 rounded-3xl p-5 text-left">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(["masuk", "daftar"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setTaken(false); }} className={`rounded-full py-2 text-sm font-bold ${mode === m ? "bg-lumi text-primary-foreground" : "text-muted-foreground"}`}>
              {m === "masuk" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "daftar" && <Input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Nickname (contoh: RaniPintar)" required maxLength={20} />}
          <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setTaken(false); }} placeholder="Email" required aria-invalid={taken} />
          {taken && (
            <p role="alert" className="rounded-xl bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
              ⚠️ Email ini sudah terdaftar.{" "}
              <button type="button" className="underline" onClick={() => { setMode("masuk"); setTaken(false); }}>Masuk saja</button>
            </p>
          )}
          <div className="relative">
            <Input aria-label="Kata sandi" type={showPassword ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Kata sandi" required autoComplete={mode === "daftar" ? "new-password" : "current-password"} className="pr-12" />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"} title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-lumi text-primary-foreground shadow-glow">{mode === "masuk" ? "Masuk" : "Buat Akun"}</Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">Pengguna HiLumi lama? Masuk atau daftar, lalu buka <b>Profil → Pulihkan progres lama</b>.</p>
      </div>
      <Link to="/admin" className="text-sm text-muted-foreground underline">Masuk sebagai Admin</Link>
      {showHint && (
        <button
          type="button"
          onClick={() => document.getElementById("tentang-hilumi")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="fixed bottom-4 right-3 z-50 rounded-full bg-lumi px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
        >
          Kenalan yuk <ChevronDown className="inline h-3.5 w-3.5 animate-bounce" />
        </button>
      )}
      <AboutHiLumi />
    </div>
  );
}
