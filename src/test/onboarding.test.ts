import { describe, expect, it } from "vitest";
import { shouldShowOnboarding } from "@/lib/onboarding";

describe("New student introduction", () => {
  it("opens after the first signup", () => {
    expect(shouldShowOnboarding(1, undefined)).toBe(true);
  });
  it("does not reopen after completion or skipping", () => {
    expect(shouldShowOnboarding(1, true)).toBe(false);
  });
  it("does not interrupt existing accounts signing in", () => {
    expect(shouldShowOnboarding(undefined, undefined)).toBe(false);
  });
});