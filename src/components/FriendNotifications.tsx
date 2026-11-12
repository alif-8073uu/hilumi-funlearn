import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, MessageCircleHeart, Swords, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Lumi } from "./Lumi";

type Notice = {
  id: string;
  kind: "chat" | "quiz";
  title: string;
  body: string;
  groupId?: string;
  quizId?: string;
};
type ChatPayload = { id: string; user_id: string; group_id: string; body: string };
type PlayerPayload = { quiz_id: string; user_id: string };

export function FriendNotifications({ uid }: { uid: string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const location = useLocation();
  const openChat = location.pathname === "/teman" ? (location.search as { chat?: string }).chat : undefined;

  function dismiss(id: string) {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setNotices((items) => items.filter((item) => item.id !== id));
  }

  function push(notice: Notice) {
    setNotices((items) => items.some((item) => item.id === notice.id) ? items : [notice, ...items].slice(0, 3));
    const oldTimer = timers.current.get(notice.id);
    if (oldTimer) clearTimeout(oldTimer);
    timers.current.set(notice.id, setTimeout(() => dismiss(notice.id), 10000));
  }

  useEffect(() => {
    let alive = true;
    const activeTimers = timers.current;
    const notifyChat = async (message: ChatPayload) => {
      if (message.user_id === uid || openChat === message.group_id) return;
      const { data: names } = await supabase.rpc("streak_member_names", { g: message.group_id });
      if (!alive) return;
      const sender = names?.find((name) => name.id === message.user_id)?.nick ?? "Temanmu";
      push({ id: `chat-${message.id}`, kind: "chat", title: `${sender} mengirim pesan 💬`, body: message.body.slice(0, 100), groupId: message.group_id });
    };
    const notifyQuiz = async (player: PlayerPayload) => {
      if (player.user_id !== uid) return;
      const { data: quiz } = await supabase.from("shared_quizzes").select("id,group_id,inviter_id,title,minutes").eq("id", player.quiz_id).maybeSingle();
      if (!alive || !quiz || quiz.inviter_id === uid) return;
      const { data: names } = await supabase.rpc("streak_member_names", { g: quiz.group_id });
      if (!alive) return;
      const inviter = names?.find((name) => name.id === quiz.inviter_id)?.nick ?? "Temanmu";
      push({ id: `quiz-${quiz.id}`, kind: "quiz", title: `${inviter} mengajak kuis! ⚔️`, body: `${quiz.title} · ${quiz.minutes} menit. Yuk, main bareng!`, quizId: quiz.id });
    };
    const channel = supabase.channel(`friend-alerts-${uid}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "streak_messages" }, (payload) => { void notifyChat(payload.new as ChatPayload); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shared_quiz_players", filter: `user_id=eq.${uid}` }, (payload) => { void notifyQuiz(payload.new as PlayerPayload); })
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, [uid, openChat]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="pointer-events-none fixed left-1/2 top-20 z-[70] flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 flex-col gap-3 sm:left-auto sm:right-5 sm:translate-x-0" aria-live="polite" aria-atomic="false">
    {notices.map((notice) => <div key={notice.id} role="status" className={`friend-notice pointer-events-auto relative overflow-hidden rounded-3xl border p-4 pr-10 ${notice.kind === "quiz" ? "friend-notice-quiz" : "friend-notice-chat"}`}>
      <button type="button" aria-label="Tutup notifikasi" onClick={() => dismiss(notice.id)} className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0"><Lumi mood={notice.kind === "quiz" ? "victory" : "happy"} size={58} /><span className={`notice-icon absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full ${notice.kind === "quiz" ? "bg-flame text-primary-foreground" : "bg-lumi text-primary-foreground"}`}>{notice.kind === "quiz" ? <Swords className="h-3.5 w-3.5" /> : <MessageCircleHeart className="h-4 w-4" />}</span></div>
        <div className="min-w-0 flex-1"><p className="font-display text-lg font-bold leading-tight">{notice.title}</p><p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{notice.body}</p></div>
      </div>
      <Button asChild size="sm" className="invite-action mt-3 w-full rounded-xl font-bold">
        <Link to={notice.kind === "quiz" ? "/kuis" : "/teman"} search={notice.kind === "quiz" ? { invite: notice.quizId } : { chat: notice.groupId }} onClick={() => dismiss(notice.id)}>{notice.kind === "quiz" ? "Ikut Kuis" : "Buka Chat"}<ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </div>)}
  </div>;
}
