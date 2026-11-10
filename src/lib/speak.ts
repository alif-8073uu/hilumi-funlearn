import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

const RATE = 24000;
/** Finished clips are kept so replaying the same answer costs no extra AI credits. */
const cache = new Map<string, Float32Array[]>();

function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

/** Plays Lumi's voice for the text; resolves when playback ends, rejects with AbortError on Stop. */
export async function speak(text: string, signal: AbortSignal): Promise<void> {
  const context = new AudioContext({ sampleRate: RATE });
  const sources = new Set<AudioBufferSourceNode>();
  let playhead = 0;
  let playback: Promise<void> = Promise.resolve();
  const onAbort = () => { for (const s of sources) { try { s.stop(); } catch { /* already stopped */ } } };
  signal.addEventListener("abort", onAbort, { once: true });

  const play = (samples: Float32Array) => {
    const buffer = context.createBuffer(1, samples.length, RATE);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    sources.add(source);
    playback = new Promise<void>((resolve) => { source.onended = () => { sources.delete(source); resolve(); }; });
    playhead = Math.max(playhead, context.currentTime + 0.05);
    source.start(playhead);
    playhead += buffer.duration;
  };

  try {
    if (context.state === "suspended") await context.resume();
    const cached = cache.get(text);
    if (cached) {
      cached.forEach(play);
    } else {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Silakan masuk dulu untuk mendengar suara Lumi.");
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
        signal,
      });
      if (!res.ok || !res.body) {
        let msg = "Lumi gagal bersuara, coba lagi ya.";
        try { const j = await res.json(); msg = j?.error?.message ?? j?.message ?? msg; } catch { /* keep default */ }
        if (res.status === 402) msg = "Kredit AI habis. Tambah kredit di pengaturan workspace.";
        if (res.status === 429) msg = "Lumi lagi sibuk, coba lagi sebentar ya.";
        throw new Error(msg);
      }
      const chunks: Float32Array[] = [];
      let pending = new Uint8Array(0);
      let completed = false;
      let failure: string | undefined;
      const parser = createParser({
        onEvent(ev) {
          if (!ev.data || ev.data === "[DONE]") return;
          let p: { type?: string; audio?: string; error?: { message?: string } | string };
          try { p = JSON.parse(ev.data); } catch { return; }
          if (p.type === "error" || p.error) { failure = typeof p.error === "string" ? p.error : p.error?.message ?? "Lumi gagal bersuara."; return; }
          if (p.type === "speech.audio.done") { completed = true; return; }
          if (p.type !== "speech.audio.delta" || !p.audio) return;
          const d = decodePCM(pending, Uint8Array.from(atob(p.audio), (c) => c.charCodeAt(0)));
          pending = new Uint8Array(d.pending);
          if (!d.samples.length) return;
          chunks.push(d.samples);
          play(d.samples);
        },
      });
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(value);
      }
      if (failure) throw new Error(failure);
      if (!completed || !chunks.length) throw new Error("Suara Lumi terputus, coba lagi ya.");
      cache.set(text, chunks);
    }
    await playback;
    signal.throwIfAborted();
  } finally {
    signal.removeEventListener("abort", onAbort);
    onAbort();
    if (context.state !== "closed") await context.close();
  }
}
