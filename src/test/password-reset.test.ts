import { describe, expect, it } from "vitest";
import { canResetPassword, createMultiplication, isCorrectAnswer } from "@/lib/password-reset";

describe("Password recovery multiplication", () => {
  it("generates integer products from 1 through 100", () => {
    for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
      const numbers = [(i + 0.5) / 10, (j + 0.5) / 10];
      const question = createMultiplication(() => numbers.shift() ?? 0);
      expect(question.left).toBe(i + 1);
      expect(question.right).toBe(j + 1);
      expect(question.left * question.right).toBeGreaterThanOrEqual(1);
      expect(question.left * question.right).toBeLessThanOrEqual(100);
    }
  });
  it("rejects wrong answers and accepts the correct multiplication", () => {
    expect(isCorrectAnswer({ left: 7, right: 8 }, "55")).toBe(false);
    expect(isCorrectAnswer({ left: 7, right: 8 }, "56")).toBe(true);
    expect(isCorrectAnswer({ left: 7, right: 8 }, "")).toBe(false);
  });
  it("requires email recovery even if the multiplication is correct", () => {
    expect(canResetPassword(false, { left: 7, right: 8 }, "56")).toBe(false);
    expect(canResetPassword(true, { left: 7, right: 8 }, "56")).toBe(true);
  });
});