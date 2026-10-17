"use client";

import type { PautaProposal, StructuredPautaSegment } from "@/domain/pauta-import";
import { findSimilarPeople, normalizePersonName } from "@/domain/people-history";
import { durationMinutes, formatDuration } from "@/domain/rundown";
import type { Person, Program } from "@/domain/schemas";

const typeLabels: Record<StructuredPautaSegment["type"], string> = {
  opening: "Apertura",
  interview: "Entrevista",
  live: "Vivo",
  audience: "Audiencia",
  sequence: "Secuencia",
  sports: "Deportes",
  cue: "Cue",
  other: "Otro",
};

type PautaAiReviewProps = {
  proposal: PautaProposal;
  model: string;
  processingMode: "local" | "luna" | "fallback";
  applying: boolean;
  people: Person[];
  program: Program;
  producerName: string;
  willReplace: boolean;
  onChange: (proposal: PautaProposal) => void;
  onProducerNameChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
};

function segmentPeople(segment: StructuredPautaSegment) {
  if (segment.participants?.length) return segment.participants.filter((participant) => participant.role !== "host");
  return segment.guestName ? [{ name: segment.guestName, role: "guest" as const, roleDescription: segment.guestRole, organization: "", sourceExcerpt: segment.sourceExcerpt }] : [];
}

/**
 * Vista previa de lo que entendió la lectura automática. No es un segundo
 * editor: aquí solo se confirma o se descarta; los detalles se corrigen
 * después en la escaleta, que es el único lugar de edición.
 */
export function PautaAiReview({ proposal, model, processingMode, applying, people, program, producerName, willReplace, onChange, onProducerNameChange, onClose, onApply }: PautaAiReviewProps) {
  const guestCount = proposal.segments.reduce((total, segment) => total + segmentPeople(segment).length, 0);
  const doubtful = proposal.segments.filter((segment) => segment.confidence < 0.6).length;
  const hostNote = proposal.hosts.length ? proposal.hosts.join(", ") : "";

  function removeSegment(index: number) {
    const target = proposal.segments[index];
    if (!target) return;
    if (target.stories.length && !window.confirm(`Este bloque contiene ${target.stories.length} noticias. ¿Quitarlo de todas formas?`)) return;
    onChange({ ...proposal, segments: proposal.segments.filter((_, segmentIndex) => segmentIndex !== index) });
  }

  return (
    <section className="pauta-preview" aria-labelledby="pauta-preview-title">
      <header className="pauta-preview-header">
        <div>
          <span>Paso 2 de 2 · Revisa y acepta</span>
          <h2 id="pauta-preview-title">Así quedaría la escaleta de {program.shortName}</h2>
          <p>{proposal.segments.length} bloques · {guestCount} {guestCount === 1 ? "invitado detectado" : "invitados detectados"}{doubtful ? ` · ${doubtful} por revisar` : ""}. Después de aceptar puedes editar cualquier bloque.</p>
        </div>
        <button className="quiet-button" onClick={onClose} disabled={applying}>Volver al texto</button>
      </header>

      {proposal.warnings.length > 0 && (
        <ul className="pauta-preview-warnings">
          {proposal.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
        </ul>
      )}

      {hostNote && <p className="pauta-preview-note">Conducción detectada: <strong>{hostNote}</strong>. No se registra como invitado.</p>}

      <ol className="pauta-preview-list">
        {proposal.segments.map((segment, index) => {
          const segmentGuests = segmentPeople(segment);
          const duration = durationMinutes(segment.startTime, segment.endTime);
          return (
            <li key={`${segment.sourceExcerpt.slice(0, 24)}-${index}`} className={segment.confidence < 0.6 ? "doubtful" : ""}>
              <time>{segment.startTime || "--:--"}<small>{segment.endTime ? `a ${segment.endTime}` : ""}{duration ? ` · ${formatDuration(duration)}` : ""}</small></time>
              <div>
                <span className="pauta-preview-type">{typeLabels[segment.type]}{segment.confidence < 0.6 && <b>Revisar</b>}</span>
                <strong>{segment.title || segment.topic || "Bloque sin título"}</strong>
                {segment.topic && segment.topic !== segment.title && <small>{segment.topic}</small>}
                {segmentGuests.length > 0 && (
                  <ul className="pauta-preview-guests">
                    {segmentGuests.map((guest) => {
                      const known = people.find((person) => person.normalizedName === normalizePersonName(guest.name));
                      const similar = known ? undefined : findSimilarPeople(guest.name, people, 1)[0]?.person;
                      return <li key={guest.name}><strong>{guest.name}</strong>{guest.roleDescription && <span>{guest.roleDescription}</span>}<em data-match={known ? "known" : similar ? "similar" : "new"}>{known ? "En la base" : similar ? `¿${similar.displayName}?` : "Persona nueva"}</em></li>;
                    })}
                  </ul>
                )}
                {segment.stories.length > 0 && <small>{segment.stories.length} noticias en este bloque</small>}
              </div>
              <button type="button" disabled={applying} onClick={() => removeSegment(index)} aria-label={`Quitar ${segment.title || `bloque ${index + 1}`}`}>Quitar</button>
            </li>
          );
        })}
      </ol>

      <footer className="pauta-preview-footer">
        <label><span>Productor</span><input list="known-producers" value={producerName} onChange={(event) => onProducerNameChange(event.target.value)} placeholder="Nombre del productor" /></label>
        <div>
          <small>{willReplace ? "Reemplazará la escaleta actual. Los bloques fijos se conservan." : "El texto original se guarda junto a la pauta."} {processingMode === "local" ? "Lectura rápida." : `Modelo: ${model}.`}</small>
          <button className="primary" onClick={onApply} disabled={applying || proposal.segments.length === 0}>{applying ? "Guardando..." : "Aceptar escaleta"}</button>
        </div>
      </footer>
    </section>
  );
}
