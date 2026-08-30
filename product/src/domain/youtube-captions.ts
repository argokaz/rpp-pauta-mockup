import { z } from "zod";

export const youtubeCaptionSegmentSchema = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string().min(1),
});

export const youtubeCaptionRequestSchema = z.object({
  programId: z.string().min(1).max(100),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUrl: z.string().url().max(500),
  languageCode: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default("es"),
  refresh: z.boolean().default(false),
});

export const youtubeCaptionResponseSchema = z.object({
  videoId: z.string().length(11),
  sourceUrl: z.string().url(),
  embedUrl: z.string().url(),
  title: z.string(),
  languageCode: z.string(),
  provider: z.string(),
  cached: z.boolean(),
  extractedAt: z.string(),
  segments: z.array(youtubeCaptionSegmentSchema),
});

export type YoutubeCaptionSegment = z.infer<typeof youtubeCaptionSegmentSchema>;
export type YoutubeCaptionRequest = z.infer<typeof youtubeCaptionRequestSchema>;
export type YoutubeCaptionResponse = z.infer<typeof youtubeCaptionResponseSchema>;

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function youtubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  if (hostname === "youtu.be") {
    const candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
  }
  if (!["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(hostname)) return null;
  const candidate = url.pathname === "/watch"
    ? url.searchParams.get("v") ?? ""
    : url.pathname.match(/^\/(?:live|shorts|embed)\/([^/?]+)/)?.[1] ?? "";
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

export function canonicalYoutubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

function normalizedWords(value: string): string[] {
  return value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function appendWithoutRepeatedPrefix(current: string[], incoming: string[]): string[] {
  const maxOverlap = Math.min(current.length, incoming.length, 18);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const tail = current.slice(-overlap).join(" ").toLocaleLowerCase("es");
    const head = incoming.slice(0, overlap).join(" ").toLocaleLowerCase("es");
    if (tail === head) return [...current, ...incoming.slice(overlap)];
  }
  return [...current, ...incoming];
}

export type ReadableCaptionBlock = {
  startMs: number;
  endMs: number;
  text: string;
};

export function readableCaptionBlocks(segments: YoutubeCaptionSegment[], windowMs = 20_000): ReadableCaptionBlock[] {
  const sorted = [...segments].sort((left, right) => left.startMs - right.startMs);
  const blocks: ReadableCaptionBlock[] = [];
  let blockStart = -1;
  let blockEnd = -1;
  let words: string[] = [];

  function flush() {
    const text = words.join(" ").replace(/\s+([,.;:!?])/g, "$1").trim();
    if (text && blockStart >= 0) blocks.push({ startMs: blockStart, endMs: Math.max(blockStart, blockEnd), text });
    blockStart = -1;
    blockEnd = -1;
    words = [];
  }

  for (const segment of sorted) {
    if (!segment.text.trim()) continue;
    if (blockStart >= 0 && segment.startMs - blockStart >= windowMs) flush();
    if (blockStart < 0) blockStart = segment.startMs;
    blockEnd = Math.max(blockEnd, segment.endMs);
    words = appendWithoutRepeatedPrefix(words, normalizedWords(segment.text));
  }
  flush();
  return blocks;
}

export function formatCaptionTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function captionsAsPostDocument(segments: YoutubeCaptionSegment[]): string {
  return readableCaptionBlocks(segments, 30_000)
    .map((block) => `[${formatCaptionTime(block.startMs)}] ${block.text}`)
    .join("\n\n");
}
