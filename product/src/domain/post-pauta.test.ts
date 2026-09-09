import { describe, expect, it } from "vitest";
import { markStoryResult, moveStoryInActualOrder, segmentResultComplete, storyResultComplete } from "./post-pauta";
import type { Segment, StoryItem } from "./schemas";

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


describe("pendientes de cierre de emisión", () => {
  const block: Segment = { id: "test", title: "Entrevista", startTime: "10:00", endTime: "10:15", type: "interview", guest: "", notes: "" };

  it("no permite cerrar un resumen sin confirmar qué salió", () => {
    expect(segmentResultComplete({ ...block, postSummary: "Conversación sobre salud." })).toBe(false);
    expect(segmentResultComplete({ ...block, disposition: "aired", postSummary: "  " })).toBe(false);
    expect(segmentResultComplete({ ...block, disposition: "aired", postSummary: "Conversación sobre salud." })).toBe(true);
  });

  it("un bloque omitido no exige resumir sus noticias", () => {
    expect(segmentResultComplete({ ...block, disposition: "skipped", stories: [story("1")] })).toBe(true);
  });

  it("cada noticia debe tener resultado y resumen o estar omitida", () => {
    const stories = [{ ...story("1"), disposition: "aired" as const, postSummary: "Informe emitido." }, story("2")];
    expect(segmentResultComplete({ ...block, disposition: "aired", postSummary: "Resumen general", stories })).toBe(false);
    expect(segmentResultComplete({ ...block, stories: [stories[0], { ...stories[1], disposition: "skipped" }] })).toBe(true);
  });
});
