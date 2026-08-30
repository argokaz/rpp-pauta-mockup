import type { PautaProposal } from "./pauta-import";

type GuardrailResult = {
  proposal: PautaProposal;
  requiresFallback: boolean;
  issues: string[];
};

const MONTHS: Record<number, string> = {
  1: "ENERO",
  2: "FEBRERO",
  3: "MARZO",
  4: "ABRIL",
  5: "MAYO",
  6: "JUNIO",
  7: "JULIO",
  8: "AGOSTO",
  9: "SEPTIEMBRE",
  10: "OCTUBRE",
  11: "NOVIEMBRE",
  12: "DICIEMBRE",
};

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”‘’]/g, "\"")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cleanPersonValue(value: string): string {
  return value
    .split(/\s+(?:-|–|—|\|)\s+/u)[0]
    .replace(/[.;,]+$/g, "")
    .trim();
}

export function extractExplicitGuestNames(rawText: string): string[] {
  const names: string[] = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();
    const labeled = line.match(/^(?:INVITAD[OA]S?|ENTREVISTAD[OA]S?|ENTREVISTA\s+A)\s*:\s*(.+)$/iu);
    if (labeled?.[1]) {
      const name = cleanPersonValue(labeled[1]);
      if (name) names.push(name);
      continue;
    }

  }

  return [...new Map(names.map((name) => [normalized(name), name])).values()];
}

function extractLabeledPeople(rawText: string, label: "CONDUCCION" | "PRODUCCION"): string[] {
  const people: string[] = [];
  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = normalized(rawLine);
    const match = line.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "u"));
    if (!match?.[1]) continue;
    people.push(...match[1].split(/\s*(?:,|\/\/|\/|\bY\b)\s*/u).filter(Boolean));
  }
  return people;
}

function includesPerson(candidates: string[], person: string): boolean {
  const personKey = normalized(person);
  return candidates.some((candidate) => {
    const candidateKey = normalized(candidate);
    return candidateKey === personKey || candidateKey.includes(personKey) || personKey.includes(candidateKey);
  });
}

function excerptSupportsGuest(sourceExcerpt: string, guestName: string): boolean {
  const excerpt = normalized(sourceExcerpt);
  const name = normalized(guestName);
  const hasGuestMarker = /\b(?:INVITADO|INVITADA|INVITADOS|INVITADAS|ENTREVISTADO|ENTREVISTADA|ENTREVISTA A)\s*:/u.test(excerpt);
  return hasGuestMarker && excerpt.includes(name);
}

function rawContainsTime(rawText: string, time: string): boolean {
  if (!time) return true;
  const [hours, minutes] = time.split(":");
  if (!hours || !minutes) return false;
  const hour = String(Number(hours));
  return new RegExp(`(^|\\D)0?${hour}[.:]${minutes}(?!\\d)`, "m").test(rawText);
}

function rawContainsTargetDate(rawText: string, targetDate: string): boolean {
  const match = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, monthValue, dayValue] = match;
  const day = String(Number(dayValue));
  const month = String(Number(monthValue));
  const monthName = MONTHS[Number(monthValue)];
  const source = normalized(rawText);
  const textual = new RegExp(`(^|\\D)0?${day}\\s+DE\\s+${monthName}\\s+(?:DE\\s+)?${year}(?!\\d)`, "u");
  const numeric = new RegExp(`(^|\\D)0?${day}[\\/-]0?${month}[\\/-]${year}(?!\\d)`, "u");
  return textual.test(source) || numeric.test(source) || source.includes(targetDate);
}

function appendUniqueWarnings(existing: string[], additions: string[]): string[] {
  const seen = new Set<string>();
  return [...existing, ...additions].filter((warning) => {
    const key = normalized(warning);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function applyPautaGuardrails(
  proposal: PautaProposal,
  rawText: string,
  targetDate: string,
): GuardrailResult {
  const expectedGuests = extractExplicitGuestNames(rawText);
  const explicitHosts = extractLabeledPeople(rawText, "CONDUCCION");
  const explicitProducers = extractLabeledPeople(rawText, "PRODUCCION");
  const issues: string[] = [];
  const extractedGuests: string[] = [];

  const segments = proposal.segments.map((segment, index) => {
    let next = { ...segment };

    if (segment.startTime && !rawContainsTime(rawText, segment.startTime)) {
      issues.push(`Bloque ${index + 1}: se retiró la hora inicial ${segment.startTime} porque no aparece en el texto original.`);
      next = { ...next, startTime: "", confidence: Math.min(next.confidence, 0.55) };
    }
    if (segment.endTime && !rawContainsTime(rawText, segment.endTime)) {
      issues.push(`Bloque ${index + 1}: se retiró la hora final ${segment.endTime} porque no aparece en el texto original.`);
      next = { ...next, endTime: "", confidence: Math.min(next.confidence, 0.55) };
    }

    if (segment.guestName) {
      if (includesPerson(expectedGuests, segment.guestName) && excerptSupportsGuest(segment.sourceExcerpt, segment.guestName)) {
        extractedGuests.push(segment.guestName);
      } else {
        issues.push(
          `Bloque ${index + 1}: “${segment.guestName}” no tiene una etiqueta explícita de invitación dentro de la evidencia del bloque; se retiró del campo Invitado.`,
        );
        next = { ...next, guestName: "", guestRole: "", confidence: Math.min(next.confidence, 0.55) };
      }
    }

    const participants = (segment.participants ?? []).filter((participant) => {
      const supported = includesPerson(expectedGuests, participant.name) && excerptSupportsGuest(participant.sourceExcerpt, participant.name);
      if (supported) extractedGuests.push(participant.name);
      else issues.push(`Bloque ${index + 1}: se retiró a “${participant.name}” de participantes porque no tiene una etiqueta explícita verificable.`);
      return supported;
    });
    if (segment.participants) next = { ...next, participants };

    return next;
  });

  const missingGuests = expectedGuests.filter((guest) => !includesPerson(extractedGuests, guest));
  if (missingGuests.length > 0) {
    issues.push(`Faltan invitados identificados explícitamente en el original: ${missingGuests.join(", ")}.`);
  }

  const hosts = proposal.hosts.filter((person) => {
    const supported = includesPerson(explicitHosts, person);
    if (!supported) issues.push(`Se retiró “${person}” de Conducción porque el texto no lo marca explícitamente con CONDUCCIÓN:.`);
    return supported;
  });
  const producers = proposal.producers.filter((person) => {
    const supported = includesPerson(explicitProducers, person);
    if (!supported) issues.push(`Se retiró “${person}” de Producción porque el texto no lo marca explícitamente con PRODUCCIÓN:.`);
    return supported;
  });

  let detectedDate = proposal.detectedDate;
  if (rawContainsTargetDate(rawText, targetDate)) {
    detectedDate = targetDate;
  } else if (detectedDate && detectedDate !== targetDate) {
    issues.push(`La fecha detectada (${detectedDate}) no coincide con la fecha seleccionada (${targetDate}); debe revisarse.`);
  }

  return {
    proposal: {
      ...proposal,
      detectedDate,
      hosts,
      producers,
      segments,
      warnings: appendUniqueWarnings(proposal.warnings, issues),
    },
    requiresFallback: missingGuests.length > 0,
    issues,
  };
}
