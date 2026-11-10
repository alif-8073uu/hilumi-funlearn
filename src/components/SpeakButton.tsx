import { useEffect, useRef, useState } from "react";
import { Loader2, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { speak } from "@/lib/speak";
import { toSpokenText } from "@/lib/speech-text";
import { cn } from "@/lib/utils";

let stopOther: (() => void) | null = null;

/** "Dengarkan" button: Lumi reads the answer aloud; tap again to stop. */
export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const [phase, setPhase] = useState<"idle" | "loading" | "playing">("idle");
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);

  function stop() {
    ctrl.current?.abort();
    ctrl.current = null;
    setPhase("idle");
  }

  async function start() {
    stopOther?.();
    const c = new AbortController();
    ctrl.current = c;
    stopOther = stop;
    setPhase("loading");
    const t = setInterval(() => { if (c.signal.aborted) clearInterval(t); }, 500);
    try {
      const spoken = toSpokenText(text).slice(0, 4000);
      const p = speak(spoken, c.signal);
      setTimeout(() => { if (!c.signal.aborted) setPhase("playing"); }, 900);
      await p;
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError") && !c.signal.aborted) toast.error(e instanceof Error ? e.message : "Lumi gagal bersuara.");
    } finally {
      clearInterval(t);
      if (ctrl.current === c) { ctrl.current = null; setPhase("idle"); }
      if (stopOther === stop) stopOther = null;
    }
  }

  const active = phase !== "idle";
  return (
    <button
      type="button"
      onClick={() => (active ? stop() : start())}
      aria-label={active ? "Hentikan suara Lumi" : "Dengarkan suara Lumi"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition",
        active ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        className,
      )}
    >
      {phase === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
      {active ? "Stop" : "Dengarkan"}
    </button>
  );
}
