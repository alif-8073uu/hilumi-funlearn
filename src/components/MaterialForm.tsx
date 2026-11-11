import { useState, type ReactNode } from "react";
import { Paperclip, X } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { ACCEPT } from "@/lib/extract";
import { VoiceButton } from "./VoiceButton";

export function MaterialForm({ text, setText, files, setFiles, children, placeholder }: {
  text: string; setText: (s: string) => void; files: File[]; setFiles: (f: File[]) => void; children?: ReactNode; placeholder?: string;
}) {
  const [id] = useState(() => `f${Math.random().toString(36).slice(2)}`);
  return (
    <div className="glass space-y-3 rounded-3xl p-4">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={placeholder ?? "Tulis topik atau tempel materi... (contoh: Fotosintesis kelas 8)"} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold">
          <Paperclip className="h-4 w-4" /> Foto / PDF / Word / PPT
        </label>
        <VoiceButton label onText={(t) => setText(text.trim() ? `${text.trim()} ${t}` : t)} />
        <input id={id} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 4)); e.target.value = ""; }} />
        {files.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
            {f.name}<button type="button" aria-label="hapus" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <p className="text-[11px] font-semibold text-muted-foreground">📎 Ukuran file maksimal 8 MB · paling banyak 4 file</p>
      {children}
    </div>
  );
}
