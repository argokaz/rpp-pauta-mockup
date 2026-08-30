"use client";

import type { PostComparisonBlock, PostComparisonProposal } from "@/domain/post-pauta-import";

type PostPautaAiReviewProps = {
  proposal: PostComparisonProposal;
  model: string;
  applying: boolean;
  onChange: (proposal: PostComparisonProposal) => void;
  onApply: () => void;
  onClose: () => void;
};

const matchLabel: Record<PostComparisonBlock["matchStatus"], string> = {
  matched: "Coincide",
  changed: "Cambió",
  new: "Nuevo al aire",
  unconfirmed: "Sin evidencia",
};

export function PostPautaAiReview({ proposal, model, applying, onChange, onApply, onClose }: PostPautaAiReviewProps) {
  const actionable = proposal.blocks.filter((block) => block.disposition !== "unconfirmed").length;
  const updateBlock = (index: number, change: Partial<PostComparisonBlock>) => onChange({ ...proposal, blocks: proposal.blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...change } : block) });

  return (
    <section className="post-ai-review" aria-label="Contraste propuesto para la post-pauta">
      <header><div><span>Propuesta de Luna</span><h3>Revisa antes de aplicar</h3><p>{proposal.summary || "Comparamos el documento pegado con la pre-pauta guardada."}</p></div><button onClick={onClose}>Descartar</button></header>
      {proposal.warnings.length > 0 && <div className="post-ai-warnings">{proposal.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
      <div className="post-ai-blocks">
        {proposal.blocks.map((block, index) => <details key={`${block.matchedSegmentId || "new"}-${index}`} data-match={block.matchStatus}>
          <summary><span><b>{matchLabel[block.matchStatus]}</b><strong>{block.title}</strong><small>{block.sourceExcerpt || "El documento no aporta evidencia para este bloque."}</small></span><em>{block.disposition === "unconfirmed" ? "Revisar manualmente" : "Listo para aplicar"}</em></summary>
          <div>
            <label><span>Resultado</span><select value={block.disposition} onChange={(event) => updateBlock(index, { disposition: event.target.value as PostComparisonBlock["disposition"] })}><option value="unconfirmed">Sin confirmar</option><option value="aired">Emitido</option><option value="partial">Parcial</option><option value="skipped">No salió</option><option value="added_live">Añadido en vivo</option></select></label>
            <div className="post-ai-times"><label><span>Inicio real</span><input type="time" value={block.actualStart} onChange={(event) => updateBlock(index, { actualStart: event.target.value })} /></label><label><span>Fin real</span><input type="time" value={block.actualEnd} onChange={(event) => updateBlock(index, { actualEnd: event.target.value })} /></label></div>
            <label className="wide"><span>Qué se dijo o qué ocurrió</span><textarea rows={3} value={block.postSummary} onChange={(event) => updateBlock(index, { postSummary: event.target.value })} /></label>
            <label className="wide"><span>Cita encontrada en el documento</span><textarea rows={2} value={block.keyQuote} onChange={(event) => updateBlock(index, { keyQuote: event.target.value })} /><small>Se guarda como pendiente de verificación con el audio.</small></label>
            <blockquote>{block.sourceExcerpt || "Sin fragmento de respaldo"}</blockquote>
          </div>
        </details>)}
      </div>
      <footer><span>{actionable} de {proposal.blocks.length} bloques tienen evidencia suficiente. Modelo: {model}</span><button className="primary" disabled={applying || actionable === 0} onClick={onApply}>{applying ? "Aplicando..." : "Aplicar a la post-pauta"}</button></footer>
    </section>
  );
}
