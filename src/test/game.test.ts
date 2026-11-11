import { describe, expect, it } from "vitest";
import { getRank, clampQuestions, clampMinutes, newStreak, activateStreak, evaluateStreak, recoverStreak, canRecover, friendStreakLit, duelPoints, petStage, wrongReaction, quizStandings, sharedStreakComplete } from "@/lib/game";

const H = 3600 * 1000;
const t0 = new Date(2026, 10, 1, 10).getTime();

describe("rank", () => {
  it("has 25 sub-ranks from Plankton I to Paus Samudra V", () => {
    expect(getRank(0).name).toBe("Plankton I");
    expect(getRank(999999).name).toBe("Paus Samudra V");
  });
});
describe("quiz limits", () => {
  it("caps questions at 75 and minutes at 60", () => {
    expect(clampQuestions(100)).toBe(75);
    expect(clampMinutes(90)).toBe(60);
  });
});
describe("streak", () => {
  it("dies after 24h without activity", () => {
    const s = activateStreak(newStreak(), t0);
    expect(evaluateStreak(s, t0 + 25 * H).count).toBe(0);
  });
  it("can be recovered within 24h after dying", () => {
    let s = activateStreak(newStreak(), t0);
    s = activateStreak(s, t0 + 23 * H);
    const r = recoverStreak(s, t0 + 23 * H + 30 * H);
    expect(r.count).toBe(2);
  });
  it("is lost permanently after the 24h recovery window", () => {
    const s = activateStreak(newStreak(), t0);
    expect(canRecover(s, t0 + 49 * H)).toBe(false);
    expect(evaluateStreak(s, t0 + 49 * H).count).toBe(0);
  });
  it("allows only 5 recoveries per month", () => {
    let s = { ...activateStreak(newStreak(), t0), recoveriesUsed: 5, recoveryMonth: "2026-10" };
    expect(canRecover(s, t0 + 30 * H)).toBe(false);
    s = { ...s, recoveriesUsed: 4 };
    expect(canRecover(s, t0 + 30 * H)).toBe(true);
  });
  it("friend streak needs both friends to duel", () => {
    expect(friendStreakLit(true, false)).toBe(false);
    expect(friendStreakLit(true, true)).toBe(true);
  });
});
describe("duel points", () => {
  it("gives 10 per correct answer before bonuses, 0 when wrong", () => {
    expect(duelPoints(true, 30, 1)).toBe(10);
    expect(duelPoints(false, 1, 3)).toBe(0);
  });
});

describe("Lumi evolution", () => {
  it.each([[0,"egg"],[2,"egg"],[3,"hatched"],[9,"hatched"],[10,"mini"],[39,"mini"],[40,"medium"],[89,"medium"],[90,"epic"],[159,"epic"],[160,"legendary"],[249,"legendary"],[250,"superpower"],[300,"superpower"]])("day %i evolves into %s", (days, id) => {
    expect(petStage(Number(days)).id).toBe(id);
  });
  it("cycles all three wrong-answer reactions", () => {
    expect([1,2,3,4].map(wrongReaction)).toEqual(["laughing","angry","shaking","laughing"]);
  });
  it("ranks completed players by real points with ties", () => {
    expect(quizStandings([{userId:"a",points:10,completed:true},{userId:"b",points:20,completed:true},{userId:"c",points:20,completed:true},{userId:"d",points:99,completed:false}]).map((p) => [p.userId,p.place])).toEqual([["b",1],["c",1],["a",3]]);
  });
  it("individual activity without an invitation cannot activate duo", () => {
    expect(sharedStreakComplete(false, [true,true])).toBe(false);
  });
  it("duo needs completion by both invited players", () => {
    expect(sharedStreakComplete(true, [true,false])).toBe(false);
    expect(sharedStreakComplete(true, [true,true])).toBe(true);
  });
  it("group needs completion by every invited player", () => {
    expect(sharedStreakComplete(true, [true,true,false])).toBe(false);
    expect(sharedStreakComplete(true, [true,true,true])).toBe(true);
  });
});

import { reviewSummary, addQuizHistory, type QuizRecord } from "@/lib/game";
describe("quiz review", () => {
  const item = (answer: number, picked: number | null) => ({ q: "?", options: ["a", "b", "c", "d"], answer, explain: "", picked });
  it("counts correct, wrong and unanswered questions", () => {
    expect(reviewSummary([item(0, 0), item(1, 2), item(3, null), item(2, 2)])).toEqual({ correct: 2, wrong: 1, skipped: 1, score: 50 });
  });
  it("keeps the 10 newest quizzes and replaces a re-saved quiz", () => {
    const rec = (id: string): QuizRecord => ({ id, title: id, mode: "solo", at: 0, items: [] });
    let list: QuizRecord[] = [];
    for (let k = 0; k < 12; k++) list = addQuizHistory(list, rec(`q${k}`));
    expect(list).toHaveLength(10);
    expect(list[0]?.id).toBe("q11");
    list = addQuizHistory(list, rec("q5"));
    expect(list.filter((r) => r.id === "q5")).toHaveLength(1);
    expect(list[0]?.id).toBe("q5");
  });
});
