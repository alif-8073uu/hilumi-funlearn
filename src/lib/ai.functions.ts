import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ModelMessage } from "ai";

const Material = z.object({
  text: z.string().max(60000).default(""),
  files: z.array(z.object({ dataUrl: z.string(), mediaType: z.string(), name: z.string() })).max(4).default([]),
});
export type MaterialInput = z.infer<typeof Material>;

function materialContent(m: MaterialInput, instruction: string) {
  const parts: Exclude<ModelMessage["content"], string> = [{ type: "text", text: `${instruction}\n\nMATERI DARI SISWA:\n${m.text || "(lihat lampiran)"}` }] as never;
  for (const f of m.files) {
    if (f.mediaType.startsWith("image/")) (parts as unknown[]).push({ type: "image", image: f.dataUrl });
    else if (f.mediaType === "application/pdf") (parts as unknown[]).push({ type: "file", data: f.dataUrl, mediaType: "application/pdf", filename: f.name });
  }
  return parts;
}

const BASE = "Kamu adalah Lumi, ubur-ubur AI guru bayangan yang ramah untuk siswa SMP di Bandung. Gunakan Bahasa Indonesia santai, jelas, dan menyemangati. Format jawaban: paragraf pendek, boleh **tebal** untuk kata kunci dan daftar bernomor/berpoin, tanpa judul pagar. Tulis SEMUA rumus dan perhitungan matematika dalam LaTeX: $...$ untuk rumus dalam kalimat dan $$...$$ di baris sendiri untuk rumus penting (contoh: $$v = \\frac{s}{t}$$).";

const MODES: Record<string, string> = {
  biasa: `${BASE} Jelaskan materi dengan runtut dan beri contoh.`,
  pr: `${BASE} Mode TANYA PR anti-menyontek: JANGAN beri jawaban akhir. Beri satu petunjuk bertahap per balasan, ajukan pertanyaan pancingan. Hanya beri jawaban lengkap jika siswa menulis "MINTA KUNCI JAWABAN".`,
  umur10: `${BASE} Jelaskan seperti kepada anak umur 10 tahun: kalimat pendek, analogi kehidupan sehari-hari anak sekolah, tanpa istilah rumit.`,
  panik: `${BASE} Mode PANIK UJIAN: ringkas poin terpenting dalam bullet singkat, rumus/kata kunci, dan trik mengingat. Tenangkan siswa.`,
};

export const chatLumi = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    mode: z.enum(["biasa", "pr", "umur10", "panik"]),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(8000) })).max(40),
    material: Material.optional(),
  }))
  .handler(async ({ data }) => {
    const { askLumi } = await import("./ai.server");
    const msgs: ModelMessage[] = data.history.map((h, i) => {
      if (i === 0 && data.material && data.material.files.length) return { role: "user", content: materialContent({ ...data.material, text: h.text }, "Pertanyaan/materi siswa:") } as ModelMessage;
      return { role: h.role, content: h.text } as ModelMessage;
    });
    return { text: await askLumi(MODES[data.mode] ?? BASE, msgs) };
  });

export type QuizQ = { q: string; options: string[]; answer: number; explain: string };

export const makeQuiz = createServerFn({ method: "POST" })
  .inputValidator(z.object({ material: Material, count: z.number().int().min(1).max(75) }))
  .handler(async ({ data }) => {
    const { askLumi, extractJson } = await import("./ai.server");
    const text = await askLumi(BASE, [{ role: "user", content: materialContent(data.material,
      `Buat tepat ${data.count} soal pilihan ganda (4 opsi) HANYA berdasarkan materi berikut. Balas HANYA JSON array: [{"q":"...","options":["A","B","C","D"],"answer":0,"explain":"penjelasan singkat"}]. "answer" adalah indeks opsi benar 0-3.`) } as ModelMessage]);
    const qs = extractJson<QuizQ[]>(text).filter((q) => q.options?.length === 4).slice(0, data.count);
    if (!qs.length) throw new Error("Lumi gagal membuat soal, coba materi lain.");
    return { questions: qs };
  });

export type Card = { front: string; back: string; trick: string };

export const makeFlashcards = createServerFn({ method: "POST" })
  .inputValidator(z.object({ material: Material, count: z.number().int().min(3).max(30) }))
  .handler(async ({ data }) => {
    const { askLumi, extractJson } = await import("./ai.server");
    const text = await askLumi(BASE, [{ role: "user", content: materialContent(data.material,
      `Buat ${data.count} kartu flashcard dari materi berikut. Balas HANYA JSON array: [{"front":"istilah/pertanyaan","back":"jawaban singkat","trick":"trik ingat singkat"}].`) } as ModelMessage]);
    return { cards: extractJson<Card[]>(text).slice(0, data.count) };
  });
