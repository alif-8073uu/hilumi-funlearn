import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { recordWav, transcribeAudio, type Recording } from "@/lib/voice";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 120;

/** Mic button: tap to talk, tap again to stop; the spoken words are handed to onText. */
export function VoiceButton({ onText, onPartial, disabled, className, label }: {
  onText: (text: string) => void;
  onPartial?: (text: string) => void;
  disabled?: boolean;
  className?: string;
  label?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "rec" | "busy">("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const rec = useRef<Recording | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => { rec.current?.cancel(); abort.current?.abort(); }, []);

  useEffect(() => {
    if (phase !== "rec") return;
    const started = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSecs(s);
      setLevel(rec.current?.level() ?? 0);
      if (s >= MAX_SECONDS) void stop();
    }, 150);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { toast.error("Browser ini belum mendukung rekaman suara."); return; }
    try {
      rec.current = await recordWav();
      setSecs(0);
      setPhase("rec");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      toast.error(name === "NotAllowedError" ? "Izinkan akses mikrofon dulu ya." : name === "NotFoundError" ? "Mikrofon tidak ditemukan." : "Mikrofon tidak bisa dipakai.");
    }
  }

  async function stop() {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setPhase("busy");
    try {
      const file = await r.stop();
      abort.current = new AbortController();
      const text = await transcribeAudio(file, onPartial, abort.current.signal);
      onText(text);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error(e instanceof Error ? e.message : "Gagal mengubah suara jadi teks.");
    } finally {
      abort.current = null;
      setPhase("idle");
    }
  }

  const recording = phase === "rec";
  return (
    <button
      type="button"
      disabled={disabled || phase === "busy"}
      onClick={() => (recording ? stop() : start())}
      aria-label={recording ? "Berhenti merekam" : phase === "busy" ? "Mengubah suara jadi teks" : "Bicara pakai suara"}
      title={recording ? "Ketuk untuk berhenti" : "Bicara pakai suara"}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold transition disabled:opacity-60",
        label ? "px-3 py-1.5 text-sm" : "h-9 w-9",
        recording ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        className,
      )}
    >
      {recording && (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-destructive/40" style={{ transform: `scale(${1 + Math.min(level * 4, 0.18)})`, transition: "transform 120ms" }} />
      )}
      <span className="relative inline-flex items-center gap-1.5">
        {phase === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
        {label && (recording ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} Stop` : phase === "busy" ? "Menulis…" : "Suara")}
      </span>
    </button>
  );
}
