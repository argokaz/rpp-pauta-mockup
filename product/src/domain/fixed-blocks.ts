import type { Emission, FixedBlock, Segment } from "./schemas";
import { endTimeForDuration } from "./rundown";

export function fixedBlockAppliesOnDate(block: FixedBlock, date: string): boolean {
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  if (!block.daysOfWeek.includes(dayOfWeek)) return false;
  if (date < block.effectiveFrom) return false;
  if (block.effectiveTo && date > block.effectiveTo) return false;
  return block.active || Boolean(block.effectiveTo);
}

export function fixedBlocksForEmission(blocks: FixedBlock[], programId: string, date: string): FixedBlock[] {
  return blocks
    .filter((block) => block.programId === programId && fixedBlockAppliesOnDate(block, date))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function fixedBlockToSegment(block: FixedBlock, id: string): Segment {
  return {
    id,
    startTime: block.startTime,
    endTime: endTimeForDuration(block.startTime, block.durationMinutes),
    type: block.type,
    title: block.title,
    guest: block.guest,
    guestRole: block.guestRole,
    notes: block.notes,
    sequence: block.sequence || block.title,
    topic: "",
    focus: block.notes,
    stories: [],
    confidence: 1,
    sourceExcerpt: `Bloque fijo: ${block.title}`,
    fixedBlockId: block.id,
    version: 0,
  };
}

export function fixedSegmentId(blockId: string, date: string): string {
  const input = `${blockId}:${date}`;
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  let third = 0x85ebca6b;
  let fourth = 0xc2b2ae35;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x27d4eb2d);
    third = Math.imul(third ^ code, 0x165667b1);
    fourth = Math.imul(fourth ^ code, 0x9e3779b1);
  }
  const hex = [first, second, third, fourth].map((value) => (value >>> 0).toString(16).padStart(8, "0")).join("");
  const versioned = `${hex.slice(0, 12)}4${hex.slice(13, 16)}8${hex.slice(17)}`;
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20, 32)}`;
}

export function prefillEmissionWithFixedBlocks(
  emission: Emission,
  blocks: FixedBlock[],
  idForBlock: (block: FixedBlock) => string,
): Emission {
  const applicable = fixedBlocksForEmission(blocks, emission.programId, emission.date);
  const appliedIds = new Set(emission.appliedFixedBlockIds ?? []);
  const nextSegments = [...emission.segments];
  let changed = false;
  for (const block of applicable) {
    if (appliedIds.has(block.id)) continue;
    const names = [block.title, block.sequence].map(normalized).filter(Boolean);
    const existingIndex = nextSegments.findIndex((segment) => {
      if (segment.fixedBlockId === block.id) return true;
      const candidate = normalized(`${segment.title} ${segment.sequence ?? ""}`);
      return names.some((name) => candidate === name || candidate.includes(name));
    });
    if (existingIndex >= 0) nextSegments[existingIndex] = { ...nextSegments[existingIndex], fixedBlockId: block.id };
    else nextSegments.push(fixedBlockToSegment(block, idForBlock(block)));
    appliedIds.add(block.id);
    changed = true;
  }
  if (!changed) return emission;
  return { ...emission, segments: nextSegments.sort(compareSegments), appliedFixedBlockIds: [...appliedIds] };
}

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compareSegments(a: Segment, b: Segment): number {
  return a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title, "es");
}

export function mergeImportedSegmentsWithFixedBlocks(imported: Segment[], current: Segment[]): Segment[] {
  const fixed = current.filter((segment) => segment.fixedBlockId);
  const merged = [...imported];
  for (const fixedSegment of fixed) {
    const fixedNames = [fixedSegment.title, fixedSegment.sequence ?? ""].map(normalized).filter(Boolean);
    const matchIndex = merged.findIndex((segment) => {
      const candidate = normalized(`${segment.title} ${segment.sequence ?? ""}`);
      return fixedNames.some((name) => candidate === name || candidate.includes(name));
    });
    if (matchIndex >= 0) merged[matchIndex] = { ...merged[matchIndex], fixedBlockId: fixedSegment.fixedBlockId };
    else merged.push(fixedSegment);
  }
  return merged.sort(compareSegments);
}
