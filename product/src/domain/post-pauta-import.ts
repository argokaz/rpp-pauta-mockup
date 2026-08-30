import { z } from "zod";

export const plannedPostSegmentSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string(),
  topic: z.string(),
  guest: z.string(),
  stories: z.array(z.string()),
});

export const postComparisonBlockSchema = z.object({
  matchedSegmentId: z.string(),
  title: z.string(),
  matchStatus: z.enum(["matched", "changed", "new", "unconfirmed"]),
  evidenceStatus: z.enum(["explicit", "inferred", "missing"]),
  disposition: z.enum(["aired", "partial", "skipped", "added_live", "unconfirmed"]),
  actualStart: z.string(),
  actualEnd: z.string(),
  postSummary: z.string(),
  keyQuote: z.string(),
  sourceExcerpt: z.string(),
});

export const postComparisonProposalSchema = z.object({
  summary: z.string(),
  warnings: z.array(z.string()),
  blocks: z.array(postComparisonBlockSchema),
});

export const structurePostPautaRequestSchema = z.object({
  programId: z.string().min(1),
  programName: z.string().min(1),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rawText: z.string().min(20).max(120_000),
  plannedSegments: z.array(plannedPostSegmentSchema).max(120),
});

export const structurePostPautaResponseSchema = z.object({
  importId: z.string(),
  model: z.string(),
  proposal: postComparisonProposalSchema,
});

export type PostComparisonBlock = z.infer<typeof postComparisonBlockSchema>;
export type PostComparisonProposal = z.infer<typeof postComparisonProposalSchema>;
export type StructurePostPautaRequest = z.infer<typeof structurePostPautaRequestSchema>;
export type StructurePostPautaResponse = z.infer<typeof structurePostPautaResponseSchema>;

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
}

export function guardPostComparison(proposal: PostComparisonProposal, rawText: string, plannedSegments: StructurePostPautaRequest["plannedSegments"]): PostComparisonProposal {
  const source = normalized(rawText);
  const plannedIds = new Set(plannedSegments.map((segment) => segment.id));
  const seen = new Set<string>();
  const blocks = proposal.blocks.flatMap((block) => {
    if (block.matchedSegmentId && !plannedIds.has(block.matchedSegmentId)) return [];
    if (block.matchedSegmentId && seen.has(block.matchedSegmentId)) return [];
    if (block.matchedSegmentId) seen.add(block.matchedSegmentId);
    const excerptSupported = Boolean(block.sourceExcerpt.trim()) && source.includes(normalized(block.sourceExcerpt));
    const quoteSupported = Boolean(block.keyQuote.trim()) && source.includes(normalized(block.keyQuote));
    if (!excerptSupported) {
      return [{ ...block, evidenceStatus: "missing" as const, disposition: "unconfirmed" as const, matchStatus: "unconfirmed" as const, actualStart: "", actualEnd: "", keyQuote: "", sourceExcerpt: "" }];
    }
    const excerpt = normalized(block.sourceExcerpt);
    let disposition = block.disposition;
    if (disposition === "partial" && !/(parcial|incomplet|interrump|cortad|quedo pendiente)/.test(excerpt) && /(se emit|emitid|salio|al aire)/.test(excerpt)) disposition = "aired";
    if (disposition === "skipped" && !/(no salio|no se emit|cancel|retir|suspend)/.test(excerpt)) disposition = "unconfirmed";
    const actualStart = block.actualStart && source.includes(normalized(block.actualStart)) ? block.actualStart : "";
    const actualEnd = block.actualEnd && source.includes(normalized(block.actualEnd)) ? block.actualEnd : "";
    return [{ ...block, disposition, actualStart, actualEnd, keyQuote: quoteSupported ? block.keyQuote : "" }];
  });

  for (const segment of plannedSegments) {
    if (seen.has(segment.id)) continue;
    blocks.push({
      matchedSegmentId: segment.id,
      title: segment.title,
      matchStatus: "unconfirmed",
      evidenceStatus: "missing",
      disposition: "unconfirmed",
      actualStart: "",
      actualEnd: "",
      postSummary: "",
      keyQuote: "",
      sourceExcerpt: "",
    });
  }

  return {
    ...proposal,
    warnings: [...new Set([...proposal.warnings, "Un bloque ausente del documento queda sin confirmar; nunca se marca automáticamente como no emitido."])],
    blocks,
  };
}
