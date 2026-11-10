import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Lumi } from "@/components/Lumi";
import { Button } from "@/components/ui/button";
import { MaterialForm } from "@/components/MaterialForm";
import { VoiceButton } from "@/components/VoiceButton";
import { chatLumi } from "@/lib/ai.functions";
import { buildMaterial } from "@/lib/extract";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/belajar")({
  head: () => ({
    meta: [
      { title: "Belajar Bareng Lumi — HiLumi" },
      { name: "description", content: "Tanya PR dengan petunjuk bertahap, jelaskan seperti umur 10 tahun, dan mode panik ujian." },
      { property: "og:title", content: "Belajar Bareng Lumi — HiLumi" },
      { property: "og:description", content: "Tanya PR bertahap, penjelasan simpel, dan mode panik ujian." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Belajar,
});

const MODES = [
  { id: "biasa", label: "Belajar Biasa" },
  { id: "pr", label: "Tanya PR" },
  { id: "umur10", label: "Umur 10 Tahun" },
  { id: "panik", label: "Panik Ujian" },
] as const;
type Mode = (typeof MODES)[number]["id"];
type Msg = { role: "user" | "assistant"; text: string };

function Belajar() {
  const [mode, setMode] = useState<Mode>("biasa");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [material, setMaterial] = useState<Awaited<ReturnType<typeof buildMaterial>> | undefined>();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const hints = msgs.filter((m) => m.role === "assistant").length;

  async function send(override?: string) {
    const q = (override ?? text).trim();
    if (busy || (!q && !files.length)) return;
    setBusy(true);
    try {
      let mat = material;
      if (!msgs.length) { mat = await buildMaterial(q, files); setMaterial(mat); }
      const history = [...msgs, { role: "user" as const, text: msgs.length ? q : mat!.text }];
      setMsgs([...msgs, { role: "user", text: q || "(materi terlampir)" }]);
      setText(""); setFiles([]);
      const r = await chatLumi({ data: { mode, history, material: mat } });
      setMsgs((m) => [...m, { role: "assistant", text: r.text }]);
      actions.learned();
      actions.addXp(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghubungi Lumi");
      setMsgs((m) => (m.length && m[m.length - 1]?.role === "user" ? m.slice(0, -1) : m));
    } finally { setBusy(false); }
  }

  return (
    <Shell>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button key={m.id} size="sm" variant={mode === m.id ? "default" : "secondary"} onClick={() => { setMode(m.id); setMsgs([]); setMaterial(undefined); }}>
            {m.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center text-center">
            <Lumi mood="happy" size={120} />
            <p className="font-bold">{mode === "pr" ? "Kirim soal PR-mu. Lumi kasih petunjuk dulu ya, bukan jawaban!" : "Mau belajar apa hari ini? Tulis topik atau unggah catatanmu."}</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-lumi px-4 py-3 text-primary-foreground" : "flex max-w-[95%] gap-2"}>
            {m.role === "assistant" && <div className="shrink-0"><Lumi mood="happy" size={36} /></div>}
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-muted-foreground"><Lumi mood="thinking" size={36} /> Lumi sedang berpikir…</div>}
        <div ref={end} />
      </div>

      <div className="sticky bottom-20 mt-4">
        {msgs.length === 0 ? (
          <MaterialForm text={text} setText={setText} files={files} setFiles={setFiles}>
            <Button onClick={() => send()} disabled={busy} className="w-full bg-lumi text-primary-foreground">Mulai</Button>
          </MaterialForm>
        ) : (
          <div className="glass flex gap-2 rounded-full p-2">
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Balas Lumi…" className="flex-1 bg-transparent px-3 outline-none" />
            <VoiceButton disabled={busy} onText={(t) => setText((cur) => (cur.trim() ? `${cur.trim()} ${t}` : t))} />
            {mode === "pr" && (
              <Button size="sm" variant="secondary" disabled={hints < 3 || busy} onClick={() => send("MINTA KUNCI JAWABAN")} title="Aktif setelah 3 petunjuk">
                <KeyRound className="h-4 w-4" /> {hints < 3 ? `${hints}/3` : "Kunci"}
              </Button>
            )}
            <Button size="icon" className="rounded-full" onClick={() => send()} disabled={busy}><Send className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
