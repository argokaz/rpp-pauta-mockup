import { programs } from "../data/seed";
import { normalizePersonName } from "./people-history";
import type { Emission, Segment } from "./schemas";

export type ArchiveDisposition = "planned" | "aired" | "partial" | "skipped";

export type ArchiveSearchFilters = {
  query: string;
  programId?: string;
  dateFrom?: string;
  dateTo?: string;
  disposition?: ArchiveDisposition;
  limit: number;
  offset: number;
};

export type ArchiveSearchRecord = {
  emissionId: string;
  segmentId: string;
  programId: string;
  date: string;
  producerName: string;
  startTime: string;
  endTime: string;
  title: string;
  guest: string;
  guestRole: string;
  topic: string;
  focus: string;
  summary: string;
  keyQuote: string;
  quoteVerified: boolean;
  disposition?: Segment["disposition"];
  sourceExcerpt: string;
  total: number;
};

export type ArchiveSearchPage = {
  items: ArchiveSearchRecord[];
  total: number;
  hasMore: boolean;
};

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function fuzzyGuestMatch(query: string, guest: string): boolean {
  if (query.length < 4 || !guest) return false;
  const queryTokens = query.split(" ").filter((token) => token.length >= 3);
  const guestTokens = guest.split(" ").filter((token) => token.length >= 3);
  if (!queryTokens.length || !guestTokens.length) return false;

  const matchingTokens = queryTokens.filter((queryToken) => guestTokens.some((guestToken) => {
    const longest = Math.max(queryToken.length, guestToken.length);
    return 1 - (levenshteinDistance(queryToken, guestToken) / longest) >= .72;
  }));
  return matchingTokens.length >= Math.min(2, queryTokens.length);
}

function matchesDisposition(segment: Segment, disposition?: ArchiveDisposition): boolean {
  if (!disposition) return true;
  if (disposition === "planned") return !segment.disposition;
  if (disposition === "aired") return segment.disposition === "aired" || segment.disposition === "added_live";
  return segment.disposition === disposition;
}

function recordFor(emission: Emission, segment: Segment): ArchiveSearchRecord {
  return {
    emissionId: emission.id,
    segmentId: segment.id,
    programId: emission.programId,
    date: emission.date,
    producerName: emission.producerName,
    startTime: segment.startTime,
    endTime: segment.endTime,
    title: segment.title,
    guest: segment.guest,
    guestRole: segment.guestRole ?? "",
    topic: segment.topic ?? "",
    focus: segment.focus ?? "",
    summary: segment.postSummary || segment.focus || segment.topic || segment.notes,
    keyQuote: segment.keyQuote ?? "",
    quoteVerified: segment.quoteVerified === true,
    disposition: segment.disposition,
    sourceExcerpt: segment.sourceExcerpt ?? "",
    total: 0,
  };
}

export function searchArchiveLocally(emissions: Emission[], filters: ArchiveSearchFilters): ArchiveSearchPage {
  const normalizedQuery = normalizePersonName(filters.query);
  const matches = emissions
    .flatMap((emission) => emission.segments.map((segment) => ({ emission, segment })))
    .filter(({ emission, segment }) => {
      if (filters.programId && emission.programId !== filters.programId) return false;
      if (filters.dateFrom && emission.date < filters.dateFrom) return false;
      if (filters.dateTo && emission.date > filters.dateTo) return false;
      if (!matchesDisposition(segment, filters.disposition)) return false;
      if (!normalizedQuery) return true;

      const program = programs.find((item) => item.id === emission.programId);
      const haystack = normalizePersonName([
        program?.name,
        segment.title,
        segment.guest,
        segment.guestRole,
        segment.topic,
        segment.focus,
        segment.notes,
        segment.postSummary,
        segment.keyQuote,
        segment.sourceExcerpt,
        emission.rawText,
        emission.producerName,
      ].filter(Boolean).join(" "));
      return haystack.includes(normalizedQuery) || fuzzyGuestMatch(normalizedQuery, normalizePersonName(segment.guest));
    })
    .sort((left, right) => right.emission.date.localeCompare(left.emission.date)
      || left.segment.startTime.localeCompare(right.segment.startTime));

  const total = matches.length;
  const items = matches
    .slice(filters.offset, filters.offset + filters.limit)
    .map(({ emission, segment }) => ({ ...recordFor(emission, segment), total }));
  return { items, total, hasMore: filters.offset + items.length < total };
}
