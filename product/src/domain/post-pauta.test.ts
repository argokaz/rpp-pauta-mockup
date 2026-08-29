import { describe, expect, it } from "vitest";
import { markStoryResult, moveStoryInActualOrder, storyResultComplete } from "./post-pauta";
import type { StoryItem } from "./schemas";

const story = (reference: string): StoryItem => ({
  reference,
  title: `Noticia ${reference}`,
  format: "INF",
  mediaCue: "",
  summary: "",
  notes: "",
  confidence: 1,
  sourceExcerpt: "",
});

describe("post-pauta por noticia", () => {
  it("registra el resultado sin perder la noticia original", () => {
    const result = markStoryResult([story("T1"), story("T2")], 1, "aired", "10:18");
    expect(result[1]).toMatchObject({ reference: "T2", disposition: "aired", actualStart: "10:18", actualEnd: "10:18", actualOrder: 0 });
  });

  it("permite reconstruir el orden real", () => {
    const result = moveStoryInActualOrder([story("1"), story("2"), story("3")], 2, -1);
    expect(result.map((item) => item.reference)).toEqual(["1", "3", "2"]);
    expect(result.map((item) => item.actualOrder)).toEqual([0, 1, 2]);
  });

  it("considera completa una omitida o una emitida con resumen", () => {
    expect(storyResultComplete({ ...story("1"), disposition: "skipped" })).toBe(true);
    expect(storyResultComplete({ ...story("2"), disposition: "aired" })).toBe(false);
    expect(storyResultComplete({ ...story("3"), disposition: "partial", postSummary: "Se emitió el informe principal." })).toBe(true);
  });
});
