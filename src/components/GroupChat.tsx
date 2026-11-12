import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircleHeart, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Lumi } from "./Lumi";
import type { MemberName } from "@/lib/shared";

type Msg = { id: string; user_id: string; body: string; created_at: string };
const STICKERS = ["👋", "😂", "🔥", "💪", "📚", "🪼", "🥳", "🙏"];
const HUES = ["bg-accent/20 text-accent", "bg-flame/20 text-flame", "bg-primary/20 text-primary", "bg-success/20 text-success"];
const time = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export function GroupChat({ groupId, name, uid, names, autoOpen = false }: { groupId: string; name: string; uid: string; names: MemberName[]; autoOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const nick = (id: string) => names.find((n) => n.id === id)?.nick ?? "Anggota";
  const hue = (id: string) => HUES[Math.max(0, names.findIndex((n) => n.id === id)) % HUES.length];

  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);
  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value && autoOpen) void navigate({ to: "/teman", search: {}, replace: true });
  }

  useEffect(() => {
    if (!open) return;
    let alive = true;
    supabase.from("streak_messages").select("id,user_id,body,created_at").eq("group_id", groupId).order("created_at", { ascending: false }).limit(100)
      .then(({ data, error }) => { if (!alive) return; if (error) toast.error("Chat gagal dimuat"); else setMsgs((data ?? []).reverse()); });
    const channel = supabase.channel(`chat-${groupId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "streak_messages", filter: `group_id=eq.${groupId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]));
      }).subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [open, groupId]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(body: string) {
    const b = body.trim();
    if (!b || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("streak_messages").insert({ group_id: groupId, body: b.slice(0, 500) }).select("id,user_id,body,created_at").single();
    setSending(false);
    if (error) { toast.error("Pesan gagal terkirim"); return; }
    setText("");
    setMsgs((s) => (s.some((x) => x.id === data.id) ? s : [...s, data]));
  }

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button variant="secondary"><MessageCircleHeart className="mr-2 h-4 w-4" />Chat</Button></SheetTrigger>
    <SheetContent className="chat-sheet flex w-full flex-col gap-0 p-0 sm:max-w-md">
      <SheetHeader className="border-b px-4 py-3 text-left">
        <div className="flex items-center gap-3"><Lumi mood="happy" size={44} /><div className="min-w-0"><SheetTitle className="break-words font-display">{name}</SheetTitle><SheetDescription className="text-xs">💬 Ngobrol santai · chat tidak menambah streak</SheetDescription></div></div>
      </SheetHeader>
      <div className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {[12, 38, 66, 86].map((l, i) => <span key={l} className="chat-bubble-deco" style={{ left: `${l}%`, width: 10 + i * 4, height: 10 + i * 4, animationDelay: `-${i * 2}s` }} />)}
        {msgs.length === 0 && <div className="flex flex-col items-center gap-2 pt-16 text-center text-muted-foreground"><span className="text-5xl">🪼</span><p className="font-bold">Belum ada obrolan</p><p className="text-sm">Sapa temanmu dulu, yuk!</p></div>}
        {msgs.map((m, i) => {
          const mine = m.user_id === uid;
          const first = msgs[i - 1]?.user_id !== m.user_id;
          return <div key={m.id} className={`chat-pop relative flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
            {!mine && <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${first ? hue(m.user_id) : "invisible"}`}>{nick(m.user_id).slice(0, 1).toUpperCase()}</span>}
            <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
              {!mine && first && <span className="mb-0.5 px-1 text-xs font-bold text-accent">{nick(m.user_id)}</span>}
              <div className={`chat-msg ${mine ? "chat-msg-mine" : "chat-msg-them"} ${/^\p{Extended_Pictographic}+$/u.test(m.body) ? "chat-msg-sticker" : ""}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">{time(m.created_at)}</span>
            </div>
          </div>;
        })}
        <div ref={end} />
      </div>
      <div className="border-t px-3 pb-3 pt-2">
        <div className="mb-2 flex gap-1 overflow-x-auto">{STICKERS.map((s) => <button key={s} type="button" aria-label={`Kirim ${s}`} disabled={sending} onClick={() => void send(s)} className="rounded-full px-2 py-1 text-xl transition-transform hover:scale-125 active:scale-95">{s}</button>)}</div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <Input aria-label="Tulis pesan" placeholder="Tulis pesan…" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} className="rounded-full" />
          <Button type="submit" size="icon" aria-label="Kirim" disabled={!text.trim() || sending} className="shrink-0 rounded-full"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </SheetContent>
  </Sheet>;
}
