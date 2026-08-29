import { z } from "zod";
import { segmentTypeSchema, type Segment } from "./schemas";

const timeValueSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^$/);

export const structuredPautaStorySchema = z.object({
  reference: z.string(),
  title: z.string(),
  format: z.string(),
  mediaCue: z.string(),
  summary: z.string(),
  notes: z.string(),
  confidence: z.number().min(0).max(1),
  sourceExcerpt: z.string(),
});

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
  stories: z.array(structuredPautaStorySchema),
  confidence: z.number().min(0).max(1),
  sourceExcerpt: z.string(),
});

export const pautaProposalSchema = z.object({
  layoutMode: z.enum(["timed", "news_pool", "freeform"]),
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
  rawText: z.string().trim().min(20).max(60_000),
});

export const structurePautaResponseSchema = z.object({
  importId: z.string().uuid(),
  model: z.string(),
  processingMode: z.enum(["local", "luna", "fallback"]),
  proposal: pautaProposalSchema,
});

export type StructuredPautaStory = z.infer<typeof structuredPautaStorySchema>;
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
    stories: segment.stories,
    confidence: segment.confidence,
    sourceExcerpt: segment.sourceExcerpt,
  };
}
