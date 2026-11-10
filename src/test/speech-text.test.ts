import { describe, expect, it } from "vitest";
import { toSpokenText } from "@/lib/speech-text";

describe("toSpokenText", () => {
  it("reads s = v × t as words", () => {
    expect(toSpokenText("$s = v \\times t$")).toBe("s sama dengan v kali t");
  });
  it("reads fractions as 'per'", () => {
    expect(toSpokenText("$$v = \\frac{s}{t}$$")).toBe("v sama dengan s per t");
  });
  it("reads squares and removes markdown symbols", () => {
    expect(toSpokenText("**Rumus:** $L = s^2$")).toBe("Rumus: L sama dengan s kuadrat");
  });
});
