export type TranscriptionConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  maxFileBytes: number;
  audioOnly: boolean;
};

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export async function transcribe(
  config: TranscriptionConfig,
  file: File,
  options: { buffered?: boolean; prompt?: string; signal?: AbortSignal } = {},
) {
  if (!file.size || file.size > config.maxFileBytes) throw new Error("Invalid audio file size");
  if (!file.type.startsWith("audio/") && (config.audioOnly || !file.type.startsWith("video/"))) {
    throw new Error("Unexpected media MIME type");
  }
  const form = new FormData();
  form.append("model", config.model);
  form.append("file", file, file.name);
  form.append("response_format", "json");
  if (!options.buffered) form.append("stream", "true");
  if (options.prompt) form.append("prompt", options.prompt);
  return fetch(`${config.baseURL.replace(/\/v1\/?$/, "")}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: form,
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
