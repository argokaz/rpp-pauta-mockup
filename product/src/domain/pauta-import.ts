import { z } from "zod";
import { segmentTypeSchema, type Segment } from "./schemas";

const timeValueSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/);

export const importSourceSchema = z.enum(["whatsapp", "email", "document", "other"]);

export const structuredPautaSegmentSchema = z.object({
  startTime: timeValueSchema,
  endTime: timeValueSchema,
  type: segmentTypeSchema,
  title: z.string(),
  sequence: z.string(),
  topic: z.string(),
  focus: z.string(),
  guestName: z.string(),
  guestRole: z.string(),
  audienceQuestion: z.string(),
  productionCues: z.array(z.string()),
  notes: z.string(),
  confidence: z.number().min(0).max(1),
  sourceExcerpt: z.string(),
});

export const pautaProposalSchema = z.object({
  documentType: z.enum(["pre", "post", "unknown"]),
  detectedProgramName: z.string(),
  detectedDate: z.string(),
  hosts: z.array(z.string()),
  producers: z.array(z.string()),
  warnings: z.array(z.string()),
  segments: z.array(structuredPautaSegmentSchema),
});

export const structurePautaRequestSchema = z.object({
  programId: z.string().min(1).max(100),
  programName: z.string().min(1).max(200),
  targetDate: z.iso.date(),
  plannedStart: timeValueSchema,
  plannedEnd: timeValueSchema,
  sourceChannel: importSourceSchema,
  rawText: z.string().trim().min(20).max(60_000),
});

export const structurePautaResponseSchema = z.object({
  importId: z.string().uuid(),
  model: z.string(),
  proposal: pautaProposalSchema,
});

export type ImportSource = z.infer<typeof importSourceSchema>;
export type StructuredPautaSegment = z.infer<typeof structuredPautaSegmentSchema>;
export type PautaProposal = z.infer<typeof pautaProposalSchema>;
export type StructurePautaRequest = z.infer<typeof structurePautaRequestSchema>;
export type StructurePautaResponse = z.infer<typeof structurePautaResponseSchema>;

export function proposalSegmentToSegment(segment: StructuredPautaSegment): Segment {
  return {
    id: crypto.randomUUID(),
    startTime: segment.startTime,
    endTime: segment.endTime,
    type: segment.type,
    title: segment.title,
    guest: segment.guestName,
    notes: segment.notes,
    sequence: segment.sequence,
    topic: segment.topic,
    focus: segment.focus,
    guestRole: segment.guestRole,
    audienceQuestion: segment.audienceQuestion,
    productionCues: segment.productionCues,
    confidence: segment.confidence,
    sourceExcerpt: segment.sourceExcerpt,
  };
}
