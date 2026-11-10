import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const RUN = "X-Lovable-AIG-Run-ID";

export async function askLumi(system: string, messages: ModelMessage[]) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Kunci AI belum diatur.");
  let runId: string | undefined;
  const openai = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const h = new Headers(init?.headers);
      if (runId) h.set(RUN, runId);
      const r = await fetch(input, { ...init, headers: h });
      runId ??= r.headers.get(RUN) ?? undefined;
      if (r.status === 402) throw new Error("Kredit AI habis. Tambah kredit di pengaturan workspace.");
      if (r.status === 429) throw new Error("Lumi lagi sibuk, coba lagi sebentar ya.");
      return r;
    },
  });
  let failure: unknown;
  const result = streamText({
    model: openai.responses("openai/gpt-6-astra"),
    system,
    messages,
    providerOptions: {
      openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
    },
    onError: ({ error }) => { failure = error; },
  });
  const text = await result.text;
  if (failure && !text) throw failure instanceof Error ? failure : new Error("AI gagal menjawab.");
  return text;
}

export function extractJson<T>(text: string): T {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m?.[1] ?? text.slice(text.search(/[[{]/));
  return JSON.parse(raw) as T;
}
