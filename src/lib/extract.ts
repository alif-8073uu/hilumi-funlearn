// Turn uploaded files into material for the AI: images & PDF go as attachments, Word/PPT become text.
import type { MaterialInput } from "./ai.functions";

const readDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

async function officeText(f: File) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(f);
  const names = Object.keys(zip.files).filter((n) => /^word\/document\.xml$|^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  let out = "";
  for (const n of names) {
    const xml = await zip.files[n]!.async("string");
    out += xml.replace(/<\/(w:p|a:p)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") + "\n";
  }
  return out.trim();
}

export async function buildMaterial(text: string, files: File[]): Promise<MaterialInput> {
  const m: MaterialInput = { text, files: [] };
  for (const f of files) {
    if (f.size > 8 * 1024 * 1024) throw new Error(`${f.name} terlalu besar (maks 8 MB).`);
    if (f.type.startsWith("image/") || f.type === "application/pdf") m.files.push({ dataUrl: await readDataUrl(f), mediaType: f.type, name: f.name });
    else if (/\.(docx|pptx)$/i.test(f.name)) m.text += `\n\n[${f.name}]\n${(await officeText(f)).slice(0, 40000)}`;
    else if (/\.(doc|ppt)$/i.test(f.name)) throw new Error(`${f.name}: format lama belum didukung, simpan ulang sebagai .docx/.pptx ya.`);
    else m.text += `\n\n${await f.text()}`;
  }
  if (!m.text.trim() && !m.files.length) throw new Error("Masukkan materi dulu (teks atau file).");
  return m;
}

export const ACCEPT = "image/*,application/pdf,.doc,.docx,.ppt,.pptx,.txt";
