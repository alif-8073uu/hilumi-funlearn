export type Multiplication = { left: number; right: number };

export function createMultiplication(random = Math.random): Multiplication {
  return { left: Math.floor(random() * 10) + 1, right: Math.floor(random() * 10) + 1 };
}

export function isCorrectAnswer(question: Multiplication, answer: string): boolean {
  return /^\d+$/.test(answer.trim()) && Number(answer) === question.left * question.right;
}

export function canResetPassword(verifiedRecovery: boolean, question: Multiplication, answer: string): boolean {
  return verifiedRecovery && isCorrectAnswer(question, answer);
}
export type ResetAnswers = { nick: string; streak: number; tier: number };
/** All three account facts must match: nickname (case-insensitive), current streak, and rank tier. */
export function answersMatch(truth: ResetAnswers, given: ResetAnswers): boolean {
  return truth.nick.trim().toLowerCase() === given.nick.trim().toLowerCase() && truth.streak === given.streak && truth.tier === given.tier;
}
