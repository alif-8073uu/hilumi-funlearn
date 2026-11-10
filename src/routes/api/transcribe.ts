import { createFileRoute } from "@tanstack/react-router";

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { message } }), { status, headers: { "Content-Type": "application/json" } });

async function signedIn(request: Request) {
  const auth = request.headers.get("authorization");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!auth?.startsWith("Bearer ") || !url || !key) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: auth } });
  return r.ok;
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { transcribe, MAX_AUDIO_BYTES } = await import("@/lib/transcribe.server");
        if (!(await signedIn(request))) return json(401, "Silakan masuk dulu untuk memakai suara.");
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_AUDIO_BYTES + 1024 * 1024) return json(413, "Rekaman terlalu panjang. Coba rekam lebih singkat.");
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "Kunci AI belum diatur.");
        let file: FormDataEntryValue | null;
        try {
          file = (await request.formData()).get("file");
        } catch {
          return json(400, "Rekaman tidak terbaca. Coba rekam lagi.");
        }
        if (!(file instanceof File) || !file.size) return json(400, "Rekaman kosong. Coba rekam lagi.");
        if (file.size > MAX_AUDIO_BYTES) return json(413, "Rekaman terlalu panjang. Coba rekam lebih singkat.");
        if (!file.type.startsWith("audio/")) return json(400, "Format rekaman tidak didukung.");
        try {
          const upstream = await transcribe(
            { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-transcribe", maxFileBytes: MAX_AUDIO_BYTES, audioOnly: false },
            file,
            { prompt: "Siswa SMP di Bandung berbicara dalam Bahasa Indonesia (kadang Sunda) tentang pelajaran sekolah.", signal: request.signal },
          );
          const headers = new Headers({ "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream", "Cache-Control": "no-cache" });
          upstream.headers.forEach((v, k) => { if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v); });
          return new Response(upstream.body, { status: upstream.status, headers });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          return json(502, e instanceof Error ? e.message : "Gagal mengubah suara jadi teks.");
        }
      },
    },
  },
});
