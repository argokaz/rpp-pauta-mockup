import { describe, expect, it } from "vitest";
import { guardPostComparison, type PostComparisonProposal } from "./post-pauta-import";

const planned = [
  { id: "seg-1", startTime: "10:00", endTime: "10:15", title: "Apertura", topic: "", guest: "", stories: [] },
  { id: "seg-2", startTime: "10:15", endTime: "10:45", title: "Uso del celular", topic: "Pantallas", guest: "Erika Alvarez", stories: [] },
];

describe("guardrails de post-pauta", () => {
  it("no convierte la ausencia de un bloque en no emitido", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [{ matchedSegmentId: "seg-1", title: "Apertura", matchStatus: "matched", evidenceStatus: "explicit", disposition: "aired", actualStart: "10:00", actualEnd: "10:12", postSummary: "Salió la apertura.", keyQuote: "", sourceExcerpt: "La apertura salió de 10:00 a 10:12" }] };
    const result = guardPostComparison(proposal, "La apertura salió de 10:00 a 10:12", planned);
    expect(result.blocks.find((block) => block.matchedSegmentId === "seg-2")?.disposition).toBe("unconfirmed");
  });

  it("descarta citas y evidencia que no existen literalmente", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [{ matchedSegmentId: "seg-2", title: "Uso del celular", matchStatus: "changed", evidenceStatus: "explicit", disposition: "aired", actualStart: "10:20", actualEnd: "10:42", postSummary: "Entrevista emitida.", keyQuote: "Una cita inventada", sourceExcerpt: "Fragmento inventado" }] };
    const result = guardPostComparison(proposal, "La entrevista con Erika se emitió.", planned);
    expect(result.blocks[0].disposition).toBe("unconfirmed");
    expect(result.blocks[0].keyQuote).toBe("");
    expect(result.blocks[0].sourceExcerpt).toBe("");
  });

  it("no interpreta una duración menor como emisión parcial", () => {
    const proposal: PostComparisonProposal = { summary: "", warnings: [], blocks: [{ matchedSegmentId: "seg-2", title: "Uso del celular", matchStatus: "changed", evidenceStatus: "explicit", disposition: "partial", actualStart: "10:18", actualEnd: "10:43", postSummary: "Entrevista emitida.", keyQuote: "", sourceExcerpt: "10:18 a 10:43 se emitió la entrevista sobre uso del celular" }] };
    const result = guardPostComparison(proposal, "10:18 a 10:43 se emitió la entrevista sobre uso del celular", planned);
    expect(result.blocks[0].disposition).toBe("aired");
  });
});
