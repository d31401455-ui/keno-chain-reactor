import { describe, it, expect } from "vitest";
import { evaluate } from "@/lib/keno";

describe("keno rules", () => {
  it("ICE bridges one empty ICE cell between two hits", () => {
    const r = evaluate({ blue: [1, 3], red: [], drawn: [1, 3], elements: { 2: "ice" }, stake: 1 });
    expect(r.chains[0].length).toBe(2);
    expect(r.edges.some((e) => e.kind === "ice")).toBe(true);
  });
  it("no bridge without ICE", () => {
    const r = evaluate({ blue: [1, 3], red: [], drawn: [1, 3], elements: {}, stake: 1 });
    expect(r.chains.length).toBe(0);
  });
  it("FIRE doubles chain bonus", () => {
    const r = evaluate({ blue: [1, 2], red: [], drawn: [1, 2], elements: { 1: "fire" }, stake: 1 });
    expect(r.chainBonus).toBe(2);
  });
  it("Blue + Red base pays add up", () => {
    const r = evaluate({ blue: [1], red: [40], drawn: [1, 40], elements: {}, stake: 2 });
    expect(r.totalWin).toBe(10);
  });
});
