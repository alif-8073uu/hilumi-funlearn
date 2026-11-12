import { describe, expect, it } from "vitest";
import { memberStatus } from "@/lib/member-status";

describe("status anggota duo/grup", () => {
  it("tetap Menunggu sebelum undangan diterima", () => {
    expect(memberStatus(false, { quizGroup: "grup-1" }, "grup-1")).toBe("waiting");
  });

  it("menampilkan Offline saat anggota tidak hadir", () => {
    expect(memberStatus(true, undefined, "grup-1")).toBe("offline");
  });

  it("menampilkan Online saat hadir tetapi tidak sedang kuis", () => {
    expect(memberStatus(true, { quizGroup: null }, "grup-1")).toBe("online");
  });

  it("tidak menampilkan Bergabung untuk kuis grup lain", () => {
    expect(memberStatus(true, { quizGroup: "grup-2" }, "grup-1")).toBe("online");
  });

  it("menampilkan Bergabung hanya saat mengerjakan kuis grup ini", () => {
    expect(memberStatus(true, { quizGroup: "grup-1" }, "grup-1")).toBe("quiz");
  });
});
