import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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

const Body = z.object({ text: z.string().trim().min(1).max(4000) });

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await signedIn(request))) return json(401, "Silakan masuk dulu untuk mendengar suara Lumi.");
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "Kunci AI belum diatur.");
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(400, "Teks untuk dibacakan tidak valid.");
        const prompt = `Bacakan dalam Bahasa Indonesia dengan suara ceria, hangat, santai, dan bersemangat seperti kakak pembimbing yang asyik untuk remaja SMP. Tempo sedang dan jelas:\n\n${parsed.data.text}`;
        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-tts",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } } },
              },
              stream_format: "sse",
            }),
            signal: request.signal,
          });
          const headers = new Headers({ "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream", "Cache-Control": "no-cache" });
          upstream.headers.forEach((v, k) => { if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v); });
          return new Response(upstream.body, { status: upstream.status, headers });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          return json(502, e instanceof Error ? e.message : "Gagal membuat suara.");
        }
      },
    },
  },
});
