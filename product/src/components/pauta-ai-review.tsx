"use client";

import { useState } from "react";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { RundownBlock } from "@/components/rundown-block";
import type { PautaProposal, StructuredPautaSegment, StructuredPautaStory } from "@/domain/pauta-import";
import { normalizePersonName } from "@/domain/people-history";
import { durationMinutes, endTimeForDuration, reorderItems } from "@/domain/rundown";
import type { Person } from "@/domain/schemas";

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

const documentLabels: Record<PautaProposal["documentType"], string> = {
  pre: "Pre-pauta",
  post: "Post-pauta",
  unknown: "Por confirmar",
};

const layoutLabels: Record<PautaProposal["layoutMode"], string> = {
  timed: "Bloques con horario",
  news_pool: "Bandeja de noticias",
  freeform: "Texto libre",
};

function confidenceLabel(value: number): string {
  if (value >= 0.85) return "Alta";
  if (value >= 0.6) return "Media";
  return "Revisar";
}

const emptySegment: StructuredPautaSegment = {
  startTime: "",
  endTime: "",
  type: "other",
  title: "Nuevo bloque",
  sequence: "",
  topic: "",
  focus: "",
  guestName: "",
  guestRole: "",
  audienceQuestion: "",
  productionCues: [],
  notes: "",
  stories: [],
  confidence: 1,
  sourceExcerpt: "Bloque añadido manualmente durante la revisión.",
};

function withUpdatedStoryCount(segment: StructuredPautaSegment, stories: StructuredPautaSegment["stories"]) {
  const title = /^Noticias por ubicar \(\d+\)$/i.test(segment.title)
    ? `Noticias por ubicar (${stories.length})`
    : segment.title;
  return { ...segment, title, stories };
}

type PautaAiReviewProps = {
  proposal: PautaProposal;
  model: string;
  processingMode: "local" | "luna" | "fallback";
  applying: boolean;
  people: Person[];
  producerName: string;
  onChange: (proposal: PautaProposal) => void;
  onProducerNameChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
};

export function PautaAiReview({ proposal, model, processingMode, applying, people, producerName, onChange, onProducerNameChange, onClose, onApply }: PautaAiReviewProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(() => new Set());

  function updateSegment(index: number, change: Partial<StructuredPautaSegment>) {
    onChange({
      ...proposal,
      segments: proposal.segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, ...change } : segment),
    });
  }

  function removeSegment(index: number) {
    if ((proposal.segments[index]?.stories.length ?? 0) > 0) return;
    onChange({ ...proposal, segments: proposal.segments.filter((_, segmentIndex) => segmentIndex !== index) });
  }

  function addSegment() {
    onChange({ ...proposal, segments: [...proposal.segments, { ...emptySegment }] });
    setExpandedSegments((current) => new Set([...current, proposal.segments.length]));
  }

  function updateGuest(index: number, value: string) {
    const knownPerson = people.find((person) => person.normalizedName === normalizePersonName(value));
    updateSegment(index, {
      guestName: value,
      guestRole: knownPerson?.primaryRole ?? "",
    });
  }

  function updateStory(segmentIndex: number, storyIndex: number, change: Partial<StructuredPautaStory>) {
    const segment = proposal.segments[segmentIndex];
    if (!segment) return;
    updateSegment(segmentIndex, {
      stories: segment.stories.map((story, index) => index === storyIndex ? { ...story, ...change } : story),
    });
  }

  function moveStory(sourceSegmentIndex: number, storyIndex: number, targetSegmentIndex: number) {
    if (sourceSegmentIndex === targetSegmentIndex) return;
    const source = proposal.segments[sourceSegmentIndex];
    const target = proposal.segments[targetSegmentIndex];
    const story = source?.stories[storyIndex];
    if (!source || !target || !story) return;
    onChange({
      ...proposal,
      segments: proposal.segments.map((segment, index) => {
        if (index === sourceSegmentIndex) return withUpdatedStoryCount(segment, segment.stories.filter((_, itemIndex) => itemIndex !== storyIndex));
        if (index === targetSegmentIndex) return { ...segment, stories: [...segment.stories, story] };
        return segment;
      }),
    });
  }

  function removeStory(segmentIndex: number, storyIndex: number) {
    const segment = proposal.segments[segmentIndex];
    if (!segment) return;
    const stories = segment.stories.filter((_, index) => index !== storyIndex);
    onChange({
      ...proposal,
      segments: proposal.segments.map((item, index) => index === segmentIndex ? withUpdatedStoryCount(item, stories) : item),
    });
  }

  function toggleSegment(index: number) {
    setExpandedSegments((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    setExpandedSegments((current) => current.size === proposal.segments.length
      ? new Set()
      : new Set(proposal.segments.map((_, index) => index)));
  }

  function setQuickDuration(index: number, value: number) {
    const startTime = proposal.segments[index]?.startTime ?? "";
    updateSegment(index, { endTime: endTimeForDuration(startTime, value) });
  }

  function handleDrop(event: DragEndEvent) {
    if (event.canceled) return;
    const sourceId = String(event.operation.source?.id ?? "");
    const targetId = String(event.operation.target?.id ?? "");
    const sourceIndex = Number(sourceId.replace("ai-block-", ""));
    const targetIndex = Number(targetId.replace("ai-block-", ""));
    if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex)) return;
    onChange({ ...proposal, segments: reorderItems(proposal.segments, sourceIndex, targetIndex) });
  }

  return (
    <section className="ordered-review" aria-labelledby="ordered-review-title">
      <header className="ordered-review-header">
        <div><span>Propuesta pendiente de aprobación</span><h2 id="ordered-review-title">Vista ordenada</h2><p>{proposal.layoutMode === "news_pool" ? "Crea bloques según las pausas reales y distribuye las noticias sin inventar horarios." : "Revisa, reordena y ajusta los tiempos antes de aceptar."}</p></div>
        <button className="quiet-button" onClick={onClose} disabled={applying}>Descartar</button>
      </header>

      <div className="ordered-summary" aria-label="Resumen detectado">
        <div><span>Documento</span><strong>{documentLabels[proposal.documentType]}</strong></div>
        <div><span>Programa</span><strong>{proposal.detectedProgramName || "No identificado"}</strong></div>
        <div><span>Fecha</span><strong>{proposal.detectedDate || "No identificada"}</strong></div>
        <div><span>Estructura</span><strong>{layoutLabels[proposal.layoutMode]}</strong></div>
      </div>

      <div className="ordered-team">
        <p><strong>Conducción detectada</strong><span>{proposal.hosts.join(", ") || "No indicada"}</span></p>
        <label><strong>Productor responsable</strong><input list="known-producers" value={producerName} onChange={(event) => onProducerNameChange(event.target.value)} placeholder="Nombre del productor" /></label>
      </div>

      {proposal.warnings.length > 0 && (
        <details className="ordered-warnings">
          <summary>{proposal.warnings.length} punto{proposal.warnings.length === 1 ? "" : "s"} por revisar</summary>
          <ul>{proposal.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
        </details>
      )}

      <div className="rundown-list-toolbar">
        <p><strong>{proposal.segments.length} bloques</strong><span>Arrastra desde el asa para cambiar el orden.</span></p>
        <button className="quiet-button" onClick={toggleAll}>{expandedSegments.size === proposal.segments.length ? "Contraer todos" : "Expandir todos"}</button>
      </div>

      <DragDropProvider onDragEnd={handleDrop}>
        <div className="ordered-list">
          {proposal.segments.map((segment, index) => (
            <RundownBlock
              id={`ai-block-${index}`}
              key={`${segment.sourceExcerpt.slice(0, 32)}-${index}`}
              index={index}
              startTime={segment.startTime}
              endTime={segment.endTime}
              type={segment.type}
              title={segment.title || segment.topic}
              guest={segment.guestName}
              confidence={confidenceLabel(segment.confidence)}
              expanded={expandedSegments.has(index)}
              canDrag={!applying}
              onToggle={() => toggleSegment(index)}
            >
            <div className="ordered-fields">
              <label><span>Inicio</span><input type="time" step="60" aria-label={`Inicio del bloque ${index + 1}`} value={segment.startTime} onChange={(event) => updateSegment(index, { startTime: event.target.value })} /></label>
              <label><span>Fin</span><input type="time" step="60" aria-label={`Fin del bloque ${index + 1}`} value={segment.endTime} onChange={(event) => updateSegment(index, { endTime: event.target.value })} /></label>
              <label><span>Tipo</span><select value={segment.type} onChange={(event) => updateSegment(index, { type: event.target.value as StructuredPautaSegment["type"] })}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <div className="duration-tools wide"><span>Duración rápida</span><div>{[15, 30, 45, 60].map((value) => <button key={value} className={durationMinutes(segment.startTime, segment.endTime) === value ? "active" : ""} onClick={() => setQuickDuration(index, value)}>{value} min</button>)}<small>O escribe cualquier hora al minuto.</small></div></div>
              <label className="wide"><span>Título del bloque</span><input value={segment.title} onChange={(event) => updateSegment(index, { title: event.target.value })} /></label>
              <label><span>Secuencia</span><input value={segment.sequence} onChange={(event) => updateSegment(index, { sequence: event.target.value })} placeholder="Si aplica" /></label>
              <label className="wide"><span>Tema</span><textarea rows={2} value={segment.topic} onChange={(event) => updateSegment(index, { topic: event.target.value })} /></label>
              <label className="wide"><span>Enfoque</span><textarea rows={3} value={segment.focus} onChange={(event) => updateSegment(index, { focus: event.target.value })} /></label>
              <label><span>Invitado</span><input list="known-guests-ai" value={segment.guestName} onChange={(event) => updateGuest(index, event.target.value)} /></label>
              <label><span>Cargo o descripción</span><input value={segment.guestRole} onChange={(event) => updateSegment(index, { guestRole: event.target.value })} /></label>
              <label className="wide"><span>Pregunta al público</span><input value={segment.audienceQuestion} onChange={(event) => updateSegment(index, { audienceQuestion: event.target.value })} /></label>
              <label className="wide"><span>Indicaciones de producción</span><textarea rows={2} value={segment.productionCues.join("\n")} onChange={(event) => updateSegment(index, { productionCues: event.target.value.split("\n").map((cue) => cue.trim()).filter(Boolean) })} placeholder="Una indicación por línea" /></label>
              <label className="wide"><span>Notas</span><textarea rows={2} value={segment.notes} onChange={(event) => updateSegment(index, { notes: event.target.value })} /></label>
              {segment.stories.length > 0 && (
                <section className="story-pool wide">
                  <header><div><strong>{segment.stories.length} noticia{segment.stories.length === 1 ? "" : "s"}</strong><span>Abre solo la que necesites editar. Puedes moverla a otro bloque.</span></div></header>
                  <div className="story-pool-list">
                    {segment.stories.map((story, storyIndex) => (
                      <details className="story-item" key={`${story.reference}-${storyIndex}`}>
                        <summary><span>{story.reference || String(storyIndex + 1)}</span><strong>{story.title || "Noticia sin título"}</strong>{story.format && <b>{story.format}</b>}</summary>
                        <div>
                          <label><span>Titular</span><textarea rows={2} value={story.title} onChange={(event) => updateStory(index, storyIndex, { title: event.target.value })} /></label>
                          <label><span>Formato</span><input value={story.format} onChange={(event) => updateStory(index, storyIndex, { format: event.target.value })} placeholder="INF, OFF, ON" /></label>
                          <label><span>Audio o referencia</span><input value={story.mediaCue} onChange={(event) => updateStory(index, storyIndex, { mediaCue: event.target.value })} /></label>
                          <label><span>Mover a bloque</span><select value={index} onChange={(event) => moveStory(index, storyIndex, Number(event.target.value))}>{proposal.segments.map((target, targetIndex) => <option value={targetIndex} key={`${target.title}-${targetIndex}`}>{target.title || `Bloque ${targetIndex + 1}`}</option>)}</select></label>
                          <label className="story-wide"><span>Desarrollo</span><textarea rows={4} value={story.summary} onChange={(event) => updateStory(index, storyIndex, { summary: event.target.value })} /></label>
                          <label className="story-wide"><span>Notas</span><textarea rows={2} value={story.notes} onChange={(event) => updateStory(index, storyIndex, { notes: event.target.value })} /></label>
                          <details className="source-excerpt story-wide"><summary>Ver texto original de la noticia</summary><p>{story.sourceExcerpt}</p></details>
                          <button className="remove" onClick={() => removeStory(index, storyIndex)}>Quitar noticia</button>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}
              <details className="source-excerpt wide"><summary>Ver texto original de este bloque</summary><p>{segment.sourceExcerpt}</p></details>
              <button className="remove ordered-remove" disabled={segment.stories.length > 0} title={segment.stories.length > 0 ? "Mueve o quita sus noticias antes de eliminar el bloque" : undefined} onClick={() => removeSegment(index)}>Quitar bloque</button>
            </div>
            </RundownBlock>
          ))}
        </div>
      </DragDropProvider>

      <datalist id="known-guests-ai">
        {people.map((person) => <option key={person.id} value={person.displayName}>{person.primaryRole}</option>)}
      </datalist>
      <button className="add-ordered-block" onClick={addSegment}>{proposal.layoutMode === "news_pool" ? "Añadir bloque de emisión" : "Añadir bloque"}</button>

      <footer className="ordered-review-footer">
        <p><strong>¿La pauta está correcta?</strong><span>El original se conserva y esta versión aún no se incorpora hasta que la aceptes.</span></p>
        <small>{processingMode === "local" ? "Método: lectura rápida" : `Modelo: ${model}`}</small>
        <button className="primary accept-pauta" onClick={onApply} disabled={applying || proposal.segments.length === 0}>{applying ? "Guardando pauta..." : "Aceptar y guardar pauta"}</button>
      </footer>
    </section>
  );
}
