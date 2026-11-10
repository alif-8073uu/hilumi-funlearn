import { useId, type CSSProperties, type ReactNode } from "react";
import { Bot, FileUp, Layers, Swords, Flame, Sparkles, Target, Cpu, ChevronDown } from "lucide-react";
import { Lumi } from "./Lumi";

type Tone = "primary" | "accent" | "sun" | "lumi-blue" | "coral" | "success";
type Shape = "round" | "tall" | "flat" | "frilly";

/** Decorative jellyfish in several shapes; colours come from theme tokens. */
function Jelly({ tone = "primary", shape = "round", size = 70, className = "", style }: { tone?: Tone; shape?: Shape; size?: number; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  const c = `var(--${tone})`;
  const bell = {
    round: "M10 50 Q10 8 50 8 Q90 8 90 50 Q80 58 70 52 Q60 60 50 52 Q40 60 30 52 Q20 58 10 50Z",
    tall: "M18 56 Q14 2 50 2 Q86 2 82 56 Q66 62 50 56 Q34 62 18 56Z",
    flat: "M4 44 Q12 18 50 18 Q88 18 96 44 Q84 52 72 46 Q62 54 50 46 Q38 54 28 46 Q16 52 4 44Z",
    frilly: "M12 48 Q12 10 50 10 Q88 10 88 48 Q83 54 78 48 Q73 54 68 48 Q63 54 58 48 Q53 54 48 48 Q43 54 38 48 Q33 54 28 48 Q23 54 18 48 Q15 52 12 48Z",
  }[shape];
  const tents = shape === "flat"
    ? ["M30 48 Q24 70 32 90 Q38 106 30 120", "M50 48 Q56 72 48 94 Q42 110 50 126", "M70 48 Q76 70 68 90 Q62 106 70 120"]
    : ["M28 54 Q20 76 30 96 Q36 110 28 124", "M44 56 Q40 80 46 100 Q50 114 44 130", "M56 56 Q60 80 54 100 Q50 114 56 130", "M72 54 Q80 76 70 96 Q64 110 72 124"];
  return (
    <svg viewBox="0 0 100 135" width={size} height={size * 1.35} className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id={`g${id}`} cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="var(--foreground)" stopOpacity=".85" />
          <stop offset=".45" stopColor={c} stopOpacity=".9" />
          <stop offset="1" stopColor={c} stopOpacity=".55" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="40" r="46" fill={c} opacity=".12" />
      {tents.map((d, i) => (
        <path key={i} d={d} className="lumi-t" style={{ animationDelay: `-${i * 0.5}s` }} stroke={c} strokeOpacity=".75" strokeWidth={shape === "frilly" ? 3 : 5} fill="none" strokeLinecap="round" />
      ))}
      {shape === "frilly" && <path d="M38 52 Q34 70 40 84 M62 52 Q66 70 60 84" stroke={c} strokeWidth={9} strokeOpacity=".4" fill="none" strokeLinecap="round" className="lumi-t" />}
      <path d={bell} fill={`url(#g${id})`} />
      <ellipse cx="34" cy={shape === "flat" ? 27 : 22} rx="10" ry="4.5" fill="var(--foreground)" opacity=".55" transform="rotate(-25 34 24)" />
      <circle cx="40" cy={shape === "flat" ? 36 : 36} r="3.2" fill="var(--background)" />
      <circle cx="60" cy={shape === "flat" ? 36 : 36} r="3.2" fill="var(--background)" />
      <path d="M45 42 Q50 46 55 42" stroke="var(--background)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Bubble({ s, className = "", style }: { s: number; className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`about-bubble bubble-bob absolute ${className}`} style={{ width: s, height: s, ...style }} />;
}

const FEATURES: { icon: typeof Bot; title: string; text: string; tone: Tone }[] = [
  { icon: Bot, title: "Tutor AI Interaktif (Lumi)", text: "Maskot ubur-ubur pintar yang membimbing pengerjaan tugas secara bertahap menggunakan petunjuk logis.", tone: "lumi-blue" },
  { icon: FileUp, title: "Unggah Dokumen Fleksibel", text: "Siswa dapat memasukkan materi belajar melalui teks, foto catatan, file PDF, dokumen Word, maupun file presentasi PPT secara instan.", tone: "accent" },
  { icon: Layers, title: "Kuis & Kartu Kilat Kustom", text: "Pembuatan flashcard otomatis dan kuis latihan dengan pengaturan jumlah soal dan durasi waktu sesuai kebutuhan belajar.", tone: "primary" },
  { icon: Swords, title: "Mode Duel & Komunitas", text: "Fitur interaktif untuk menantang teman secara langsung menggunakan materi pelajaran yang sama.", tone: "coral" },
  { icon: Flame, title: "Sistem Streak & Rank", text: "Menjaga konsistensi belajar harian lewat pelacak streak 24 jam dan sistem kenaikan tingkat (rank) berjenjang tanpa adanya reset season.", tone: "sun" },
];

function Heading({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h2 className="about-title flex items-center justify-center gap-2 text-3xl sm:text-4xl">
      {icon}{children}
    </h2>
  );
}

export function AboutHiLumi() {
  return (
    <section aria-labelledby="tentang-hilumi" className="relative mt-16 w-full overflow-hidden pb-16 text-left">
      {/* drifting decorations */}
      <Jelly tone="primary" shape="tall" size={64} className="jelly-drift absolute -left-2 top-10 opacity-80" style={{ "--dur": "8s" } as CSSProperties} />
      <Jelly tone="accent" shape="flat" size={78} className="jelly-drift absolute -right-4 top-64 opacity-75" style={{ "--dur": "9s", "--delay": "-3s" } as CSSProperties} />
      <Jelly tone="sun" shape="frilly" size={52} className="jelly-drift absolute left-1 top-[46%] opacity-70" style={{ "--dur": "7s", "--delay": "-2s" } as CSSProperties} />
      <Jelly tone="coral" shape="round" size={56} className="jelly-drift absolute -right-1 top-[62%] opacity-70" style={{ "--dur": "10s", "--delay": "-5s" } as CSSProperties} />
      <Jelly tone="success" shape="tall" size={46} className="jelly-drift absolute left-4 bottom-28 opacity-70" style={{ "--dur": "8.5s", "--delay": "-1s" } as CSSProperties} />
      {[
        [14, "left-[12%] top-4", 4], [26, "right-[14%] top-16", 6], [10, "left-[30%] top-52", 5],
        [34, "right-2 top-[38%]", 7], [16, "left-[8%] top-[56%]", 5.5], [22, "right-[22%] top-[74%]", 6.5],
        [12, "left-[40%] bottom-10", 4.5], [30, "left-2 bottom-2", 7.5], [18, "right-6 bottom-16", 5],
      ].map(([s, pos, d], i) => (
        <Bubble key={i} s={s as number} className={pos as string} style={{ "--dur": `${d}s`, "--delay": `-${i * 0.7}s` } as CSSProperties} />
      ))}

      <div className="relative z-10 mx-auto max-w-md space-y-10 px-2">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Kenalan yuk</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>

        {/* Tentang */}
        <div className="about-reveal space-y-4 text-center">
          <Heading><span id="tentang-hilumi">Tentang HiLumi</span></Heading>
          <div className="about-card rounded-3xl p-5 text-left leading-relaxed">
            <p>
              <b className="text-lumi-blue">HiLumi</b> adalah platform web belajar interaktif berbasis kecerdasan buatan (<i className="text-accent">Artificial Intelligence</i>) yang dirancang khusus untuk membantu pelajar mengatasi <b className="text-sun">kejenuhan belajar</b>, kesulitan memahami materi sekolah, tidak konsisten dalam belajar, dan mengatasi rasa panik menghadapi ujian.
            </p>
          </div>
          <div className="about-card relative rounded-3xl p-5 text-left leading-relaxed">
            <Sparkles className="absolute -top-3 right-5 h-6 w-6 text-sun" />
            <p>
              Terinspirasi dari beberapa aplikasi pendidikan populer seperti <b className="text-success">Duolingo</b>, <b className="text-accent">GauthAi</b>, dan pembantu pekerjaan rumah lainnya, serta aplikasi seperti <b className="text-primary">TikTok</b>. HiLumi mengubah kegiatan belajar mandiri maupun kelompok menjadi pengalaman yang seru, di mana siswa sekarang bisa menanyakan pekerjaan rumah, pelajaran sekolah, serta duel secara individu dengan AI dan kuis bersama teman-teman sehingga belajar tidak menjadi hal yang membosankan.
            </p>
          </div>
        </div>

        {/* Misi */}
        <div className="about-reveal space-y-4 text-center">
          <Heading icon={<Target className="h-7 w-7 text-primary" />}>Misi HiLumi</Heading>
          <blockquote className="relative rounded-3xl bg-lumi p-[2px] shadow-glow">
            <div className="rounded-[calc(1.5rem-2px)] bg-card px-6 py-6">
              <span aria-hidden="true" className="absolute left-4 top-0 font-[family-name:var(--font-fun)] text-6xl leading-none text-primary">“</span>
              <p className="font-display text-lg font-semibold leading-relaxed">
                Menghadirkan pendamping belajar digital yang <span className="text-lumi-blue">sabar</span>, <span className="text-success">suportif</span>, <span className="text-sun">konsisten</span>, serta mendorong siswa untuk memahami konsep pelajaran secara mendalam melalui pendekatan bimbingan interaktif alih-alih sekadar memberikan contekan.
              </p>
            </div>
          </blockquote>
        </div>

        {/* Fitur Spesial */}
        <div className="about-reveal space-y-4 text-center">
          <Heading icon={<Flame className="h-7 w-7 text-flame" />}>Fitur Spesial</Heading>
          <div className="about-card relative overflow-hidden rounded-3xl p-5 text-left">
            <div className="flex items-start gap-3">
              <div className="shrink-0"><Lumi mood="victory" size={70} /></div>
              <p className="leading-relaxed">
                HiLumi menerapkan sistem <b className="text-flame">Streak</b> dengan karakter yang unik agar pelajar dapat meningkatkan minat belajar mereka. Berbeda dengan yang lain, fitur streak ini dinyalakan dengan membuat duel dengan AI (<b className="text-sun">Streak Individu</b>) dan menantang teman untuk mengerjakan kuis bersama (<b className="text-primary">Streak Duo dan Grup</b>) sehingga pengalaman belajar lebih seru dan menyenangkan :)
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              {[["🔥", "Individu", "bg-flame"], ["👯", "Duo", "bg-lumi"], ["🪼", "Grup", "bg-accent"]].map(([e, t, bg]) => (
                <div key={t} className={`${bg} rounded-2xl py-2 text-primary-foreground`}><div className="text-xl">{e}</div>{t}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Fitur Unggulan */}
        <div className="space-y-4">
          <div className="about-reveal text-center"><Heading icon={<Sparkles className="h-7 w-7 text-sun" />}>Fitur Unggulan</Heading></div>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, title, text, tone }, i) => (
              <div key={title} className={`about-card about-reveal flex gap-4 rounded-3xl p-4 ${i % 2 ? "sm:ml-6" : "sm:mr-6"}`}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `color-mix(in oklab, var(--${tone}) 22%, transparent)`, color: `var(--${tone})` }}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold" style={{ color: `var(--${tone})` }}>{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pemanfaatan AI */}
        <div className="about-reveal space-y-4 text-center">
          <Heading icon={<Cpu className="h-7 w-7 text-accent" />}>Pemanfaatan AI</Heading>
          <div className="about-card rounded-3xl p-5 text-left text-sm leading-relaxed">
            <p>
              Website ini dikembangkan secara mandiri untuk <b className="text-sun">Lomba Kreativitas Siswa Tingkat SMP Kota Bandung dalam Bidang Pendidikan</b>. Proses pembuatan website ini memanfaatkan teknologi AI (seperti <b className="text-primary">Lovable</b>, <b className="text-coral">Claude</b>, dan <b className="text-lumi-blue">Google Gemini API</b>) untuk perancangan struktur kode, desain antarmuka, pembuatan aset visual, serta logika pemrosesan kecerdasan buatan, di mana seluruh karya dan alur sistem dikuasai penuh serta disesuaikan secara kreatif.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pt-4 text-center">
          <Lumi mood="happy" size={90} />
          <p className="about-title text-2xl">Yuk belajar bareng Lumi!</p>
        </div>
      </div>
    </section>
  );
}
