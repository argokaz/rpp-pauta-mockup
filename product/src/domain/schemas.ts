import { z } from "zod";

export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  hosts: z.string(),
  managed: z.boolean(),
  active: z.boolean(),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#f4d800"),
});

export const scheduleSlotSchema = z.object({
  id: z.string(),
  programId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  effectiveFrom: z.string().default("2026-01-01"),
  effectiveTo: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const segmentTypeSchema = z.enum(["opening", "interview", "live", "audience", "sequence", "sports", "cue", "other"]);
export const appearanceRoleSchema = z.enum(["host", "guest", "producer", "reporter", "specialist", "other"]);
export const editorialEntityTypeSchema = z.enum(["organization", "place", "event", "incident"]);

export const segmentParticipantSchema = z.object({
  id: z.string(),
  personId: z.string().optional(),
  name: z.string(),
  role: appearanceRoleSchema.default("guest"),
  roleDescription: z.string().default(""),
  organization: z.string().default(""),
  sourceExcerpt: z.string().default(""),
  matchStatus: z.enum(["database_exact", "database_fuzzy", "new", "review"]).optional(),
});

export const editorialEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: editorialEntityTypeSchema,
});

export const fixedBlockSchema = z.object({
  id: z.string(),
  programId: z.string(),
  title: z.string(),
  sequence: z.string().default(""),
  type: segmentTypeSchema.default("sequence"),
  guest: z.string().default(""),
  guestRole: z.string().default(""),
  notes: z.string().default(""),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string(),
  durationMinutes: z.number().int().min(1).max(360),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

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
  participants: z.array(segmentParticipantSchema).optional(),
  entities: z.array(editorialEntitySchema).optional(),
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
  fixedBlockId: z.string().optional(),
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
  appliedFixedBlockIds: z.array(z.string()).optional(),
  postPauta: postPautaSchema.optional(),
  updatedAt: z.string(),
});

export const bulletinSchema = z.object({
  id: z.string(),
  weekStart: z.string().default("2026-08-24"),
  title: z.string(),
  body: z.string(),
  scope: z.string(),
  pinnedRank: z.number().int().min(1).max(4).nullable().default(null),
  updatedAt: z.string().default(""),
});

export const importantDateSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  details: z.string(),
  plans: z.record(z.string(), z.string()),
  category: z.enum(["holiday", "editorial"]).default("editorial"),
  sourceUrl: z.string().default(""),
});

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
  phone: z.string().default(""),
  tags: z.array(z.string()).default([]),
  relationshipType: z.enum(["collaborator", "guest"]).default("guest"),
  editorialRoles: z.array(appearanceRoleSchema).optional(),
  contacts: z.array(z.object({
    id: z.string(),
    type: z.enum(["phone", "whatsapp", "email"]),
    value: z.string(),
    label: z.string().default(""),
    source: z.string().default(""),
    validFrom: z.string().optional(),
    validTo: z.string().nullable().optional(),
    primary: z.boolean().default(false),
  })).optional(),
  programRoles: z.array(z.object({
    id: z.string(),
    programId: z.string(),
    role: appearanceRoleSchema,
    roleDescription: z.string().default(""),
    effectiveFrom: z.string().optional(),
    effectiveTo: z.string().nullable().optional(),
  })).optional(),
  notes: z.string(),
  appearances: z.array(appearanceSchema),
});

export const workspaceStateSchema = z.object({
  programs: z.array(programSchema).default([]),
  scheduleSlots: z.array(scheduleSlotSchema).default([]),
  fixedBlocks: z.array(fixedBlockSchema).default([]),
  bulletins: z.array(bulletinSchema),
  importantDates: z.array(importantDateSchema),
  emissions: z.array(emissionSchema),
  people: z.array(personSchema).default([]),
});

export type Program = z.infer<typeof programSchema>;
export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;
export type FixedBlock = z.infer<typeof fixedBlockSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type SegmentParticipant = z.infer<typeof segmentParticipantSchema>;
export type EditorialEntity = z.infer<typeof editorialEntitySchema>;
export type StoryItem = z.infer<typeof storyItemSchema>;
export type PostPauta = z.infer<typeof postPautaSchema>;
export type Emission = z.infer<typeof emissionSchema>;
export type Bulletin = z.infer<typeof bulletinSchema>;
export type ImportantDate = z.infer<typeof importantDateSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type Person = z.infer<typeof personSchema>;
export type WorkspaceState = z.infer<typeof workspaceStateSchema>;
