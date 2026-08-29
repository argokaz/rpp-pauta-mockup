import { z } from "zod";

export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  hosts: z.string(),
  managed: z.boolean(),
  active: z.boolean(),
});

export const scheduleSlotSchema = z.object({
  id: z.string(),
  programId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

export const segmentTypeSchema = z.enum(["opening", "interview", "live", "audience", "sequence", "sports", "cue", "other"]);

export const storyItemSchema = z.object({
  reference: z.string(),
  title: z.string(),
  format: z.string(),
  mediaCue: z.string(),
  summary: z.string(),
  notes: z.string(),
  confidence: z.number().min(0).max(1),
  sourceExcerpt: z.string(),
  actualOrder: z.number().int().nonnegative().optional(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  disposition: z.enum(["aired", "partial", "skipped", "added_live"]).optional(),
  postSummary: z.string().optional(),
});

export const segmentSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: segmentTypeSchema,
  title: z.string(),
  guest: z.string(),
  notes: z.string(),
  sequence: z.string().optional(),
  topic: z.string().optional(),
  focus: z.string().optional(),
  guestRole: z.string().optional(),
  audienceQuestion: z.string().optional(),
  productionCues: z.array(z.string()).optional(),
  stories: z.array(storyItemSchema).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sourceExcerpt: z.string().optional(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  disposition: z.enum(["aired", "partial", "skipped", "added_live"]).optional(),
  postSummary: z.string().optional(),
  keyQuote: z.string().optional(),
  quoteVerified: z.boolean().optional(),
  version: z.number().int().nonnegative().optional(),
  lastEditedAt: z.string().optional(),
});

export const postPautaSchema = z.object({
  reviewStatus: z.enum(["capture", "review", "verified"]),
  sourceType: z.enum(["none", "youtube", "audio", "internal"]),
  sourceUrl: z.string(),
  transcriptStatus: z.enum(["none", "pending", "processing", "ready", "failed"]),
  notes: z.string(),
  verifiedAt: z.string().optional(),
});

export const emissionSchema = z.object({
  id: z.string(),
  programId: z.string(),
  date: z.string(),
  status: z.enum(["empty", "draft", "ready", "post"]),
  rawText: z.string(),
  producerName: z.string().default(""),
  segments: z.array(segmentSchema),
  postPauta: postPautaSchema.optional(),
  updatedAt: z.string(),
});

export const bulletinSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  scope: z.string(),
});

export const importantDateSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  details: z.string(),
  plans: z.record(z.string(), z.string()),
});

export const appearanceRoleSchema = z.enum(["host", "guest", "producer", "reporter", "specialist", "other"]);

export const appearanceSchema = z.object({
  id: z.string(),
  personId: z.string(),
  programId: z.string(),
  date: z.string(),
  role: appearanceRoleSchema,
  roleDescription: z.string(),
  summary: z.string(),
  segmentTitle: z.string(),
  topic: z.string(),
  focus: z.string(),
  sourceExcerpt: z.string(),
  quotes: z.array(z.object({
    text: z.string(),
    verified: z.boolean(),
  })).optional(),
});

export const personSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  normalizedName: z.string(),
  aliases: z.array(z.string()),
  primaryRole: z.string(),
  organization: z.string(),
  notes: z.string(),
  appearances: z.array(appearanceSchema),
});

export const workspaceStateSchema = z.object({
  bulletins: z.array(bulletinSchema),
  importantDates: z.array(importantDateSchema),
  emissions: z.array(emissionSchema),
  people: z.array(personSchema).default([]),
});

export type Program = z.infer<typeof programSchema>;
export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type StoryItem = z.infer<typeof storyItemSchema>;
export type PostPauta = z.infer<typeof postPautaSchema>;
export type Emission = z.infer<typeof emissionSchema>;
export type Bulletin = z.infer<typeof bulletinSchema>;
export type ImportantDate = z.infer<typeof importantDateSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type Person = z.infer<typeof personSchema>;
export type WorkspaceState = z.infer<typeof workspaceStateSchema>;
