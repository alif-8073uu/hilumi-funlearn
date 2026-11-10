import { useSyncExternalStore } from "react";
import { activateStreak, evaluateStreak, newStreak, recoverStreak, type Streak } from "./game";
import type { Card } from "./ai.functions";
import { supabase } from "@/integrations/supabase/client";

export type Friend = { id: string; nick: string; duoStreak: number; theyDueledToday: boolean; lastDuoDay: string };
export type ChatMsg = { from: "me" | "them"; text: string; at: number };
export type Deck = { id: string; title: string; cards: (Card & { box: number; due: number })[] };

export type State = {
  authReady: boolean;
  uid: string | null;
  user: { nick: string; id: string; email: string } | null;
  xp: number;
  streak: Streak;
  friends: Friend[];
  chats: Record<string, ChatMsg[]>;
  decks: Deck[];
  myDuelDay: string;
};
type Progress = Pick<State, "xp" | "streak" | "friends" | "chats" | "decks" | "myDuelDay">;

const initial: State = { authReady: false, uid: null, user: null, xp: 0, streak: newStreak(), friends: [], chats: {}, decks: [], myDuelDay: "" };
let state: State = initial;
const subs = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;

function emit() { subs.forEach((f) => f()); }

function progressOf(s: State): Progress {
  return { xp: s.xp, streak: s.streak, friends: s.friends, chats: s.chats, decks: s.decks, myDuelDay: s.myDuelDay };
}

function scheduleSave() {
  if (!state.uid) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!state.uid) return;
    const { error } = await supabase.from("profiles").update({ progress: progressOf(state) as never, nick: state.user?.nick ?? "Pelajar", updated_at: new Date().toISOString() }).eq("id", state.uid);
    if (error) console.error("Gagal menyimpan progres", error);
  }, 600);
}

async function loadProfile(uid: string, email: string) {
  // Returning users from the previous app: reclaim imported progress once the email is verified (checked server-side).
  try { await supabase.rpc("claim_legacy_profile"); } catch (e) { console.error("Gagal memulihkan akun lama", e); }
  let { data } = await supabase.from("profiles").select("nick, lumi_id, progress").eq("id", uid).maybeSingle();
  if (!data) {
    const ins = await supabase.from("profiles").insert({ id: uid, nick: email.split("@")[0]?.slice(0, 20) || "Pelajar" }).select("nick, lumi_id, progress").single();
    data = ins.data;
  }
  const p = (data?.progress ?? {}) as Partial<Progress>;
  state = {
    ...initial,
    ...p,
    streak: evaluateStreak({ ...newStreak(), ...(p.streak ?? {}) }, Date.now()),
    authReady: true,
    uid,
    user: { nick: data?.nick ?? "Pelajar", id: data?.lumi_id ?? "#LUMI-0000", email },
  };
  emit();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("focus", () => { if (state.uid && state.user) { clearTimeout(saveTimer); loadProfile(state.uid, state.user.email); } });
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) loadProfile(data.user.id, data.user.email ?? "");
    else { state = { ...initial, authReady: true }; emit(); }
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user && session.user.id !== state.uid) {
      setTimeout(() => loadProfile(session.user.id, session.user.email ?? ""), 0);
    }
    if (event === "SIGNED_OUT") { state = { ...initial, authReady: true }; emit(); }
  });
}

export function setState(fn: (s: State) => State) {
  state = fn(state);
  emit();
  scheduleSave();
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { start(); subs.add(cb); return () => { subs.delete(cb); }; },
    () => sel(state),
    () => sel(initial),
  );
}

export const today = () => new Date().toDateString();

export const actions = {
  signOut: async () => { clearTimeout(saveTimer); await supabase.auth.signOut(); },
  setNick: (nick: string) => setState((s) => (s.user ? { ...s, user: { ...s.user, nick } } : s)),
  addXp: (n: number) => setState((s) => ({ ...s, xp: s.xp + Math.max(0, Math.round(n)) })),
  learned: () => setState((s) => ({ ...s, streak: activateStreak(s.streak, Date.now()) })),
  recover: () => setState((s) => ({ ...s, streak: recoverStreak(s.streak, Date.now()) })),
  dueled: (friendId?: string) => setState((s) => ({
    ...s,
    myDuelDay: today(),
    streak: activateStreak(s.streak, Date.now()),
    friends: s.friends.map((f) => (f.id === friendId && f.theyDueledToday && f.lastDuoDay !== today() ? { ...f, duoStreak: f.duoStreak + 1, lastDuoDay: today() } : f)),
  })),
  addFriend: (f: { id: string; nick: string }) => setState((s) => (s.friends.some((x) => x.id === f.id) ? s : { ...s, friends: [...s.friends, { ...f, duoStreak: 0, theyDueledToday: true, lastDuoDay: "" }] })),
  sendChat: (id: string, text: string, from: "me" | "them" = "me") => setState((s) => ({ ...s, chats: { ...s.chats, [id]: [...(s.chats[id] ?? []), { from, text, at: Date.now() }] } })),
  saveDeck: (d: Deck) => setState((s) => ({ ...s, decks: [d, ...s.decks.filter((x) => x.id !== d.id)] })),
};
