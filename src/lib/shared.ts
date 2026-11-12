import { supabase } from "@/integrations/supabase/client";
import type { QuizQ } from "./ai.functions";
import type { Json } from "@/integrations/supabase/types";

export type MemberName = { id: string; nick: string; lumi_id: string };
export type SharedQuiz = { id: string; group_id: string; inviter_id: string; title: string; expires_at: string; minutes: number; credited: boolean };
export const canDeleteQuiz = (inviterId: string, userId: string | null) => Boolean(userId && inviterId === userId);
export async function sharedGroups() {
  const { data, error } = await supabase.from("streak_groups").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return await Promise.all((data ?? []).map(async (g) => {
    const [members, names, quizzes] = await Promise.all([
      supabase.from("streak_members").select("*").eq("group_id", g.id),
      supabase.rpc("streak_member_names", { g: g.id }),
      supabase.from("shared_quizzes").select("id,group_id,inviter_id,title,expires_at,minutes,credited").eq("group_id", g.id).order("created_at", { ascending: false }).limit(5),
    ]);
    if (members.error || names.error || quizzes.error) throw members.error ?? names.error ?? quizzes.error;
    return { ...g, members: members.data ?? [], names: names.data ?? [], quizzes: quizzes.data ?? [] };
  }));
}
export async function inviteQuiz(group: string, title: string, questions: QuizQ[], minutes: number) {
  const { data, error } = await supabase.rpc("invite_streak_quiz", { g: group, label: title, qs: questions as unknown as Json, duration: minutes });
  if (error) throw error;
  return data;
}
export const sharedDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function visibleSharedDays(count: number, lastDay: string | null) {
  if (!lastDay) return 0;
  const today = new Date(`${sharedDay()}T00:00:00Z`).getTime();
  return today - new Date(`${lastDay}T00:00:00Z`).getTime() <= 86400000 ? count : 0;
}