import type {
  PautaProposal,
  StructurePautaRequest,
  StructuredPautaSegment,
  StructuredPautaStory,
} from "./pauta-import";

const TIME_RANGE = /^\s*([0-2]?\d)[.:]([0-5]\d)\s*(?:-|–|—|a)\s*([0-2]?\d)[.:]([0-5]\d)\s*$/iu;
const NUMBERED_ITEM = /^\s*(?:(T\d+)|(\d+(?:\.\d+)?))\s*(?:[-–—]\s*(.+))?\s*$/iu;
const FIELD_LABEL = /^(?:TEMA|INVITAD[OA]S?|ENTREVISTAD[OA]S?|ENTREVISTA\s+A|ENFOQUE|PREGUNTA(?:\s+PARA\s+EL\s+P[ÚU]BLICO)?|L[ÍI]NEAS?\s+TELEF[ÓO]NICAS?|CONDUCCI[ÓO]N|PRODUCCI[ÓO]N)\s*:/iu;
const MONTHS: Record<string, string> = {
  ENERO: "01",
  FEBRERO: "02",
  MARZO: "03",
  ABRIL: "04",
  MAYO: "05",
  JUNIO: "06",
  JULIO: "07",
  AGOSTO: "08",
  SEPTIEMBRE: "09",
  OCTUBRE: "10",
  NOVIEMBRE: "11",
  DICIEMBRE: "12",
};

export type PautaPreprocessResult = {
  mode: PautaProposal["layoutMode"];
  proposal: PautaProposal | null;
};

function clean(value: string): string {
  return value.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
}

function normalizeKey(value: string): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”‘’]/g, "\"")
    .replace(/[–—]/g, "-")
    .toLocaleUpperCase("es");
}

function looksUppercase(value: string): boolean {
  const letters = value.match(/[A-ZÁÉÍÓÚÜÑa-záéíóúüñ]/g) ?? [];
  if (letters.length < 3) return false;
  const uppercase = letters.filter((letter) => letter === letter.toLocaleUpperCase("es")).length;
  return uppercase / letters.length > 0.82;
}

function readable(value: string): string {
  const normalized = clean(value).replace(/[–—]/g, "-");
  if (!looksUppercase(normalized)) return normalized;
  const lowered = normalized.toLocaleLowerCase("es");
  const sentence = lowered.replace(/(^|[.!?]\s+)([a-záéíóúüñ])/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("es")}`);
  return sentence
    .replace(/\brpp\b/giu, "RPP")
    .replace(/\bpcm\b/giu, "PCM")
    .replace(/\bon\b/giu, "ON")
    .replace(/\boff\b/giu, "OFF")
    .replace(/\binf\b/giu, "INF");
}

function personCase(value: string): string {
  return clean(value)
    .toLocaleLowerCase("es")
    .replace(/(^|[\s'-])([a-záéíóúüñ])/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("es")}`);
}

function timeValue(hours: string, minutes: string): string {
  return `${String(Number(hours)).padStart(2, "0")}:${minutes}`;
}

function extractDate(rawText: string, fallback: string): string {
  const text = normalizeKey(rawText);
  const textual = text.match(/(?:^|\D)(\d{1,2})\s+DE\s+([A-Z]+)\s+(?:DE\s+)?(20\d{2})(?!\d)/u);
  if (textual?.[1] && textual[2] && textual[3] && MONTHS[textual[2]]) {
    return `${textual[3]}-${MONTHS[textual[2]]}-${String(Number(textual[1])).padStart(2, "0")}`;
  }
  const numeric = text.match(/(?:^|\D)(\d{1,2})[/-](\d{1,2})[/-](20\d{2})(?!\d)/u);
  if (numeric?.[1] && numeric[2] && numeric[3]) {
    return `${numeric[3]}-${String(Number(numeric[2])).padStart(2, "0")}-${String(Number(numeric[1])).padStart(2, "0")}`;
  }
  return fallback;
}

function extractPeople(rawText: string, label: "CONDUCCION" | "PRODUCCION"): string[] {
  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = normalizeKey(rawLine);
    const match = line.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "u"));
    if (!match?.[1]) continue;
    return match[1]
      .split(/\s*(?:,|\/\/|\/|\bY\b)\s*/u)
      .map(personCase)
      .filter(Boolean);
  }
  return [];
}

function extractField(lines: string[], label: RegExp): string {
  const start = lines.findIndex((line) => label.test(line));
  if (start < 0) return "";
  const first = lines[start].replace(label, "").trim();
  const values = first ? [first] : [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const next = clean(lines[index]);
    if (!next || FIELD_LABEL.test(next) || TIME_RANGE.test(next) || /^-{3,}$/u.test(next)) break;
    values.push(next);
  }
  return readable(values.join(" "));
}

function parseGuests(lines: string[]): Array<{ name: string; role: string; sourceExcerpt: string }> {
  return lines.flatMap((line) => {
    const cleaned = clean(line);
    if (!/^(?:INVITAD[OA]S?|ENTREVISTAD[OA]S?|ENTREVISTA\s+A)\s*:/iu.test(cleaned)) return [];
    const value = cleaned.replace(/^(?:INVITAD[OA]S?|ENTREVISTAD[OA]S?|ENTREVISTA\s+A)\s*:\s*/iu, "");
    return value.split(/\s*(?:\/\/|;)\s*/u).flatMap((entry) => {
      const [name = "", ...roleParts] = entry.split(/\s+(?:-|–|—)\s+/u);
      return name.trim() ? [{ name: personCase(name), role: readable(roleParts.join(" - ")), sourceExcerpt: cleaned }] : [];
    });
  });
}

function sequenceName(lines: string[]): string {
  const line = lines.find((item) => /^SECUENCIA\b/iu.test(clean(item)));
  if (!line) return "";
  return readable(clean(line).replace(/^SECUENCIA\s*/iu, "").replace(/^['“”](.+)['“”]$/u, "$1"));
}

function productionCues(lines: string[]): string[] {
  return lines.flatMap((rawLine) => {
    const line = clean(rawLine);
    if (!line || TIME_RANGE.test(line) || FIELD_LABEL.test(line) || /^-{3,}$/u.test(line)) return [];
    if (/^(?:\({2,}|\){2,}|VIVOS?\b|ABRIMOS?\b|L[ÍI]NEAS?\b|PASE\b)/iu.test(line)) return [readable(line)];
    return [];
  });
}

function segmentType(lines: string[], topic: string, sequence: string, guestName: string): StructuredPautaSegment["type"] {
  const text = normalizeKey(lines.join(" "));
  if (/\bVIVOS?\b/u.test(text)) return "live";
  if (/\bABRIMOS?\s+LINEAS|PREGUNTA\s+PARA\s+EL\s+PUBLICO/u.test(text)) return "audience";
  if (/\bDEPORT(?:E|ES|IVO|IVA)\b|FUTBOL/u.test(text)) return "sports";
  if (sequence) return "sequence";
  if (guestName) return "interview";
  if (/\bPASE\b/u.test(text)) return "cue";
  if (/\bSALUDO\b|\bAPERTURA\b/u.test(text)) return "opening";
  return topic ? "other" : "other";
}

function parseTimedSegments(rawText: string): StructuredPautaSegment[] {
  const lines = rawText.replace(/\r/g, "").split("\n");
  const starts: Array<{ index: number; startTime: string; endTime: string }> = [];
  lines.forEach((line, index) => {
    const match = clean(line).match(TIME_RANGE);
    if (!match) return;
    starts.push({
      index,
      startTime: timeValue(match[1], match[2]),
      endTime: timeValue(match[3], match[4]),
    });
  });

  return starts.map((range, index) => {
    const nextStart = starts[index + 1]?.index ?? lines.length;
    const blockLines = lines.slice(range.index + 1, nextStart).filter((line) => !/^-{3,}\s*$/u.test(clean(line)));
    const topic = extractField(blockLines, /^\s*TEMA\s*:\s*/iu);
    const focus = extractField(blockLines, /^\s*ENFOQUE\s*:\s*/iu);
    const audienceQuestion = extractField(blockLines, /^\s*PREGUNTA(?:\s+PARA\s+EL\s+P[ÚU]BLICO)?\s*:\s*/iu);
    const guests = parseGuests(blockLines);
    const guest = guests[0] ?? { name: "", role: "", sourceExcerpt: "" };
    const sequence = sequenceName(blockLines);
    const cues = productionCues(blockLines);
    const firstContent = blockLines.map(clean).find((line) => line && !FIELD_LABEL.test(line) && !/^\({2,}/u.test(line));
    const title = topic || sequence || readable(firstContent ?? "Bloque por completar");
    return {
      startTime: range.startTime,
      endTime: range.endTime,
      type: segmentType(blockLines, topic, sequence, guest.name),
      title,
      sequence,
      topic,
      focus,
      guestName: guest.name,
      guestRole: guest.role,
      participants: guests.map((item) => ({ name: item.name, role: "guest" as const, roleDescription: item.role, organization: "", sourceExcerpt: item.sourceExcerpt })),
      audienceQuestion,
      productionCues: cues,
      notes: topic || focus || firstContent ? "" : "Completar el contenido de este bloque.",
      stories: [],
      confidence: topic || guest.name || firstContent ? 0.98 : 0.72,
      sourceExcerpt: clean([`${range.startTime} - ${range.endTime}`, ...blockLines].join("\n")).slice(0, 1_500),
    };
  });
}

function parseStory(reference: string, rawLines: string[]): StructuredPautaStory | null {
  const lines = rawLines.map(clean).filter(Boolean);
  if (!lines.length) return null;
  const cueIndex = lines.findIndex((line) => /^\(.+\)$/u.test(line));
  const titleIndex = lines.findIndex((_, index) => index !== cueIndex);
  if (titleIndex < 0) return null;
  let titleLine = lines[titleIndex];
  if (/^\++$/u.test(titleLine)) return null;
  const formatMatch = titleLine.match(/^(INF|OFF|ON)\s*(?:-|–|—)?\s*(.+)$/iu);
  const format = formatMatch?.[1]?.toLocaleUpperCase("es") ?? "";
  titleLine = formatMatch?.[2] ?? titleLine;
  const mediaCue = cueIndex >= 0 ? lines[cueIndex].replace(/^\(|\)$/g, "") : "";
  const summaryLines = lines.filter((_, index) => index !== titleIndex && index !== cueIndex);
  return {
    reference,
    title: readable(titleLine),
    format,
    mediaCue: readable(mediaCue),
    summary: readable(summaryLines.join(" ")),
    notes: "",
    confidence: format || summaryLines.length ? 0.98 : 0.78,
    sourceExcerpt: clean([reference, ...rawLines].join("\n")).slice(0, 2_500),
  };
}

export function extractNumberedStories(rawText: string): StructuredPautaStory[] {
  const lines = rawText.replace(/\r/g, "").split("\n");
  const stories: StructuredPautaStory[] = [];
  let reference = "";
  let current: string[] = [];

  function finish() {
    if (!reference) return;
    const story = parseStory(reference, current);
    if (story) stories.push(story);
  }

  for (const line of lines) {
    const marker = clean(line).match(NUMBERED_ITEM);
    if (marker) {
      finish();
      reference = marker[1]?.toLocaleUpperCase("es") ?? marker[2];
      current = marker[3] ? [marker[3]] : [];
      continue;
    }
    if (reference) current.push(line);
  }
  finish();
  return stories;
}

function baseProposal(input: StructurePautaRequest, layoutMode: PautaProposal["layoutMode"]): Omit<PautaProposal, "segments" | "warnings"> {
  const normalized = normalizeKey(input.rawText);
  return {
    layoutMode,
    documentType: /\bPOST\s*-?\s*PAUTA\b/u.test(normalized) ? "post" : /\b(?:PREPAUTA|PAUTA)\b/u.test(normalized) ? "pre" : "unknown",
    detectedProgramName: input.programName,
    detectedDate: extractDate(input.rawText, input.targetDate),
    hosts: extractPeople(input.rawText, "CONDUCCION"),
    producers: extractPeople(input.rawText, "PRODUCCION"),
  };
}

function duplicateStoryWarnings(stories: StructuredPautaStory[]): string[] {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const story of stories) {
    const key = normalizeKey(story.title);
    const previous = seen.get(key);
    if (previous) duplicates.push(`${previous} y ${story.reference}`);
    else seen.set(key, story.reference);
  }
  return duplicates.length ? [`Hay ${duplicates.length} posible${duplicates.length === 1 ? "" : "s"} noticia${duplicates.length === 1 ? "" : "s"} repetida${duplicates.length === 1 ? "" : "s"}: ${duplicates.join(", ")}.`] : [];
}

export function preprocessPauta(input: StructurePautaRequest): PautaPreprocessResult {
  const timedSegments = parseTimedSegments(input.rawText);
  if (timedSegments.length >= 2) {
    const warnings = timedSegments.some((segment) => segment.title === "Bloque por completar")
      ? ["Hay bloques con horario pero sin contenido; se conservaron para completarlos manualmente."]
      : [];
    return {
      mode: "timed",
      proposal: { ...baseProposal(input, "timed"), warnings, segments: timedSegments },
    };
  }

  const stories = extractNumberedStories(input.rawText);
  if (stories.length >= 3) {
    const rawLines = input.rawText.replace(/\r/g, "").split("\n");
    const firstStoryIndex = rawLines.findIndex((line) => NUMBERED_ITEM.test(clean(line)));
    const header = firstStoryIndex >= 0 ? rawLines.slice(0, firstStoryIndex).join("\n") : "";
    const segments: StructuredPautaSegment[] = [];
    if (header.trim()) {
      segments.push({
        startTime: "",
        endTime: "",
        type: "opening",
        title: "Apertura y marcadores",
        sequence: "",
        topic: "Titulares de apertura",
        focus: "",
        guestName: "",
        guestRole: "",
        audienceQuestion: "",
        productionCues: [],
        notes: "Saludo y marcadores conservados desde el original.",
        stories: [],
        confidence: 0.92,
        sourceExcerpt: clean(header).slice(0, 2_500),
      });
    }
    segments.push({
      startTime: "",
      endTime: "",
      type: "other",
      title: `Noticias por ubicar (${stories.length})`,
      sequence: "",
      topic: "Bandeja de noticias",
      focus: "Distribuir estas noticias entre los bloques reales de la emisión cuando se definan las pausas.",
      guestName: "",
      guestRole: "",
      audienceQuestion: "",
      productionCues: [],
      notes: "No se inventaron horarios ni se creó un bloque independiente por cada noticia.",
      stories,
      confidence: 0.98,
      sourceExcerpt: stories.slice(0, 3).map((story) => story.sourceExcerpt).join("\n\n"),
    });
    return {
      mode: "news_pool",
      proposal: {
        ...baseProposal(input, "news_pool"),
        warnings: [
          "Las noticias quedaron en una bandeja sin horarios. Crea los bloques de emisión y distribúyelas según las pausas reales.",
          ...duplicateStoryWarnings(stories),
        ],
        segments,
      },
    };
  }

  return { mode: "freeform", proposal: null };
}
