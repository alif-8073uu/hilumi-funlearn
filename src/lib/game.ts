// Pure game rules for HiLumi: ranks, streaks, quiz limits, duel scoring.

export const TIERS = ["Plankton", "Kuda Laut", "Penyu", "Lumba-Lumba", "Paus Samudra"] as const;
export const TIER_EMOJI = ["🦠", "🐴", "🐢", "🐬", "🐋"];
export const SUBS = ["I", "II", "III", "IV", "V"];
export const XP_PER_SUBRANK = 200;
export const MAX_QUESTIONS = 75;
export const MAX_MINUTES = 60;
export const RECOVERIES_PER_MONTH = 5;
const DAY = 24 * 60 * 60 * 1000;

export function getRank(xp: number) {
  const level = Math.min(24, Math.floor(Math.max(0, xp) / XP_PER_SUBRANK));
  const tier = Math.floor(level / 5);
  const sub = level % 5;
  const into = level === 24 ? XP_PER_SUBRANK : xp - level * XP_PER_SUBRANK;
  return {
    level,
    tier,
    name: `${TIERS[tier]} ${SUBS[sub]}`,
    emoji: TIER_EMOJI[tier],
    progress: Math.min(1, into / XP_PER_SUBRANK),
    nextAt: (level + 1) * XP_PER_SUBRANK,
  };
}

export const clampQuestions = (n: number) => Math.max(1, Math.min(MAX_QUESTIONS, Math.round(n) || 1));
export const clampMinutes = (n: number) => Math.max(1, Math.min(MAX_MINUTES, Math.round(n) || 1));

/** Duel score: 10 per correct + speed bonus (max 5) + combo bonus (2 per consecutive correct beyond the first). */
export function duelPoints(correct: boolean, secondsTaken: number, combo: number) {
  if (!correct) return 0;
  const speed = Math.max(0, 5 - Math.floor(secondsTaken / 3));
  return 10 + speed + Math.max(0, combo - 1) * 2;
}

export type Streak = {
  count: number;
  lastActive: number | null; // ms timestamp of last activation
  diedAt: number | null; // when the streak went out
  frozenCount: number; // count preserved while dead (recoverable)
  recoveriesUsed: number;
  recoveryMonth: string; // "YYYY-M"
};

export const newStreak = (): Streak => ({ count: 0, lastActive: null, diedAt: null, frozenCount: 0, recoveriesUsed: 0, recoveryMonth: "" });
const monthKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}`; };

/** Evaluate streak state at time `now`: alive, dead (recoverable within 24h), or lost (reset to 0). */
export function evaluateStreak(s: Streak, now: number): Streak {
  let st = { ...s };
  if (st.recoveryMonth !== monthKey(now)) st = { ...st, recoveriesUsed: 0, recoveryMonth: monthKey(now) };
  if (st.lastActive != null && st.diedAt == null && st.count > 0 && now - st.lastActive > DAY) {
    st = { ...st, diedAt: st.lastActive + DAY, frozenCount: st.count, count: 0 };
  }
  if (st.diedAt != null && now - st.diedAt > DAY) st = { ...st, diedAt: null, frozenCount: 0 };
  return st;
}

export const canRecover = (s: Streak, now: number) => {
  const e = evaluateStreak(s, now);
  return e.diedAt != null && e.frozenCount > 0 && e.recoveriesUsed < RECOVERIES_PER_MONTH;
};

export function recoverStreak(s: Streak, now: number): Streak {
  const e = evaluateStreak(s, now);
  if (!canRecover(e, now)) return e;
  return { ...e, count: e.frozenCount, frozenCount: 0, diedAt: null, lastActive: now, recoveriesUsed: e.recoveriesUsed + 1 };
}

/** Activate today: counts once per 24h cycle. */
export function activateStreak(s: Streak, now: number): Streak {
  const e = evaluateStreak(s, now);
  if (e.lastActive != null && e.diedAt == null && e.count > 0 && now - e.lastActive < DAY && new Date(e.lastActive).toDateString() === new Date(now).toDateString()) return e;
  return { ...e, count: e.count + 1, lastActive: now, diedAt: null, frozenCount: 0 };
}

/** Friend streak lights only if BOTH friends dueled that day. */
export const friendStreakLit = (meDueled: boolean, friendDueled: boolean) => meDueled && friendDueled;

export function makeUserId() {
  return `#LUMI-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const PET_STAGES = [
  { id: "egg", days: 0, name: "Belum Menetas" },
  { id: "hatched", days: 3, name: "Baru Menetas" },
  { id: "mini", days: 10, name: "Mini" },
  { id: "medium", days: 40, name: "Medium" },
  { id: "epic", days: 90, name: "Epic" },
  { id: "legendary", days: 160, name: "Legendary" },
  { id: "superpower", days: 250, name: "Superpower" },
] as const;
export function petStage(days: number) {
  return [...PET_STAGES].reverse().find((s) => days >= s.days) ?? PET_STAGES[0];
}
export const wrongReaction = (wrongNumber: number) => (["laughing", "angry", "shaking"] as const)[Math.max(0, wrongNumber - 1) % 3] ?? "shaking";
export function quizStandings<T extends { userId: string; points: number; completed: boolean }>(players: T[]) {
  return players.filter((p) => p.completed).sort((a, b) => b.points - a.points).map((p, _, all) => ({ ...p, place: 1 + all.filter((other) => other.points > p.points).length }));
}
export const sharedStreakComplete = (invited: boolean, completions: boolean[]) => invited && completions.length >= 2 && completions.every(Boolean);
