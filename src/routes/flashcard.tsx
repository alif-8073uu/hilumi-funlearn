import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { Lumi } from "@/components/Lumi";
import { Button } from "@/components/ui/button";
import { MaterialForm } from "@/components/MaterialForm";
import { makeFlashcards } from "@/lib/ai.functions";
import { buildMaterial } from "@/lib/extract";
import { actions, useStore, type Deck } from "@/lib/store";

export const Route = createFileRoute("/flashcard")({
  head: () => ({
    meta: [
      { title: "Kartu Kilat Lumi — HiLumi" },
      { name: "description", content: "Flashcard AI otomatis dari catatanmu dengan kartu 3D dan pengulangan berjarak." },
      { property: "og:title", content: "Kartu Kilat Lumi — HiLumi" },
      { property: "og:description", content: "Flashcard AI dari catatanmu, kartu 3D dan pengulangan berjarak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Flash,
});

const DAY = 864e5;
const INTERVALS = [0, 1, 3, 7, 14]; // days per Leitner box

function Flash() {
  const decks = useStore((s) => s.decks);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<{ deck: Deck; exam: boolean } | null>(null);

  async function create() {
    setLoading(true);
    try {
      const material = await buildMaterial(text, files);
      const r = await makeFlashcards({ data: { material, count: 10 } });
      const deck: Deck = { id: crypto.randomUUID(), title: (text.trim() || files[0]?.name || "Kartu baru").slice(0, 40), cards: r.cards.map((c) => ({ ...c, box: 0, due: 0 })) };
      actions.saveDeck(deck); actions.learned(); setText(""); setFiles([]);
      setActive({ deck, exam: false });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membuat kartu"); }
    finally { setLoading(false); }
  }

  if (active) return <Shell><Study deck={active.deck} exam={active.exam} onExit={() => setActive(null)} /></Shell>;

  return (
    <Shell>
      <h1 className="mb-4 text-3xl font-bold">Kartu Kilat Lumi</h1>
      <MaterialForm text={text} setText={setText} files={files} setFiles={setFiles}>
        <Button className="w-full bg-lumi text-primary-foreground" disabled={loading} onClick={create}>{loading ? "Membuat kartu…" : "Buat 10 Kartu"}</Button>
      </MaterialForm>
      {loading && <div className="mt-4 flex justify-center"><Lumi mood="thinking" size={100} /></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {decks.map((d) => {
          const due = d.cards.filter((c) => c.due <= Date.now()).length;
          return (
            <div key={d.id} className="glass rounded-3xl p-4">
              <h2 className="font-bold">{d.title}</h2>
              <p className="text-sm text-muted-foreground">{d.cards.length} kartu · {due} perlu diulang</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setActive({ deck: d, exam: false })}>Ulangi</Button>
                <Button size="sm" variant="secondary" onClick={() => setActive({ deck: d, exam: true })}>Ujian Kilat</Button>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function Study({ deck, exam, onExit }: { deck: Deck; exam: boolean; onExit: () => void }) {
  const [cards, setCards] = useState(deck.cards);
  const queue = exam ? cards.map((_, i) => i) : cards.map((c, i) => (c.due <= Date.now() ? i : -1)).filter((i) => i >= 0);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const idx = queue[pos];

  function rate(ok: boolean) {
    const next = cards.map((c, i) => (i !== idx ? c : { ...c, box: ok ? Math.min(4, c.box + 1) : 0, due: Date.now() + (INTERVALS[ok ? Math.min(4, c.box + 1) : 0] ?? 0) * DAY }));
    setCards(next);
    actions.saveDeck({ ...deck, cards: next });
    if (ok) { setKnown((k) => k + 1); actions.addXp(2); }
    setFlipped(false); setPos(pos + 1);
  }

  if (idx == null || pos >= queue.length)
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Lumi mood="victory" size={130} />
        <h2 className="text-2xl font-bold">{queue.length ? `Selesai! ${known}/${queue.length} hafal` : "Semua kartu sudah diulang. Kembali besok ya!"}</h2>
        <Button onClick={onExit}>Kembali</Button>
      </div>
    );

  const c = cards[idx]!;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <p className="text-center font-bold">{exam ? "Ujian Kilat" : "Ulangi"} · {pos + 1}/{queue.length}</p>
      <button className="flip block h-72 w-full" onClick={() => setFlipped(!flipped)}>
        <div className={`flip-inner h-full ${flipped ? "flipped" : ""}`}>
          <div className="flip-face glass grid place-items-center rounded-3xl p-6 text-2xl font-bold">{c.front}</div>
          <div className="flip-face flip-back grid place-items-center rounded-3xl bg-lumi p-6 text-primary-foreground">
            <div><p className="text-xl font-bold">{c.back}</p><p className="mt-3 text-sm">💡 {c.trick}</p></div>
          </div>
        </div>
      </button>
      <p className="text-center text-sm text-muted-foreground">Ketuk kartu untuk membalik</p>
      {flipped && (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => rate(false)}>Belum hafal</Button>
          <Button className="flex-1" onClick={() => rate(true)}>Hafal!</Button>
        </div>
      )}
    </div>
  );
}
