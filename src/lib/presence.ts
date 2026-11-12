import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MemberPresence } from "./member-status";

type PresencePayload = { user_id: string; quiz_group: string | null };

let channel: ReturnType<typeof supabase.channel> | null = null;
let activeUid: string | null = null;
let quizGroup: string | null = null;
let members: Record<string, MemberPresence> = {};
const emptyMembers: Record<string, MemberPresence> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function syncMembers() {
  const next: Record<string, MemberPresence> = {};
  for (const states of Object.values(channel?.presenceState<PresencePayload>() ?? {})) {
    for (const state of states) {
      if (!state.user_id) continue;
      next[state.user_id] = { quizGroup: state.quiz_group ?? next[state.user_id]?.quizGroup ?? null };
    }
  }
  members = next;
  emit();
}

function track() {
  const currentChannel = channel;
  const uid = activeUid;
  if (!currentChannel || !uid) return;
  void currentChannel.track({ user_id: uid, quiz_group: quizGroup } satisfies PresencePayload).catch(() => undefined);
}

export function startPresence(uid: string) {
  if (channel) void supabase.removeChannel(channel);
  activeUid = uid;
  quizGroup = null;
  members = {};
  channel = supabase.channel("hilumi-member-presence", { config: { presence: { key: uid } } })
    .on("presence", { event: "sync" }, syncMembers)
    .subscribe((status) => { if (status === "SUBSCRIBED") track(); });
  emit();
}

export function stopPresence() {
  const currentChannel = channel;
  channel = null;
  activeUid = null;
  quizGroup = null;
  members = {};
  if (currentChannel) void supabase.removeChannel(currentChannel);
  emit();
}

export function setQuizPresence(groupId: string | null) {
  if (quizGroup === groupId) return;
  quizGroup = groupId;
  track();
}

export function useMemberPresence() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => members,
    () => emptyMembers,
  );
}
