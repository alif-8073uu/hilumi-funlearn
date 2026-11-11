import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Flame, Layers, MessageCircle, Sparkles, Swords, Users } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import { Lumi, type LumiMood } from "./Lumi";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const STEPS: { title: string; text: string; tip: string; icon: typeof Sparkles; tone: string; mood: LumiMood }[] = [
  { title: "Selamat datang di HiLumi!", text: "Hai! Aku Lumi, ubur-ubur teman belajarmu. Yuk, kenalan dengan tempat bertanya, berlatih, dan belajar bareng teman!", tip: "Belajar pelan-pelan juga boleh. Aku siap menemanimu!", icon: Sparkles, tone: "text-lumi-blue", mood: "happy" },
  { title: "Belajar bareng Lumi", text: "Di menu Belajar, tanyakan PR atau materi yang belum kamu pahami. Lumi membimbingmu dengan petunjuk bertahap, penjelasan sederhana, dan bantuan saat panik ujian.", tip: "Kirim teks, foto, PDF, Word, atau PPT. Maksimal 8 MB per file, paling banyak 4 file.", icon: MessageCircle, tone: "text-accent", mood: "thinking" },
  { title: "Kuis & duel AI", text: "Uji pemahaman lewat kuis mandiri atau tantang bot AI dari materi belajarmu. Atur jumlah soal dan waktu sesuai kebutuhan.", tip: "Setiap jawaban langsung menunjukkan benar atau salah. Jawaban yang sudah dipilih akan terkunci.", icon: Swords, tone: "text-coral", mood: "encouraging" },
  { title: "Lihat lagi pembahasannya", text: "Setelah kuis, lihat jawabanmu, kunci jawaban, dan pembahasan. Di menu Kuis, riwayat menyimpan 10 kuis terakhir, termasuk kuis mandiri, AI, duo, dan grup.", tip: "Skor peserta kuis bersama diperbarui langsung saat teman menjawab.", icon: BookOpen, tone: "text-success", mood: "happy" },
  { title: "Kartu Kilat Lumi", text: "Di menu Flashcard, ubah materi menjadi kartu tanya-jawab. Balik kartunya untuk melihat jawaban, lalu ulangi materi yang masih sulit.", tip: "Cocok untuk mengingat istilah, konsep, dan rumus sebelum ujian!", icon: Layers, tone: "text-primary", mood: "thinking" },
  { title: "Seru bareng teman", text: "Di menu Teman, buat duo atau grup, undang teman mengerjakan kuis bersama, dan saling menyemangati lewat chat serta stiker.", tip: "Chat hanya untuk komunikasi. Streak bersama menyala setelah semua anggota menyelesaikan kuis yang diundang, bukan karena mengirim pesan.", icon: Users, tone: "text-accent", mood: "laughing" },
  { title: "Rawat streak & naik rank", text: "Selesaikan duel AI untuk menjaga streak individu. Kumpulkan XP untuk naik rank dan lihat ubur-uburmu berkembang. Di Profil, kamu bisa melihat identitas dan progres belajarmu.", tip: "Siap mulai? Pilih kegiatan favoritmu di Lobby. Semangat, aku percaya kamu bisa!", icon: Flame, tone: "text-sun", mood: "victory" },
];

export function WelcomeTour() {
  const pending = useStore((s) => s.onboardingPending);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  if (!pending || !current) return null;
  const Icon = current.icon;
  const last = step === STEPS.length - 1;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) actions.finishOnboarding(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md gap-0 overflow-y-auto rounded-3xl border-accent/40 bg-card p-0 shadow-glow">
        <div className="flex items-center gap-2 border-b px-6 py-4 pr-12 text-sm font-bold text-lumi-blue"><Sparkles className="h-4 w-4" />Kenalan bareng Lumi<span className="ml-auto text-muted-foreground">{step + 1}/{STEPS.length}</span></div>
        <div className="px-6 pb-5 pt-4 text-center">
          <div className="relative mx-auto flex h-40 items-center justify-center" aria-hidden="true">
            <Lumi mood={current.mood} size={118} />
            <span className={`absolute right-8 top-7 flex h-10 w-10 items-center justify-center rounded-full bg-secondary ${current.tone}`}><Icon className="h-5 w-5" /></span>
          </div>
          <div key={step} className="chat-pop min-h-52">
            <DialogTitle className={`font-display text-2xl leading-tight tracking-normal ${current.tone}`}>{current.title}</DialogTitle>
            <DialogDescription className="mt-3 text-base leading-relaxed text-foreground">{current.text}</DialogDescription>
            <p className="mt-4 border-l-2 border-accent pl-3 text-left text-sm leading-relaxed text-muted-foreground">{current.tip}</p>
          </div>
          <div className="my-5 flex justify-center gap-1.5" aria-label={`Langkah ${step + 1} dari ${STEPS.length}`}>
            {STEPS.map((s, i) => <span key={s.title} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-muted"}`} />)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => step === 0 ? actions.finishOnboarding() : setStep(step - 1)}>{step === 0 ? "Lewati" : <><ArrowLeft className="h-4 w-4" />Kembali</>}</Button>
            <Button className="gap-2 bg-lumi text-primary-foreground" onClick={() => last ? actions.finishOnboarding() : setStep(step + 1)}>{last ? "Mulai belajar" : "Lanjut"}{last ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}