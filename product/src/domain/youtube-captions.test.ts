import { describe, expect, it } from "vitest";
import {
  captionsAsPostDocument,
  formatCaptionTime,
  readableCaptionBlocks,
  youtubeVideoId,
} from "./youtube-captions";

describe("youtubeVideoId", () => {
  it("reconoce el enlace real de Encendidos del viernes 28", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=lDsn5FMTmSk")).toBe("lDsn5FMTmSk");
  });

  it("acepta formatos de transmisión, enlace corto y embed", () => {
    expect(youtubeVideoId("https://youtube.com/live/lDsn5FMTmSk?feature=share")).toBe("lDsn5FMTmSk");
    expect(youtubeVideoId("https://youtu.be/lDsn5FMTmSk")).toBe("lDsn5FMTmSk");
    expect(youtubeVideoId("https://www.youtube-nocookie.com/embed/lDsn5FMTmSk")).toBe("lDsn5FMTmSk");
  });

  it("rechaza dominios y códigos inválidos", () => {
    expect(youtubeVideoId("https://example.com/watch?v=lDsn5FMTmSk")).toBeNull();
    expect(youtubeVideoId("demasiado-corto")).toBeNull();
  });
});

describe("captions legibles", () => {
  const segments = [
    { startMs: 0, endMs: 1_500, text: "Hola mundo" },
    { startMs: 1_200, endMs: 3_000, text: "mundo desde RPP" },
    { startMs: 22_000, endMs: 24_000, text: "Segundo bloque" },
  ];

  it("elimina la repetición de captions progresivos", () => {
    expect(readableCaptionBlocks(segments)).toEqual([
      { startMs: 0, endMs: 3_000, text: "Hola mundo desde RPP" },
      { startMs: 22_000, endMs: 24_000, text: "Segundo bloque" },
    ]);
  });

  it("conserva timestamps para el documento de post-pauta", () => {
    expect(captionsAsPostDocument(segments)).toContain("[00:00:00] Hola mundo desde RPP Segundo bloque");
    expect(formatCaptionTime(3_661_000)).toBe("01:01:01");
  });
});
