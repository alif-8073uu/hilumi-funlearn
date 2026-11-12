export type MemberPresence = { quizGroup: string | null };
export type MemberStatus = "waiting" | "offline" | "online" | "quiz";

export function memberStatus(accepted: boolean, presence: MemberPresence | undefined, groupId: string): MemberStatus {
  if (!accepted) return "waiting";
  if (!presence) return "offline";
  return presence.quizGroup === groupId ? "quiz" : "online";
}
