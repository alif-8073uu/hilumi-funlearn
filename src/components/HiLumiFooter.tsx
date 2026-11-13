import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Github, Instagram, Phone, ShieldCheck, Sparkles, Cpu, ArrowUpRight } from "lucide-react";
import { Lumi } from "./Lumi";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { PET_STAGES, TIERS, TIER_EMOJI, XP_PER_SUBRANK } from "@/lib/game";

const INFO = {
  tentang: { title: "Tentang HiLumi", text: "HiLumi adalah pendamping belajar AI yang seru, suportif, dan interaktif. Belajar mandiri maupun bersama teman menjadi lebih menyenangkan dengan Lumi si ubur-ubur." },
  misi: { title: "Misi HiLumi", text: "Menghadirkan pendamping belajar digital yang sabar, suportif, dan konsisten; membantu siswa memahami konsep pelajaran, bukan sekadar mendapatkan jawaban." },
  fitur: { title: "Fitur Unggulan", text: "Belajar bersama AI, unggah materi, kuis mandiri dan duel AI, kuis duo/grup, flashcard, pembahasan soal, chat teman, serta streak, rank, dan evolusi pet Lumi." },
};
type Topic = keyof typeof INFO | "panduan";

export function HiLumiFooter() {
  const [topic, setTopic] = useState<Topic | null>(null);
  function openInfo(key: keyof typeof INFO) {
    const section = document.getElementById(`${key}-hilumi`);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    else setTopic(key);
  }
  return (
    <footer className="hilumi-footer relative z-10 mt-10 border-t border-accent/30" aria-label="Footer HiLumi">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="grid gap-9 md:grid-cols-[1.2fr_1fr_1.2fr]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Lumi mood="happy" size={62} className="shrink-0" />
              <div><h2 className="font-fun text-3xl">Hi<span className="text-lumi-blue">Lumi</span> 🪼</h2><p className="mt-1 text-xs font-bold text-accent">v1.0.0 · 2026</p></div>
            </div>
            <p className="mt-3 max-w-xs leading-relaxed">Pendamping belajar AI yang seru, suportif, dan interaktif.</p>
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
              {(Object.keys(INFO) as (keyof typeof INFO)[]).map((key) => <Button key={key} variant="link" className="h-auto p-0 text-sm text-lumi-blue" onClick={() => openInfo(key)}>{INFO[key].title.replace("Misi HiLumi", "Misi")}</Button>)}
            </div>
          </div>
          <nav aria-label="Tautan cepat" className="min-w-0">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-sun"><Sparkles className="h-4 w-4" />Jelajahi & Bermain</h3>
            <ul className="space-y-3 text-sm">
              {([{ to: "/", text: "Lobby Belajar" }, { to: "/kuis", text: "Duel & Kuis Grup · Riwayat Skor" }, { to: "/teman", text: "Koleksi Pet Lumi · Duo & Grup" }, { to: "/belajar", text: "Belajar Bersama Lumi" }] as const).map(({ to, text }) => <li key={to}><Link to={to} className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-accent">{text}<ArrowUpRight className="h-3 w-3 shrink-0" /></Link></li>)}
            </ul>
            <Button onClick={() => setTopic("panduan")} className="mt-5 h-auto w-full justify-start whitespace-normal bg-lumi px-3 py-3 text-left text-primary-foreground"><BookOpen className="h-4 w-4 shrink-0" /><span>Cara Bermain & Menaikkan Rank Pet</span></Button>
          </nav>
          <div className="min-w-0">
            <h3 className="mb-4 text-lg font-bold text-primary">Di Balik HiLumi</h3>
            <p className="font-bold">Alif Jabbar Nursalam</p><p className="text-sm text-lumi-blue">SMPN 14 Bandung</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Dikembangkan untuk Lomba Kreativitas Siswa Tingkat SMP Kota Bandung dalam Bidang Pendidikan.</p>
            <address className="mt-4 space-y-2 text-sm not-italic">
              <a className="flex items-center gap-2 hover:text-accent" href="tel:+6281315022052"><Phone className="h-4 w-4 text-accent" />+62 81315022052</a>
              <a className="flex items-center gap-2 hover:text-primary" href="https://www.instagram.com/alif_jabbar_/" target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4 text-primary" />alif_jabbar_</a>
              <a className="flex items-center gap-2 hover:text-sun" href="https://github.com/alif-8073uu" target="_blank" rel="noopener noreferrer"><Github className="h-4 w-4 text-sun" />alif-8073uu</a>
            </address>
          </div>
        </div>
        <div className="mt-8 grid gap-6 border-t border-border/60 pt-6 text-sm md:grid-cols-2">
          <div><h3 className="mb-2 flex items-center gap-2 font-bold text-success"><ShieldCheck className="h-4 w-4" />Ramah Anak & Privasi</h3><p className="leading-relaxed text-muted-foreground">Dirancang khusus siswa sekolah — tanpa pelacakan iklan komersial. Materi diarahkan untuk edukasi ramah anak. Gunakan AI sebagai pendamping eksplorasi, bukan pengganti guru.</p></div>
          <div><h3 className="mb-2 flex items-center gap-2 font-bold text-accent"><Cpu className="h-4 w-4" />Inovasi & Teknologi</h3><p className="leading-relaxed text-muted-foreground">Didukung oleh React, AI Gateway, & Database Realtime. Menggabungkan Gamifikasi, Peer Motivation (Streak Bersama), dan Adaptive Learning.</p></div>
        </div>
        <div className="mt-6 border-t border-border/60 pt-5 text-center text-xs leading-relaxed text-muted-foreground">
          <p>Dikembangkan dengan bantuan AI dan disesuaikan secara kreatif oleh pembuat.</p>
          <p>Jawaban AI dapat keliru; periksa kembali dengan buku atau guru.</p>
          <p className="mt-3 font-bold text-foreground">© 2026 HiLumi · Dibuat dengan semangat belajar ✨</p>
        </div>
      </div>
      <Dialog open={topic !== null} onOpenChange={(open) => { if (!open) setTopic(null); }}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border-accent/40 bg-card">
          <DialogHeader><DialogTitle className="pr-5 font-display text-2xl text-lumi-blue">{topic === "panduan" ? "Cara Bermain & Menaikkan Rank Pet" : topic ? INFO[topic].title : "HiLumi"}</DialogTitle><DialogDescription>{topic === "panduan" ? "Belajar, kumpulkan XP, dan rawat Lumi dengan konsistensi." : "Pendamping belajar bersama Lumi."}</DialogDescription></DialogHeader>
          {topic === "panduan" ? <div className="space-y-6 text-sm leading-relaxed">
            <div className="flex items-center gap-4"><Lumi mood="happy" size={72} className="shrink-0" /><p>Rank akun naik dengan <b className="text-sun">XP</b>, sedangkan pet berevolusi dengan <b className="text-flame">streak</b>. Keduanya berbeda, tetapi sama-sama menghargai semangat belajarmu!</p></div>
            <section><h3 className="mb-2 text-lg font-bold text-accent">01 · Mulai bermain</h3><ol className="list-decimal space-y-2 pl-5"><li>Daftar atau masuk, lalu pilih Belajar untuk bertanya kepada Lumi atau memasukkan materi.</li><li>Buka Kuis & Duel, pilih materi dan mode permainan, lalu kerjakan soal. Lihat benar/salah, pembahasan, dan hasil di Riwayat Kuis.</li><li>Di Teman, buat duo/grup dan undang teman mengerjakan kuis bersama. Chat hanya untuk komunikasi dan tidak menyalakan streak.</li></ol></section>
            <section><h3 className="mb-2 text-lg font-bold text-sun">02 · Naikkan rank akun</h3><p>Kumpulkan XP dengan menyelesaikan kuis. Setiap {XP_PER_SUBRANK} XP menaikkan satu subrank. Tiap tingkatan memiliki subrank I–V; pantau progres di Profil.</p><div className="mt-3 flex flex-wrap gap-2">{TIERS.map((tier, i) => <span key={tier} className="rounded-md border border-sun/25 bg-sun/10 px-2 py-1 font-bold">{TIER_EMOJI[i]} {tier}</span>)}</div></section>
            <section><h3 className="mb-2 text-lg font-bold text-primary">03 · Evolusikan pet Lumi</h3><p>Jaga streak dengan rutin menyelesaikan kegiatan belajar dan duel AI. Untuk duo/grup, semua anggota harus menyelesaikan kuis undangan; mengirim pesan saja tidak dihitung.</p><ul className="mt-3 divide-y divide-border rounded-lg border border-border">{PET_STAGES.map((stage) => <li key={stage.id} className="flex items-center justify-between gap-3 px-3 py-2"><span>{stage.name}</span><span className="shrink-0 font-bold text-flame">{stage.days} streak</span></li>)}</ul><p className="mt-3 text-muted-foreground">Jangan biarkan streak tidak aktif lebih dari 24 jam. Periksa kondisi dan pilihan pemulihan di Lobby atau Profil.</p></section>
          </div> : topic ? <p className="leading-relaxed">{INFO[topic].text}</p> : null}
        </DialogContent>
      </Dialog>
    </footer>
  );
}