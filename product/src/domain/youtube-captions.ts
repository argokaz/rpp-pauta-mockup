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

export type CaptionPauseRange = {
  startMs: number;
  endMs: number;
  reason: "explicit_break" | "promotional_content";
};

export type PreparedCaptionDocument = {
  document: string;
  totalBlocks: number;
  editorialBlocks: number;
  discardedBlocks: number;
  discardedMs: number;
  pauseRanges: CaptionPauseRange[];
};

export type CaptionPreparationOptions = {
  programAliases?: string[];
};

type CaptionBoundaryMatch = { index: number; length: number };

const BREAK_START_PATTERN = /\b(?:(?:vamos|iremos|entramos|hacemos|nos\s+vamos)\s+(?:ahora\s+)?(?:a|con)\s+(?:(?:un|una)\s+)?(?:breve\s+)?(?:pausa|corte(?:\s+comercial)?|comerciales)|(?:despu[eé]s|luego)\s+de\s+(?:la\s+)?pausa\s+(?:volvemos|regresamos|continuamos)|(?:en\s+breve|ya)\s+(?:volvemos|regresamos))\b/i;
const PROGRAM_RETURN_PATTERN = /\b(?:(?:ya\s+)?estamos\s+(?:de\s+)?(?:vuelta|regreso)|(?:ya\s+)?estamos(?:\s+\[[^\]]+\])?\s+(?:aqu[ií]\s+en|aqu[ií]\s+)?(?:con|en)|de\s+vuelta\s+con|retomamos(?:\s+el|\s+la|\s+con)?|(?:continuamos|seguimos|volvemos|regresamos)\s+(?:aqu[ií]|en|con)|hola[,\s]+[a-záéíóúñ]{2,}(?:[.!?]|\s+oye\b))/i;
const CLOCK_RETURN_PATTERN = /^(?:\[[^\]]+\]\s*)?(?:son|sue[nñ]a)\s+las\s+\d{1,2}(?::\d{2}|\s+y\s+\d{1,2})\b/i;
const PROMOTIONAL_PATTERNS = [
  /\b(?:auspiciad[oa]|presentad[oa])\s+por\b/i,
  /\b(?:descarga|instala)\s+(?:ahora\s+)?(?:la|nuestra)\s+app\b/i,
  /\b(?:oferta|promoci[oó]n|descuento|t[eé]rminos\s+y\s+condiciones)\b/i,
  /\b(?:compra|contrata|llama|visita|ingresa|entra)\s+(?:ahora|hoy|al|a|en)\b/i,
  /\b(?:www\.|\.com\b|\.pe\b|punto\s+pe\b)\b/i,
  /\b(?:no\s+te\s+pierdas|de\s+lunes\s+a\s+viernes|confianza\s+y\s+credibilidad\s+por\s+todos\s+los\s+medios)\b/i,
  /\b(?:s\/?\.?\s*\d+[.,]\d{2}|\d{2,3}\s*%\s+de\s+descuento)\b/i,
];
const MUSIC_PATTERN = /\[(?:m[uú]sica|aplausos?)\]|\b(?:cortina|jingle)\b/i;

function proportionalTime(block: ReadableCaptionBlock, characterIndex: number): number {
  if (!block.text.length) return block.startMs;
  const progress = Math.max(0, Math.min(1, characterIndex / block.text.length));
  return Math.round(block.startMs + ((block.endMs - block.startMs) * progress));
}

function promotionalScore(text: string): number {
  return PROMOTIONAL_PATTERNS.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0)
    + (MUSIC_PATTERN.test(text) ? 1 : 0);
}

function isHighConfidencePromotion(text: string): boolean {
  const score = promotionalScore(text);
  return score >= 2 || (score >= 1 && normalizedWords(text).length <= 18);
}

function regexBoundaryMatch(text: string, pattern: RegExp): CaptionBoundaryMatch | null {
  const match = text.match(pattern);
  return match ? { index: match.index ?? 0, length: match[0].length } : null;
}

function normalizedForBoundary(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function findProgramReturn(text: string, programAliases: string[]): CaptionBoundaryMatch | null {
  const explicit = regexBoundaryMatch(text, PROGRAM_RETURN_PATTERN) ?? regexBoundaryMatch(text, CLOCK_RETURN_PATTERN);
  if (explicit) return explicit;
  if (!MUSIC_PATTERN.test(text)) return null;
  const normalizedText = normalizedForBoundary(text);
  for (const alias of programAliases) {
    const normalizedAlias = normalizedForBoundary(alias.trim());
    if (normalizedAlias.length < 5) continue;
    const index = normalizedText.lastIndexOf(normalizedAlias);
    if (index >= 0 && (index >= normalizedText.length * .6 || normalizedText.length - index - normalizedAlias.length <= 36)) {
      return { index, length: alias.length };
    }
  }
  return null;
}

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

export function prepareCaptionsForPostPauta(segments: YoutubeCaptionSegment[], options: CaptionPreparationOptions = {}): PreparedCaptionDocument {
  const blocks = readableCaptionBlocks(segments, 30_000);
  const programAliases = options.programAliases?.filter(Boolean) ?? [];
  const output: Array<{ startMs: number; text: string }> = [];
  const pauseRanges: CaptionPauseRange[] = [];
  let pauseStartMs: number | null = null;
  let discardedBlocks = 0;
  let discardedMs = 0;
  let editorialBlocks = 0;

  const keep = (startMs: number, text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    output.push({ startMs, text: clean });
    editorialBlocks += 1;
  };

  const closePause = (endMs: number, reason: CaptionPauseRange["reason"] = "explicit_break") => {
    if (pauseStartMs === null) return;
    const boundedEnd = Math.max(pauseStartMs, endMs);
    pauseRanges.push({ startMs: pauseStartMs, endMs: boundedEnd, reason });
    discardedMs += boundedEnd - pauseStartMs;
    output.push({ startMs: boundedEnd, text: "[REGRESO AL PROGRAMA]" });
    pauseStartMs = null;
  };

  for (const block of blocks) {
    const breakMatch = block.text.match(BREAK_START_PATTERN);
    const returnMatch = findProgramReturn(block.text, programAliases);

    if (pauseStartMs !== null) {
      if (!returnMatch) {
        discardedBlocks += 1;
        continue;
      }
      const returnIndex = returnMatch.index;
      const returnMs = proportionalTime(block, returnIndex);
      closePause(returnMs);
      keep(returnMs, block.text.slice(returnIndex));
      continue;
    }

    if (breakMatch) {
      const breakIndex = breakMatch.index ?? 0;
      const breakMs = proportionalTime(block, breakIndex);
      keep(block.startMs, block.text.slice(0, breakIndex));
      output.push({ startMs: breakMs, text: "[INICIO DE PAUSA]" });
      pauseStartMs = breakMs;
      discardedBlocks += 1;

      const remainingText = block.text.slice(breakIndex + breakMatch[0].length);
      const sameBlockReturn = findProgramReturn(remainingText, programAliases);
      if (sameBlockReturn) {
        const returnIndex = breakIndex + breakMatch[0].length + sameBlockReturn.index;
        const returnMs = proportionalTime(block, returnIndex);
        closePause(returnMs);
        keep(returnMs, block.text.slice(returnIndex));
      }
      continue;
    }

    if (isHighConfidencePromotion(block.text)) {
      discardedBlocks += 1;
      discardedMs += Math.max(0, block.endMs - block.startMs);
      pauseRanges.push({ startMs: block.startMs, endMs: block.endMs, reason: "promotional_content" });
      continue;
    }

    keep(block.startMs, block.text);
  }

  if (pauseStartMs !== null) {
    const streamEndMs = blocks.at(-1)?.endMs ?? pauseStartMs;
    pauseRanges.push({ startMs: pauseStartMs, endMs: streamEndMs, reason: "explicit_break" });
    discardedMs += Math.max(0, streamEndMs - pauseStartMs);
  }

  return {
    document: output.map((block) => `[${formatCaptionTime(block.startMs)}] ${block.text}`).join("\n\n"),
    totalBlocks: blocks.length,
    editorialBlocks,
    discardedBlocks,
    discardedMs,
    pauseRanges,
  };
}

export function captionsAsPostDocument(segments: YoutubeCaptionSegment[]): string {
  return prepareCaptionsForPostPauta(segments).document;
}
