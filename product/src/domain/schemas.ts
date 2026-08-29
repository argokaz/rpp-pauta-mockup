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

export const segmentSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: z.enum(["opening", "interview", "live", "audience", "sequence", "sports", "cue", "other"]),
  title: z.string(),
  guest: z.string(),
  notes: z.string(),
});

export const emissionSchema = z.object({
  id: z.string(),
  programId: z.string(),
  date: z.string(),
  status: z.enum(["empty", "draft", "ready", "post"]),
  rawText: z.string(),
  segments: z.array(segmentSchema),
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

export const workspaceStateSchema = z.object({
  bulletins: z.array(bulletinSchema),
  importantDates: z.array(importantDateSchema),
  emissions: z.array(emissionSchema),
});

export type Program = z.infer<typeof programSchema>;
export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Emission = z.infer<typeof emissionSchema>;
export type Bulletin = z.infer<typeof bulletinSchema>;
export type ImportantDate = z.infer<typeof importantDateSchema>;
export type WorkspaceState = z.infer<typeof workspaceStateSchema>;
