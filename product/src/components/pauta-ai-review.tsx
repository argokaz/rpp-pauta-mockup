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
  unknown: "Tipo por confirmar",
};

function confidenceLabel(value: number): string {
  if (value >= 0.85) return "Alta";
  if (value >= 0.6) return "Media";
  return "Revisar";
}

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

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal ai-review-modal" role="dialog" aria-modal="true" aria-labelledby="ai-review-title">
        <header>
          <div><span>Propuesta generada con IA</span><h2 id="ai-review-title">Revisa antes de aplicar</h2></div>
          <button onClick={onClose} disabled={applying}>Cerrar</button>
        </header>

        <div className="ai-review-body">
          <section className="ai-summary" aria-label="Resumen detectado">
            <div><span>Documento</span><strong>{documentLabels[proposal.documentType]}</strong></div>
            <div><span>Programa detectado</span><strong>{proposal.detectedProgramName || "No identificado"}</strong></div>
            <div><span>Fecha detectada</span><strong>{proposal.detectedDate || "No identificada"}</strong></div>
            <div><span>Resultado</span><strong>{proposal.segments.length} bloques</strong></div>
          </section>

          {(proposal.hosts.length > 0 || proposal.producers.length > 0) && (
            <section className="ai-team">
              {proposal.hosts.length > 0 && <p><strong>Conducción</strong><span>{proposal.hosts.join(", ")}</span></p>}
              {proposal.producers.length > 0 && <p><strong>Producción</strong><span>{proposal.producers.join(", ")}</span></p>}
            </section>
          )}

          {proposal.warnings.length > 0 && (
            <section className="ai-warnings" aria-label="Puntos por revisar">
              <strong>Puntos por revisar</strong>
              <ul>{proposal.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
            </section>
          )}

          <section className="ai-review-segments">
            <header><div><strong>Escaleta propuesta</strong><span>Edita cualquier dato antes de incorporarlo.</span></div><small>Modelo: {model}</small></header>
            <div className="ai-review-list">
              {proposal.segments.map((segment, index) => (
                <article className="ai-review-segment" key={`${index}-${segment.sourceExcerpt.slice(0, 20)}`}>
                  <header>
                    <span className="ai-order">{String(index + 1).padStart(2, "0")}</span>
                    <div className="ai-times">
                      <label><span>Inicio</span><input aria-label={`Inicio del bloque ${index + 1}`} value={segment.startTime} onChange={(event) => updateSegment(index, { startTime: event.target.value })} placeholder="--:--" /></label>
                      <span>a</span>
                      <label><span>Fin</span><input aria-label={`Fin del bloque ${index + 1}`} value={segment.endTime} onChange={(event) => updateSegment(index, { endTime: event.target.value })} placeholder="--:--" /></label>
                    </div>
                    <label className="ai-type"><span>Tipo</span><select value={segment.type} onChange={(event) => updateSegment(index, { type: event.target.value as StructuredPautaSegment["type"] })}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                    <span className={`confidence confidence-${confidenceLabel(segment.confidence).toLowerCase()}`}>Confianza {confidenceLabel(segment.confidence)}</span>
                    <button className="remove" onClick={() => removeSegment(index)}>Quitar</button>
                  </header>

                  <div className="ai-segment-fields">
                    <label className="field"><span>Título del bloque</span><input value={segment.title} onChange={(event) => updateSegment(index, { title: event.target.value })} /></label>
                    <label className="field"><span>Secuencia</span><input value={segment.sequence} onChange={(event) => updateSegment(index, { sequence: event.target.value })} placeholder="Si aplica" /></label>
                    <label className="field"><span>Tema</span><textarea rows={2} value={segment.topic} onChange={(event) => updateSegment(index, { topic: event.target.value })} /></label>
                    <label className="field"><span>Enfoque</span><textarea rows={3} value={segment.focus} onChange={(event) => updateSegment(index, { focus: event.target.value })} /></label>
                    <label className="field"><span>Invitado</span><input value={segment.guestName} onChange={(event) => updateSegment(index, { guestName: event.target.value })} /></label>
                    <label className="field"><span>Cargo o descripción</span><input value={segment.guestRole} onChange={(event) => updateSegment(index, { guestRole: event.target.value })} /></label>
                    <label className="field ai-field-wide"><span>Pregunta al público</span><input value={segment.audienceQuestion} onChange={(event) => updateSegment(index, { audienceQuestion: event.target.value })} /></label>
                    <label className="field ai-field-wide"><span>Indicaciones de producción</span><textarea rows={2} value={segment.productionCues.join("\n")} onChange={(event) => updateSegment(index, { productionCues: event.target.value.split("\n").map((cue) => cue.trim()).filter(Boolean) })} placeholder="Una indicación por línea" /></label>
                    <label className="field ai-field-wide"><span>Notas</span><textarea rows={2} value={segment.notes} onChange={(event) => updateSegment(index, { notes: event.target.value })} /></label>
                  </div>

                  <details className="source-excerpt"><summary>Ver fragmento original</summary><p>{segment.sourceExcerpt}</p></details>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className="ai-review-footer">
          <p><strong>La IA no guarda cambios en la escaleta.</strong><span>Solo se aplicará esta versión cuando la confirmes.</span></p>
          <button onClick={onClose} disabled={applying}>Cancelar</button>
          <button className="primary" onClick={onApply} disabled={applying || proposal.segments.length === 0}>{applying ? "Aplicando..." : "Aplicar y guardar"}</button>
        </footer>
      </section>
    </div>
  );
}
