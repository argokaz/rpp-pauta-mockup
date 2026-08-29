"use client";

import type { PautaProposal, StructuredPautaSegment } from "@/domain/pauta-import";

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

function confidenceLabel(value: number): string {
  if (value >= 0.85) return "Alta";
  if (value >= 0.6) return "Media";
  return "Revisar";
}

function duration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "Sin tiempo";
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const total = Math.max(0, toMinutes(endTime) - toMinutes(startTime));
  return `${total} min`;
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
  confidence: 1,
  sourceExcerpt: "Bloque añadido manualmente durante la revisión.",
};

type PautaAiReviewProps = {
  proposal: PautaProposal;
  model: string;
  applying: boolean;
  onChange: (proposal: PautaProposal) => void;
  onClose: () => void;
  onApply: () => void;
};

export function PautaAiReview({ proposal, model, applying, onChange, onClose, onApply }: PautaAiReviewProps) {
  function updateSegment(index: number, change: Partial<StructuredPautaSegment>) {
    onChange({
      ...proposal,
      segments: proposal.segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, ...change } : segment),
    });
  }

  function removeSegment(index: number) {
    onChange({ ...proposal, segments: proposal.segments.filter((_, segmentIndex) => segmentIndex !== index) });
  }

  function addSegment() {
    onChange({ ...proposal, segments: [...proposal.segments, { ...emptySegment }] });
  }

  return (
    <section className="ordered-review" aria-labelledby="ordered-review-title">
      <header className="ordered-review-header">
        <div><span>Resultado de la IA</span><h2 id="ordered-review-title">Vista ordenada</h2><p>Edita la propuesta antes de incorporarla a la pauta.</p></div>
        <button className="quiet-button" onClick={onClose} disabled={applying}>Descartar</button>
      </header>

      <div className="ordered-summary" aria-label="Resumen detectado">
        <div><span>Documento</span><strong>{documentLabels[proposal.documentType]}</strong></div>
        <div><span>Programa</span><strong>{proposal.detectedProgramName || "No identificado"}</strong></div>
        <div><span>Fecha</span><strong>{proposal.detectedDate || "No identificada"}</strong></div>
        <div><span>Bloques</span><strong>{proposal.segments.length}</strong></div>
      </div>

      {(proposal.hosts.length > 0 || proposal.producers.length > 0) && (
        <div className="ordered-team">
          {proposal.hosts.length > 0 && <p><strong>Conducción</strong><span>{proposal.hosts.join(", ")}</span></p>}
          {proposal.producers.length > 0 && <p><strong>Producción</strong><span>{proposal.producers.join(", ")}</span></p>}
        </div>
      )}

      {proposal.warnings.length > 0 && (
        <details className="ordered-warnings">
          <summary>{proposal.warnings.length} punto{proposal.warnings.length === 1 ? "" : "s"} por revisar</summary>
          <ul>{proposal.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
        </details>
      )}

      <div className="ordered-list">
        {proposal.segments.map((segment, index) => (
          <details className="ordered-block" key={`${index}-${segment.sourceExcerpt.slice(0, 20)}`}>
            <summary>
              <span className="ordered-index">{String(index + 1).padStart(2, "0")}</span>
              <time>{segment.startTime || "--:--"}<small>{duration(segment.startTime, segment.endTime)}</small></time>
              <span className="ordered-main"><strong>{segment.title || segment.topic || "Bloque sin título"}</strong><small>{typeLabels[segment.type]}{segment.guestName ? ` · ${segment.guestName}` : ""}</small></span>
              <span className={`confidence confidence-${confidenceLabel(segment.confidence).toLowerCase()}`}>{confidenceLabel(segment.confidence)}</span>
              <span className="ordered-edit">Editar</span>
            </summary>

            <div className="ordered-fields">
              <label><span>Inicio</span><input aria-label={`Inicio del bloque ${index + 1}`} value={segment.startTime} onChange={(event) => updateSegment(index, { startTime: event.target.value })} placeholder="--:--" /></label>
              <label><span>Fin</span><input aria-label={`Fin del bloque ${index + 1}`} value={segment.endTime} onChange={(event) => updateSegment(index, { endTime: event.target.value })} placeholder="--:--" /></label>
              <label><span>Tipo</span><select value={segment.type} onChange={(event) => updateSegment(index, { type: event.target.value as StructuredPautaSegment["type"] })}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="wide"><span>Título del bloque</span><input value={segment.title} onChange={(event) => updateSegment(index, { title: event.target.value })} /></label>
              <label><span>Secuencia</span><input value={segment.sequence} onChange={(event) => updateSegment(index, { sequence: event.target.value })} placeholder="Si aplica" /></label>
              <label className="wide"><span>Tema</span><textarea rows={2} value={segment.topic} onChange={(event) => updateSegment(index, { topic: event.target.value })} /></label>
              <label className="wide"><span>Enfoque</span><textarea rows={3} value={segment.focus} onChange={(event) => updateSegment(index, { focus: event.target.value })} /></label>
              <label><span>Invitado</span><input value={segment.guestName} onChange={(event) => updateSegment(index, { guestName: event.target.value })} /></label>
              <label><span>Cargo o descripción</span><input value={segment.guestRole} onChange={(event) => updateSegment(index, { guestRole: event.target.value })} /></label>
              <label className="wide"><span>Pregunta al público</span><input value={segment.audienceQuestion} onChange={(event) => updateSegment(index, { audienceQuestion: event.target.value })} /></label>
              <label className="wide"><span>Indicaciones de producción</span><textarea rows={2} value={segment.productionCues.join("\n")} onChange={(event) => updateSegment(index, { productionCues: event.target.value.split("\n").map((cue) => cue.trim()).filter(Boolean) })} placeholder="Una indicación por línea" /></label>
              <label className="wide"><span>Notas</span><textarea rows={2} value={segment.notes} onChange={(event) => updateSegment(index, { notes: event.target.value })} /></label>
              <details className="source-excerpt wide"><summary>Ver texto original de este bloque</summary><p>{segment.sourceExcerpt}</p></details>
              <button className="remove ordered-remove" onClick={() => removeSegment(index)}>Quitar bloque</button>
            </div>
          </details>
        ))}
      </div>

      <button className="add-ordered-block" onClick={addSegment}>Añadir bloque</button>

      <footer className="ordered-review-footer">
        <p><strong>El texto original se conserva.</strong><span>Esta versión se guardará solo cuando la confirmes.</span></p>
        <small>Modelo: {model}</small>
        <button className="primary" onClick={onApply} disabled={applying || proposal.segments.length === 0}>{applying ? "Aplicando..." : "Aplicar y guardar"}</button>
      </footer>
    </section>
  );
}
