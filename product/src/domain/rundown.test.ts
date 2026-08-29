import { describe, expect, it } from "vitest";
import { durationMinutes, endTimeForDuration, formatDuration, reorderItems } from "./rundown";

describe("rundown timing", () => {
  it("calculates regular and overnight durations", () => {
    expect(durationMinutes("10:15", "10:45")).toBe(30);
    expect(durationMinutes("23:45", "00:15")).toBe(30);
  });

  it("applies quick durations without losing minute precision", () => {
    expect(endTimeForDuration("10:17", 15)).toBe("10:32");
    expect(endTimeForDuration("23:50", 30)).toBe("00:20");
  });

  it("formats totals for editorial summaries", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(150)).toBe("2 h 30 min");
  });
});

describe("rundown ordering", () => {
  it("moves a block while preserving its content", () => {
    expect(reorderItems(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
});
