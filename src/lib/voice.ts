import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

export function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const chunk of chunks)
    for (const value of chunk) {
      const sample = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, sample * (sample < 0 ? 32768 : 32767), true);
      offset += 2;
    }
  return new Blob([bytes], { type: "audio/wav" });
}

export type Recording = { stop: () => Promise<File>; cancel: () => void; level: () => number };

export async function recordWav(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    await context.resume();
    const audioContext = context;
    const source = audioContext.createMediaStreamSource(stream);
    const node = audioContext.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    let lastLevel = 0;
    node.onaudioprocess = (event) => {
      const data = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      let sum = 0;
      for (const v of data) sum += v * v;
      lastLevel = Math.sqrt(sum / data.length);
    };
    source.connect(node);
    node.connect(audioContext.destination);
    let stopped = false;
    const release = async () => {
      stopped = true;
      stream.getTracks().forEach((track) => track.stop());
      node.disconnect();
      source.disconnect();
      node.onaudioprocess = null;
      if (audioContext.state !== "closed") await audioContext.close();
    };
    return {
      level: () => lastLevel,
      cancel: () => { if (!stopped) void release(); },
      async stop() {
        if (stopped) throw new Error("Rekaman sudah berhenti");
        await release();
        const blob = encodeWav(chunks, audioContext.sampleRate);
        if (blob.size < 2048 || chunks.length * 4096 < audioContext.sampleRate * 0.4) throw new Error("Rekaman terlalu pendek, coba bicara lagi ya.");
        return new File([blob], "suara.wav", { type: "audio/wav" });
      },
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context?.close();
    throw error;
  }
}

/** Uploads the recording and streams the transcript; onDelta receives the text so far. */
export async function transcribeAudio(file: File, onDelta?: (soFar: string) => void, signal?: AbortSignal): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Silakan masuk dulu untuk memakai suara.");
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch("/api/transcribe", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form, signal: signal ?? null });
  if (!res.ok || !res.body) {
    let msg = "Gagal mengubah suara jadi teks.";
    try {
      const j = await res.json();
      msg = j?.error?.message ?? j?.message ?? msg;
    } catch { /* keep default */ }
    if (res.status === 402) msg = "Kredit AI habis. Tambah kredit di pengaturan workspace.";
    if (res.status === 429) msg = "Lumi lagi sibuk, coba lagi sebentar ya.";
    throw new Error(msg);
  }
  let soFar = "";
  let final: string | undefined;
  let failure: string | undefined;
  const parser = createParser({
    onEvent(ev) {
      if (!ev.data || ev.data === "[DONE]") return;
      try {
        const d = JSON.parse(ev.data);
        if (d.type === "transcript.text.delta" && typeof d.delta === "string") { soFar += d.delta; onDelta?.(soFar); }
        else if (d.type === "transcript.text.done" && typeof d.text === "string") { final = d.text; onDelta?.(d.text); }
        else if (d.type === "error" || d.error) failure = d.error?.message ?? d.message ?? "Gagal mengubah suara jadi teks.";
      } catch { /* ignore non-JSON lines */ }
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(value);
  }
  if (failure) throw new Error(failure);
  const text = (final ?? soFar).trim();
  if (final === undefined && !text) throw new Error("Suara tidak terdengar jelas, coba lagi ya.");
  if (!text) throw new Error("Suara tidak terdengar jelas, coba lagi ya.");
  return text;
}
