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