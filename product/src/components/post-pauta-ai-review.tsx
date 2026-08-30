"use client";

import type { PostComparisonBlock, PostComparisonParticipant, PostComparisonProposal } from "@/domain/post-pauta-import";
import { normalizePersonName } from "@/domain/people-history";
import type { Person } from "@/domain/schemas";

type PostPautaAiReviewProps = {
  proposal: PostComparisonProposal;
  model: string;
  applying: boolean;
  people: Person[];
  onChange: (proposal: PostComparisonProposal) => void;
  onApply: () => void;
  onClose: () => void;
};

const matchLabel: Record<PostComparisonBlock["matchStatus"], string> = {
  matched: "Detectado en video", changed: "Emitido con cambios", new: "Nuevo al aire", unconfirmed: "Sin evidencia",
};

const typeLabel: Record<PostComparisonBlock["type"], string> = {
  opening: "Apertura", interview: "Entrevista", live: "Vivo", audience: "Audiencia",
  sequence: "Secuencia", sports: "Deportes", cue: "Cue", other: "Otro",
};

const participantMatchLabel: Record<PostComparisonParticipant["matchStatus"], string> = {
  database_exact: "Base RPP", database_fuzzy: "Coincidencia probable", new: "Persona nueva", review: "Revisar",
};

export function PostPautaAiReview({ proposal, model, applying, people, onChange, onApply, onClose }: PostPautaAiReviewProps) {
  const actionable = proposal.blocks.filter((block) => block.disposition !== "unconfirmed").length;
  const needsReview = proposal.blocks.filter((block) => block.disposition === "unconfirmed" || block.reviewReasons.length).length;
  const updateBlock = (index: number, change: Partial<PostComparisonBlock>) => onChange({
    ...proposal,
    blocks: proposal.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...change } : block),
  });

  function updateParticipant(blockIndex: number, participantIndex: number, change: Partial<PostComparisonParticipant>) {
    const block = proposal.blocks[blockIndex];
    updateBlock(blockIndex, {
      participants: block.participants.map((participant, index) => index === participantIndex ? { ...participant, ...change } : participant),
    });
  }

  function updateParticipantName(blockIndex: number, participantIndex: number, value: string) {
    const exact = people.find((person) => [person.displayName, ...person.aliases].some((name) => normalizePersonName(name) === normalizePersonName(value)));
    updateParticipant(blockIndex, participantIndex, exact ? {
      personId: exact.id,
      detectedName: value,
      displayName: exact.displayName,
      roleDescription: proposal.blocks[blockIndex].participants[participantIndex].roleDescription || exact.primaryRole,
      organization: proposal.blocks[blockIndex].participants[participantIndex].organization || exact.organization,
      matchStatus: "database_exact",
      matchConfidence: 1,
    } : { personId: "", detectedName: value, displayName: value, matchStatus: "new", matchConfidence: .7 });
  }

  return (
    <section className="post-ai-review" aria-label="Análisis propuesto para la post-pauta">
      <datalist id="post-known-people">{people.map((person) => <option key={person.id} value={person.displayName}>{person.primaryRole}</option>)}</datalist>
      <header>
        <div><span>Análisis de Luna</span><h3>{needsReview ? `${needsReview} elementos necesitan una mirada` : "La emisión está lista para aplicar"}</h3><p>{proposal.summary || "Comparamos la fuente con la pre-pauta y validamos los nombres contra la base editorial."}</p></div>
        <button onClick={onClose}>Descartar</button>
      </header>
      <div className="post-ai-proof-summary">
        <div><strong>{actionable}</strong><span>bloques respaldados</span></div>
        <div><strong>{proposal.blocks.reduce((total, block) => total + block.participants.length, 0)}</strong><span>personas detectadas</span></div>
        <div data-review={needsReview ? "pending" : "ready"}><strong>{needsReview}</strong><span>por revisar</span></div>
      </div>
      {proposal.warnings.length > 0 && <div className="post-ai-warnings">{proposal.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
      <div className="post-ai-blocks">
        {proposal.blocks.map((block, index) => {
          const blockNeedsReview = block.disposition === "unconfirmed" || block.reviewReasons.length > 0;
          return <details key={`${block.matchedSegmentId || "new"}-${index}`} data-match={block.matchStatus}>
            <summary>
              <span><b>{matchLabel[block.matchStatus]}</b><strong>{block.title}</strong><small>{block.sourceExcerpt || "No encontramos respaldo para este bloque."}</small></span>
              <em data-review={blockNeedsReview ? "pending" : "ready"}>{blockNeedsReview ? "Revisar detalles" : `${block.actualStart} a ${block.actualEnd}`}</em>
            </summary>
            <div>
              {block.reviewReasons.length > 0 && <div className="post-ai-review-reasons">{block.reviewReasons.map((reason) => <p key={reason}>{reason}</p>)}</div>}
              <label className="wide"><span>Título editorial</span><input value={block.title} onChange={(event) => updateBlock(index, { title: event.target.value })} /></label>
              <label><span>Resultado</span><select value={block.disposition} onChange={(event) => updateBlock(index, { disposition: event.target.value as PostComparisonBlock["disposition"] })}><option value="unconfirmed">Sin confirmar</option><option value="aired">Emitido</option><option value="partial">Parcial</option><option value="skipped">No salió</option><option value="added_live">Añadido en vivo</option></select></label>
              <label><span>Formato</span><select value={block.type} onChange={(event) => updateBlock(index, { type: event.target.value as PostComparisonBlock["type"] })}>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="post-ai-times"><label><span>Inicio</span><input type="time" value={block.actualStart} onChange={(event) => updateBlock(index, { actualStart: event.target.value })} /></label><label><span>Fin</span><input type="time" value={block.actualEnd} onChange={(event) => updateBlock(index, { actualEnd: event.target.value })} /></label></div>
              <label><span>Secuencia</span><input value={block.sequence} onChange={(event) => updateBlock(index, { sequence: event.target.value })} placeholder="Nombre de la secuencia, si existe" /></label>
              <label className="wide"><span>Tema buscable</span><input value={block.topic} onChange={(event) => updateBlock(index, { topic: event.target.value })} /></label>
              {block.participants.length > 0 && <section className="post-ai-people wide"><header><strong>Personas detectadas</strong><span>Corrige el nombre o elige una ficha existente antes de aplicar.</span></header>{block.participants.map((participant, participantIndex) => <article key={`${participant.personId || participant.detectedName}-${participantIndex}`}>
                <label><span>Nombre</span><input list="post-known-people" value={participant.displayName} onChange={(event) => updateParticipantName(index, participantIndex, event.target.value)} /></label>
                <label><span>Participación</span><select value={participant.role} onChange={(event) => updateParticipant(index, participantIndex, { role: event.target.value as PostComparisonParticipant["role"] })}><option value="host">Conducción</option><option value="guest">Invitado</option><option value="specialist">Especialista</option><option value="reporter">Reportero</option><option value="producer">Producción</option><option value="other">Colaborador</option></select></label>
                <label><span>Cargo o especialidad</span><input value={participant.roleDescription} onChange={(event) => updateParticipant(index, participantIndex, { roleDescription: event.target.value })} /></label>
                <label><span>Organización</span><input value={participant.organization} onChange={(event) => updateParticipant(index, participantIndex, { organization: event.target.value })} /></label>
                <b data-match={participant.matchStatus}>{participantMatchLabel[participant.matchStatus]}</b>
              </article>)}</section>}
              <label className="wide"><span>Qué se dijo o qué ocurrió</span><textarea rows={4} value={block.postSummary} onChange={(event) => updateBlock(index, { postSummary: event.target.value })} /></label>
              <label className="wide"><span>Cita encontrada</span><textarea rows={2} value={block.keyQuote} onChange={(event) => updateBlock(index, { keyQuote: event.target.value })} /><small>Se guarda pendiente de verificación con el audio.</small></label>
              <blockquote>{block.sourceExcerpt || "Sin fragmento de respaldo"}</blockquote>
            </div>
          </details>;
        })}
      </div>
      <footer><span>{actionable} de {proposal.blocks.length} bloques quedarán cargados. Modelo: {model}</span><button className="primary" disabled={applying || actionable === 0} onClick={onApply}>{applying ? "Aplicando..." : "Aplicar a la post-pauta"}</button></footer>
    </section>
  );
}
