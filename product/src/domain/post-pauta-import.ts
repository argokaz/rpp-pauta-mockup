import { z } from "zod";

const clockSchema = z.string().regex(/^\d{2}:\d{2}$/);
const participantRoleSchema = z.enum(["host", "guest", "producer", "reporter", "specialist", "other"]);
const segmentTypeSchema = z.enum(["opening", "interview", "live", "audience", "sequence", "sports", "cue", "other"]);

export const plannedPostParticipantSchema = z.object({
  personId: z.string(), name: z.string(), role: participantRoleSchema,
  roleDescription: z.string(), organization: z.string(),
});

export const plannedPostSegmentSchema = z.object({
  id: z.string(), startTime: z.string(), endTime: z.string(), title: z.string(),
  type: segmentTypeSchema.default("other"), sequence: z.string().default(""),
  topic: z.string(), guest: z.string(), stories: z.array(z.string()),
  participants: z.array(plannedPostParticipantSchema).default([]),
});

export const postComparisonParticipantSchema = z.object({
  personId: z.string(), detectedName: z.string(), displayName: z.string(), role: participantRoleSchema,
  roleDescription: z.string(), organization: z.string(),
  matchStatus: z.enum(["database_exact", "database_fuzzy", "new", "review"]),
  matchConfidence: z.number().min(0).max(1),
  evidenceSource: z.enum(["transcript", "program_profile"]), sourceExcerpt: z.string(),
});

export const postComparisonBlockSchema = z.object({
  matchedSegmentId: z.string(), title: z.string(), type: segmentTypeSchema,
  sequence: z.string(), topic: z.string(),
  matchStatus: z.enum(["matched", "changed", "new", "unconfirmed"]),
  evidenceStatus: z.enum(["explicit", "inferred", "missing"]),
  disposition: z.enum(["aired", "partial", "skipped", "added_live", "unconfirmed"]),
  evidenceStartMs: z.number().int().nonnegative(), evidenceEndMs: z.number().int().nonnegative(),
  actualStart: z.string(), actualEnd: z.string(), durationMinutes: z.number().int().nonnegative(),
  postSummary: z.string(), keyQuote: z.string(), sourceExcerpt: z.string(),
  participants: z.array(postComparisonParticipantSchema), confidence: z.number().min(0).max(1),
  reviewReasons: z.array(z.string()),
});

export const postComparisonProposalSchema = z.object({
  summary: z.string(), warnings: z.array(z.string()), blocks: z.array(postComparisonBlockSchema),
});

export const structurePostPautaRequestSchema = z.object({
  programId: z.string().min(1), programName: z.string().min(1),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rawText: z.string().min(20).max(120_000),
  sourceType: z.enum(["document", "youtube_captions"]).default("document"),
  programStartTime: clockSchema.default("00:00"), programEndTime: clockSchema.default("23:59"),
  plannedSegments: z.array(plannedPostSegmentSchema).max(120),
});

export const structurePostPautaResponseSchema = z.object({
  importId: z.string(), model: z.string(), proposal: postComparisonProposalSchema,
});

export type PostComparisonParticipant = z.infer<typeof postComparisonParticipantSchema>;
export type PostComparisonBlock = z.infer<typeof postComparisonBlockSchema>;
export type PostComparisonProposal = z.infer<typeof postComparisonProposalSchema>;
export type StructurePostPautaRequest = z.infer<typeof structurePostPautaRequestSchema>;
export type StructurePostPautaResponse = z.infer<typeof structurePostPautaResponseSchema>;

export type PostKnownPerson = {
  id: string; displayName: string; aliases: string[]; primaryRole: string; organization: string;
  editorialRoles: string[]; programRoles: Array<{ programId: string; role: string; roleDescription: string }>;
};

export type PostComparisonGuardContext = {
  sourceType?: StructurePostPautaRequest["sourceType"];
  programStartTime?: string; programEndTime?: string;
  knownPeople?: PostKnownPerson[]; programHosts?: PostKnownPerson[];
};

export const VIDEO_GRID_SEGMENT_PREFIX = "video-grid-";

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(previous[rightIndex] + 1, current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function similarity(leftValue: string, rightValue: string): number {
  const left = normalized(leftValue); const right = normalized(rightValue);
  const longest = Math.max(left.length, right.length);
  if (!longest) return 1;
  const full = 1 - (levenshtein(left, right) / longest);
  const leftTokens = left.split(" ").filter(Boolean); const rightTokens = right.split(" ").filter(Boolean);
  const tokenScore = leftTokens.reduce((total, token) => total + rightTokens.reduce((score, candidate) => {
    const length = Math.max(token.length, candidate.length);
    return Math.max(score, length ? 1 - (levenshtein(token, candidate) / length) : 0);
  }, 0), 0) / Math.max(leftTokens.length, 1);
  return Math.max(full, tokenScore * .95);
}

function resolveKnownPerson(name: string, people: PostKnownPerson[]): { person: PostKnownPerson; score: number; exact: boolean } | null {
  const target = normalized(name);
  if (!target || target.split(" ").length < 2) return null;
  const ranked = people.map((person) => {
    const names = [person.displayName, ...person.aliases];
    const exact = names.some((candidate) => normalized(candidate) === target);
    return { person, exact, score: exact ? 1 : Math.max(...names.map((candidate) => similarity(name, candidate))) };
  }).sort((left, right) => right.score - left.score);
  const first = ranked[0]; const second = ranked[1];
  if (!first || (!first.exact && (first.score < .86 || (second && first.score - second.score < .06)))) return null;
  return first;
}

function clockMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number); return (hours * 60) + minutes;
}

export function videoGridSegments(input: Pick<StructurePostPautaRequest, "rawText" | "sourceType" | "programStartTime" | "programEndTime" | "plannedSegments">): StructurePostPautaRequest["plannedSegments"] {
  if (input.sourceType !== "youtube_captions" || input.plannedSegments.length) return input.plannedSegments;
  const timestampPattern = /\[(\d{2}):(\d{2}):(\d{2})\]/g;
  let match: RegExpExecArray | null; let lastOffsetMinutes = 15;
  while ((match = timestampPattern.exec(input.rawText))) {
    lastOffsetMinutes = Math.max(lastOffsetMinutes, (Number(match[1]) * 60) + Number(match[2]) + (Number(match[3]) / 60));
  }
  const start = clockMinutes(input.programStartTime); const configuredEnd = clockMinutes(input.programEndTime);
  const scheduledDuration = Math.max(15, configuredEnd > start ? configuredEnd - start : (24 * 60) - start + configuredEnd);
  const coveredMinutes = Math.min(scheduledDuration, Math.max(15, Math.ceil(lastOffsetMinutes / 15) * 15));
  return Array.from({ length: Math.ceil(coveredMinutes / 15) }, (_, index) => {
    const offset = index * 15; const endOffset = Math.min(coveredMinutes, offset + 15);
    const offsetLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    return {
      id: `${VIDEO_GRID_SEGMENT_PREFIX}${index + 1}`,
      startTime: formatClock(start + offset), endTime: formatClock(start + endOffset),
      title: `Tramo de video ${index + 1}`, type: "other" as const, sequence: "",
      topic: `Analiza captions entre [${offsetLabel(offset)}] y [${offsetLabel(endOffset)}]`,
      guest: "", stories: [], participants: [],
    };
  });
}

function formatClock(minutes: number): string {
  const bounded = Math.max(0, Math.min((24 * 60) - 1, Math.round(minutes)));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

function roundedQuarterFromMs(milliseconds: number): number {
  return Math.max(0, Math.round(milliseconds / 900_000) * 15);
}

function transcriptTimes(block: PostComparisonBlock, startTime: string, endTime: string): Pick<PostComparisonBlock, "actualStart" | "actualEnd" | "durationMinutes"> {
  const programStart = clockMinutes(startTime); const programEnd = Math.max(programStart + 15, clockMinutes(endTime));
  const start = Math.min(programEnd - 15, programStart + roundedQuarterFromMs(block.evidenceStartMs));
  const proposedEnd = programStart + roundedQuarterFromMs(Math.max(block.evidenceEndMs, block.evidenceStartMs + 900_000));
  const end = Math.min(programEnd, Math.max(start + 15, proposedEnd));
  return { actualStart: formatClock(start), actualEnd: formatClock(end), durationMinutes: end - start };
}

function normalizeYoutubeTimeline(blocks: PostComparisonBlock[]): PostComparisonBlock[] {
  const scheduled = blocks.map((block, index) => ({ block, index }))
    .filter(({ block }) => block.disposition !== "unconfirmed" && block.actualStart && block.actualEnd)
    .sort((left, right) => left.block.evidenceStartMs - right.block.evidenceStartMs || left.index - right.index);
  const changes = new Map<number, Pick<PostComparisonBlock, "actualEnd" | "durationMinutes">>();
  for (let index = 0; index < scheduled.length; index += 1) {
    const current = scheduled[index]; const next = scheduled[index + 1];
    const start = clockMinutes(current.block.actualStart); let end = clockMinutes(current.block.actualEnd);
    if (next && next.block.evidenceStartMs > current.block.evidenceStartMs) {
      const nextStart = clockMinutes(next.block.actualStart);
      if (nextStart > start && nextStart < end) end = nextStart;
    }
    if (!current.block.matchedSegmentId && end - start > 30) end = start + 30;
    end = Math.max(start + 15, end);
    changes.set(current.index, { actualEnd: formatClock(end), durationMinutes: end - start });
  }
  return blocks.map((block, index) => changes.has(index) ? { ...block, ...changes.get(index)! } : block);
}

function supportedParticipant(participant: PostComparisonParticipant, blockExcerpt: string, source: string,
  people: PostKnownPerson[], programHostIds: Set<string>): PostComparisonParticipant | null {
  const direct = participant.personId ? people.find((person) => person.id === participant.personId) : undefined;
  const resolved = direct ? { person: direct, score: 1, exact: true } : resolveKnownPerson(participant.detectedName || participant.displayName, people);
  const isKnownProgramHost = Boolean(resolved && participant.role === "host" && programHostIds.has(resolved.person.id));
  const excerpt = participant.sourceExcerpt.trim() || blockExcerpt.trim();
  const excerptSupported = Boolean(excerpt) && source.includes(normalized(excerpt));
  if (!excerptSupported && !isKnownProgramHost) return null;
  if (resolved) return {
    ...participant, personId: resolved.person.id, displayName: resolved.person.displayName,
    roleDescription: participant.roleDescription || resolved.person.primaryRole,
    organization: participant.organization || resolved.person.organization,
    matchStatus: resolved.exact ? "database_exact" : "database_fuzzy", matchConfidence: resolved.score,
    evidenceSource: isKnownProgramHost && !excerptSupported ? "program_profile" : "transcript",
    sourceExcerpt: excerptSupported ? excerpt : "",
  };
  const candidateName = (participant.displayName || participant.detectedName).trim();
  if (!excerptSupported || normalized(candidateName).split(" ").length < 2) return null;
  return { ...participant, personId: "", displayName: candidateName, matchStatus: "new",
    matchConfidence: Math.min(participant.matchConfidence, .78), evidenceSource: "transcript", sourceExcerpt: excerpt };
}

function missingPlannedBlock(segment: StructurePostPautaRequest["plannedSegments"][number]): PostComparisonBlock {
  return {
    matchedSegmentId: segment.id, title: segment.title, type: segment.type, sequence: segment.sequence, topic: segment.topic,
    matchStatus: "unconfirmed", evidenceStatus: "missing", disposition: "unconfirmed",
    evidenceStartMs: 0, evidenceEndMs: 0, actualStart: "", actualEnd: "", durationMinutes: 0,
    postSummary: "", keyQuote: "", sourceExcerpt: "", participants: [], confidence: 0,
    reviewReasons: ["No se encontró evidencia suficiente en la fuente."],
  };
}

export function guardPostComparison(proposal: PostComparisonProposal, rawText: string,
  plannedSegments: StructurePostPautaRequest["plannedSegments"], context: PostComparisonGuardContext = {}): PostComparisonProposal {
  const source = normalized(rawText); const plannedIds = new Set(plannedSegments.map((segment) => segment.id));
  const knownPeople = context.knownPeople ?? []; const programHosts = context.programHosts ?? [];
  const programHostIds = new Set(programHosts.map((person) => person.id)); const seen = new Set<string>();
  const blocks = proposal.blocks.flatMap((block) => {
    if (block.matchedSegmentId && !plannedIds.has(block.matchedSegmentId)) return [];
    if (block.matchedSegmentId && seen.has(block.matchedSegmentId)) return [];
    if (block.matchedSegmentId) seen.add(block.matchedSegmentId);
    const excerptSupported = Boolean(block.sourceExcerpt.trim()) && source.includes(normalized(block.sourceExcerpt));
    const quoteSupported = Boolean(block.keyQuote.trim()) && source.includes(normalized(block.keyQuote));
    if (!excerptSupported) {
      const planned = plannedSegments.find((segment) => segment.id === block.matchedSegmentId);
      return planned ? [missingPlannedBlock(planned)] : [];
    }
    const participants = block.participants.flatMap((participant) => {
      const supported = supportedParticipant(participant, block.sourceExcerpt, source, knownPeople, programHostIds);
      return supported ? [supported] : [];
    });
    let reviewReasons = [...block.reviewReasons];
    if (context.sourceType === "youtube_captions") {
      reviewReasons = reviewReasons.filter((reason) => !/(confirmar|revisar).*(emitid|si salio|si fue emitid)|duda.*emitid/i.test(normalized(reason)));
      if (participants.length > 0 && participants.every((participant) => participant.matchStatus === "database_exact")) {
        reviewReasons = reviewReasons.filter((reason) => !/(nombre|apellido|ortograf|transcrip.*nombre)/i.test(normalized(reason)));
      }
    }
    for (const participant of participants) {
      if (participant.matchStatus === "database_fuzzy") reviewReasons.push(`Confirmar nombre sugerido: ${participant.displayName}.`);
      if (participant.matchStatus === "new") reviewReasons.push(`Revisar nueva persona: ${participant.displayName}.`);
    }
    if (context.sourceType === "youtube_captions") {
      const times = transcriptTimes(block, context.programStartTime ?? "00:00", context.programEndTime ?? "23:59");
      return [{ ...block, ...times,
        matchStatus: block.matchedSegmentId ? (block.matchStatus === "changed" ? "changed" as const : "matched" as const) : "new" as const,
        evidenceStatus: "explicit" as const,
        disposition: block.matchedSegmentId ? "aired" as const : "added_live" as const,
        keyQuote: quoteSupported ? block.keyQuote : "", participants, reviewReasons: [...new Set(reviewReasons)] }];
    }
    const excerpt = normalized(block.sourceExcerpt); let disposition = block.disposition;
    if (disposition === "partial" && !/(parcial|incomplet|interrump|cortad|quedo pendiente)/.test(excerpt) && /(se emit|emitid|salio|al aire)/.test(excerpt)) disposition = "aired";
    if (disposition === "skipped" && !/(no salio|no se emit|cancel|retir|suspend)/.test(excerpt)) disposition = "unconfirmed";
    const actualStart = block.actualStart && source.includes(normalized(block.actualStart)) ? block.actualStart : "";
    const actualEnd = block.actualEnd && source.includes(normalized(block.actualEnd)) ? block.actualEnd : "";
    return [{ ...block, disposition, actualStart, actualEnd,
      durationMinutes: actualStart && actualEnd ? Math.max(0, clockMinutes(actualEnd) - clockMinutes(actualStart)) : 0,
      keyQuote: quoteSupported ? block.keyQuote : "", participants, reviewReasons: [...new Set(reviewReasons)] }];
  });

  for (const segment of plannedSegments) if (!seen.has(segment.id)) blocks.push(missingPlannedBlock(segment));
  if (context.sourceType === "youtube_captions" && blocks.length) {
    const firstActionable = blocks.find((block) => block.disposition !== "unconfirmed");
    if (firstActionable) {
      const present = new Set(firstActionable.participants.map((participant) => participant.personId).filter(Boolean));
      const hostParticipants: PostComparisonParticipant[] = programHosts.filter((host) => !present.has(host.id)).map((host) => ({
        personId: host.id, detectedName: host.displayName, displayName: host.displayName, role: "host",
        roleDescription: host.primaryRole || "Conducción", organization: host.organization || "RPP",
        matchStatus: "database_exact", matchConfidence: 1, evidenceSource: "program_profile", sourceExcerpt: "",
      }));
      firstActionable.participants = [...hostParticipants, ...firstActionable.participants];
    }
  }
  const normalizedBlocks = context.sourceType === "youtube_captions" ? normalizeYoutubeTimeline(blocks) : blocks;
  const warnings = [...proposal.warnings];
  if (plannedSegments.some((segment) => !seen.has(segment.id))) warnings.push("Los bloques sin evidencia en la fuente siguen sin confirmar; no se marcan como no emitidos.");
  if (normalizedBlocks.some((block) => block.participants.some((participant) => participant.matchStatus === "new" || participant.matchStatus === "database_fuzzy"))) warnings.push("Los nombres nuevos o aproximados quedan señalados para corrección antes de guardar.");
  return { ...proposal, warnings: [...new Set(warnings)], blocks: normalizedBlocks };
}
