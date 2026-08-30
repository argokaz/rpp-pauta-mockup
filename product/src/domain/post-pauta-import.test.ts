import { describe, expect, it } from "vitest";
import { guardPostComparison, videoGridSegments, type PostComparisonBlock, type PostComparisonProposal, type PostKnownPerson } from "./post-pauta-import";

const planned = [
  { id: "seg-1", startTime: "10:00", endTime: "10:15", title: "Apertura", type: "opening" as const, sequence: "", topic: "", guest: "", stories: [], participants: [] },
  { id: "seg-2", startTime: "10:15", endTime: "10:45", title: "Uso del celular", type: "interview" as const, sequence: "", topic: "Pantallas", guest: "Erika Alvarez", stories: [], participants: [] },
];

function block(change: Partial<PostComparisonBlock> = {}): PostComparisonBlock {
  return {
    matchedSegmentId: "seg-1", title: "Apertura", type: "opening", sequence: "", topic: "",
    matchStatus: "matched", evidenceStatus: "explicit", disposition: "aired",
    evidenceStartMs: 0, evidenceEndMs: 900_000, actualStart: "10:00", actualEnd: "10:15", durationMinutes: 15,
    postSummary: "Salió la apertura.", keyQuote: "", sourceExcerpt: "La apertura salió de 10:00 a 10:12",
    participants: [], confidence: .95, reviewReasons: [], ...change,
  };
}

const erika: PostKnownPerson = {
  id: "person-erika", displayName: "Erika Alvarez Veliz", aliases: ["Erika Álvarez"],
  primaryRole: "Psicóloga clínica", organization: "", editorialRoles: ["guest"], programRoles: [],
};

describe("guardrails de post-pauta", () => {
  it("crea una grilla de 15 minutos para analizar un video sin pre-pauta", () => {
    const grid = videoGridSegments({ rawText: "[00:00:04] Apertura\n\n[01:58:10] Despedida", sourceType: "youtube_captions", programStartTime: "08:00", programEndTime: "10:00", plannedSegments: [] });
    expect(grid).toHaveLength(8);
    expect(grid[0]).toMatchObject({ startTime: "08:00", endTime: "08:15" });
    expect(grid[7]).toMatchObject({ startTime: "09:45", endTime: "10:00" });
  });

  it("no convierte la ausencia de un bloque en no emitido", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [block()] };
    const result = guardPostComparison(proposal, "La apertura salió de 10:00 a 10:12", planned);
    expect(result.blocks.find((item) => item.matchedSegmentId === "seg-2")?.disposition).toBe("unconfirmed");
  });

  it("descarta citas y evidencia que no existen literalmente", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [block({ matchedSegmentId: "seg-2", title: "Uso del celular", keyQuote: "Una cita inventada", sourceExcerpt: "Fragmento inventado" })] };
    const result = guardPostComparison(proposal, "La entrevista con Erika se emitió.", planned);
    expect(result.blocks[0].disposition).toBe("unconfirmed");
    expect(result.blocks[0].keyQuote).toBe("");
    expect(result.blocks[0].sourceExcerpt).toBe("");
  });

  it("no interpreta una duración menor como emisión parcial en un documento", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [block({ matchedSegmentId: "seg-2", title: "Uso del celular", disposition: "partial", actualStart: "10:18", actualEnd: "10:43", sourceExcerpt: "10:18 a 10:43 se emitió la entrevista sobre uso del celular" })] };
    const result = guardPostComparison(proposal, "10:18 a 10:43 se emitió la entrevista sobre uso del celular", planned);
    expect(result.blocks[0].disposition).toBe("aired");
  });

  it("marca inmediatamente como emitido lo respaldado por captions y redondea a cuartos de hora", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [block({ matchedSegmentId: "seg-2", title: "Uso del celular", evidenceStartMs: 970_000, evidenceEndMs: 3_280_000, actualStart: "", actualEnd: "", durationMinutes: 0, sourceExcerpt: "Está con nosotros Erika Álvarez" })] };
    const source = "[00:16:10] Está con nosotros Erika Álvarez\n\n[00:54:40] Cerramos la entrevista";
    const result = guardPostComparison(proposal, source, planned, { sourceType: "youtube_captions", programStartTime: "10:00", programEndTime: "12:30" });
    expect(result.blocks[0]).toMatchObject({ disposition: "aired", evidenceStatus: "explicit", actualStart: "10:15", actualEnd: "11:00", durationMinutes: 45 });
  });

  it("usa la ortografía canónica de la base para nombres respaldados", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [block({
      matchedSegmentId: "seg-2", title: "Uso del celular", sourceExcerpt: "Está con nosotros Erika Álvarez",
      participants: [{ personId: "person-erika", detectedName: "Erika Álvarez Bis", displayName: "Erika Álvarez Bis", role: "guest", roleDescription: "Psicóloga", organization: "", matchStatus: "review", matchConfidence: .7, evidenceSource: "transcript", sourceExcerpt: "Está con nosotros Erika Álvarez" }],
    })] };
    const result = guardPostComparison(proposal, "[00:16:10] Está con nosotros Erika Álvarez", planned, { sourceType: "youtube_captions", programStartTime: "10:00", programEndTime: "12:30", knownPeople: [erika] });
    expect(result.blocks[0].participants[0]).toMatchObject({ personId: "person-erika", displayName: "Erika Alvarez Veliz", matchStatus: "database_exact" });
  });

  it("cierra un bloque en el inicio redondeado del siguiente para evitar solapamientos", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [
      block({ matchedSegmentId: "seg-2", title: "Entrevista", evidenceStartMs: 970_000, evidenceEndMs: 3_280_000, sourceExcerpt: "Comienza la entrevista" }),
      block({ matchedSegmentId: "", title: "Llamadas", type: "audience", matchStatus: "new", disposition: "added_live", evidenceStartMs: 2_720_000, evidenceEndMs: 3_250_000, sourceExcerpt: "Abrimos las líneas" }),
    ] };
    const source = "[00:16:10] Comienza la entrevista\n\n[00:45:20] Abrimos las líneas";
    const result = guardPostComparison(proposal, source, planned, { sourceType: "youtube_captions", programStartTime: "10:00", programEndTime: "12:30" });
    expect(result.blocks[0]).toMatchObject({ actualStart: "10:15", actualEnd: "10:45", durationMinutes: 30 });
    expect(result.blocks[1]).toMatchObject({ actualStart: "10:45", actualEnd: "11:00", durationMinutes: 15 });
  });
});
