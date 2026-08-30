import { describe, expect, it } from "vitest";
import {
  captionsAsPostDocument,
  formatCaptionTime,
  prepareCaptionsForPostPauta,
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

  it("descarta una pausa completa y conserva el regreso al programa", () => {
    const prepared = prepareCaptionsForPostPauta([
      { startMs: 0, endMs: 10_000, text: "Conversamos con la especialista sobre salud infantil" },
      { startMs: 31_000, endMs: 45_000, text: "Vamos a una pausa comercial y volvemos" },
      { startMs: 61_000, endMs: 80_000, text: "Compra hoy con veinte por ciento de descuento visita ejemplo punto pe" },
      { startMs: 91_000, endMs: 110_000, text: "Ya estamos de vuelta con nuestra invitada para responder preguntas" },
    ]);

    expect(prepared.document).toContain("[INICIO DE PAUSA]");
    expect(prepared.document).toContain("[REGRESO AL PROGRAMA]");
    expect(prepared.document).toContain("nuestra invitada para responder preguntas");
    expect(prepared.document).not.toContain("Compra hoy");
    expect(prepared.discardedBlocks).toBe(2);
    expect(prepared.pauseRanges).toHaveLength(1);
    expect(prepared.discardedMs).toBeGreaterThan(30_000);
  });

  it("omite promociones aisladas sin eliminar contenido editorial", () => {
    const prepared = prepareCaptionsForPostPauta([
      { startMs: 0, endMs: 9_000, text: "La presidenta respondió las preguntas de RPP" },
      { startMs: 31_000, endMs: 40_000, text: "Descarga ahora nuestra app y visita rpp punto pe" },
      { startMs: 61_000, endMs: 70_000, text: "Analizamos las nuevas medidas del Ejecutivo" },
    ]);

    expect(prepared.document).toContain("La presidenta respondió");
    expect(prepared.document).toContain("Analizamos las nuevas medidas");
    expect(prepared.document).not.toContain("Descarga ahora");
    expect(prepared.discardedBlocks).toBe(1);
    expect(prepared.pauseRanges[0]?.reason).toBe("promotional_content");
  });

  it("retoma una conversación aunque el regreso ocurra al final de una publicidad", () => {
    const prepared = prepareCaptionsForPostPauta([
      { startMs: 0, endMs: 8_000, text: "Terminamos la entrevista y ya volvemos" },
      { startMs: 31_000, endMs: 45_000, text: "Visita ahora nuestra web y descarga la app" },
      { startMs: 61_000, endMs: 80_000, text: "Farmacia Universal, porque cuidar es escuchar. Hola, Chío. Oye, ¿tú sabes qué es la dark web?" },
      { startMs: 91_000, endMs: 100_000, text: "La dark web requiere herramientas especiales" },
    ]);

    expect(prepared.document).not.toContain("Farmacia Universal");
    expect(prepared.document).toContain("Hola, Chío");
    expect(prepared.document).toContain("La dark web requiere");
    expect(prepared.pauseRanges[0]?.endMs).toBeLessThan(80_000);
  });

  it("reconoce la cortina del programa como regreso", () => {
    const prepared = prepareCaptionsForPostPauta([
      { startMs: 0, endMs: 8_000, text: "Nos vamos a un corte y regresamos" },
      { startMs: 31_000, endMs: 45_000, text: "[música] Promoción presentada por una marca" },
      { startMs: 61_000, endMs: 75_000, text: "Titulares en RPP. [música] Encendidos. [música]" },
      { startMs: 91_000, endMs: 105_000, text: "Conversamos con la especialista sobre seguridad digital" },
    ], { programAliases: ["Encendidos"] });

    expect(prepared.document).toContain("[REGRESO AL PROGRAMA]");
    expect(prepared.document).toContain("Encendidos");
    expect(prepared.document).toContain("seguridad digital");
  });
});
