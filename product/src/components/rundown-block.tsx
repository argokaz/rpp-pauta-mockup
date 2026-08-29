"use client";

import { useDraggable, useDroppable } from "@dnd-kit/react";
import type { ReactNode } from "react";
import type { Segment } from "@/domain/schemas";
import { durationMinutes, formatDuration } from "@/domain/rundown";

const labels: Record<Segment["type"], string> = {
  opening: "Apertura",
  interview: "Entrevista",
  live: "Vivo",
  audience: "Audiencia",
  sequence: "Secuencia",
  sports: "Deportes",
  cue: "Cue",
  other: "Otro",
};

type RundownBlockProps = {
  id: string;
  index: number;
  startTime: string;
  endTime: string;
  type: Segment["type"];
  title: string;
  guest?: string;
  confidence?: string;
  expanded: boolean;
  canDrag: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function RundownBlock({ id, index, startTime, endTime, type, title, guest, confidence, expanded, canDrag, onToggle, children }: RundownBlockProps) {
  const { ref: dragRef, handleRef, isDragging } = useDraggable({ id, type: "rundown-block", disabled: !canDrag });
  const { ref: dropRef, isDropTarget } = useDroppable({ id, type: "rundown-target", accept: "rundown-block", disabled: !canDrag });
  const panelId = `rundown-panel-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const duration = durationMinutes(startTime, endTime);

  function setRowRef(element: Element | null) {
    dragRef(element);
    dropRef(element);
  }

  return (
    <article
      ref={setRowRef}
      className={`rundown-block ${expanded ? "expanded" : ""} ${isDragging ? "dragging" : ""} ${isDropTarget ? "drop-target" : ""}`}
      data-type={type}
    >
      <div className="rundown-block-summary">
        <button ref={handleRef} className="rundown-drag-handle" disabled={!canDrag} aria-label={`Mover bloque ${index + 1}`} title="Arrastrar para reordenar">
          <span aria-hidden="true">⠿</span>
        </button>
        <span className="rundown-number">{String(index + 1).padStart(2, "0")}</span>
        <button className="rundown-overview" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId}>
          <time><strong>{startTime || "--:--"}</strong><span>{endTime || "--:--"}</span></time>
          <span className="rundown-copy">
            <strong>{title || "Bloque sin título"}</strong>
            <small><span className="rundown-type">{labels[type]}</span>{guest ? <span>{guest}</span> : null}</small>
          </span>
          <span className="rundown-duration">{formatDuration(duration)}</span>
          {confidence ? <span className={`confidence confidence-${confidence.toLowerCase()}`}>{confidence}</span> : null}
          <span className="rundown-chevron" aria-hidden="true">⌄</span>
        </button>
      </div>
      <div id={panelId} className="rundown-collapse" aria-hidden={!expanded}>
        <div className="rundown-collapse-inner">{children}</div>
      </div>
    </article>
  );
}
