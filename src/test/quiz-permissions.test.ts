import { describe, expect, it } from "vitest";
import { canDeleteQuiz } from "@/lib/shared";

describe("quiz invitation deletion", () => {
  it("allows only the inviter to delete the quiz", () => {
    expect(canDeleteQuiz("owner", "owner")).toBe(true);
    expect(canDeleteQuiz("owner", "friend")).toBe(false);
    expect(canDeleteQuiz("owner", null)).toBe(false);
  });
});
