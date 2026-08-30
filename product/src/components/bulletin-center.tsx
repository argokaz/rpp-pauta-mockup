"use client";

import { useMemo, useState } from "react";
import type { Bulletin, Program } from "@/domain/schemas";

type BulletinCenterProps = {
  bulletins: Bulletin[];
  programs: Program[];
  weekStart: string;
  canEdit: boolean;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (bulletin: Bulletin) => void;
  onResend: (bulletin: Bulletin) => Promise<void>;
};

function weekLabel(weekStart: string): string {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${weekStart}T12:00:00`)).replace(".", "");
}

export function BulletinCenter({ bulletins, programs, weekStart, canEdit, onClose, onCreate, onEdit, onResend }: BulletinCenterProps) {
  const [tab, setTab] = useState<"current" | "history">("current");
  const [query, setQuery] = useState("");
  const current = useMemo(() => bulletins.filter((item) => item.weekStart === weekStart).sort((left, right) => (left.pinnedRank ?? 99) - (right.pinnedRank ?? 99) || right.updatedAt.localeCompare(left.updatedAt)), [bulletins, weekStart]);
  const history = useMemo(() => bulletins.filter((item) => item.weekStart !== weekStart).filter((item) => `${item.title} ${item.body} ${item.scope}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))).sort((left, right) => right.weekStart.localeCompare(left.weekStart) || right.updatedAt.localeCompare(left.updatedAt)), [bulletins, query, weekStart]);
  const visible = tab === "current" ? current : history;

  function scopeLabel(scope: string) {
    const program = programs.find((item) => item.id === scope || item.name === scope || item.shortName === scope);
    return program ? program.shortName : scope;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal bulletin-center" role="dialog" aria-modal="true" aria-labelledby="bulletin-center-title">
        <header><div><span>Comunicación editorial</span><h2 id="bulletin-center-title">Indicaciones</h2><p>Lo vigente primero. El historial queda disponible para consultar o volver a enviar.</p></div><button onClick={onClose}>Cerrar</button></header>
        <div className="bulletin-center-toolbar">
          <nav aria-label="Secciones de indicaciones"><button className={tab === "current" ? "active" : ""} onClick={() => setTab("current")}>Esta semana <b>{current.length}</b></button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Historial <b>{history.length}</b></button></nav>
          {tab === "history" && <label><span>Buscar</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, texto o programa" /></label>}
          {tab === "current" && <button className="primary" disabled={!canEdit} onClick={onCreate}>Nueva indicación</button>}
        </div>
        <div className="bulletin-center-list">
          {visible.map((item) => <article key={item.id} className={item.pinnedRank ? "pinned" : ""}>
            <div className="bulletin-center-meta"><span>{item.pinnedRank ? `Fijada ${item.pinnedRank}` : `Semana del ${weekLabel(item.weekStart)}`}</span><b>{scopeLabel(item.scope)}</b></div>
            <h3>{item.title}</h3><p>{item.body}</p>
            <footer><time>{item.updatedAt ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt)) : weekLabel(item.weekStart)}</time><div>{tab === "history" && <button disabled={!canEdit} onClick={() => void onResend(item)}>Volver a enviar</button>}<button disabled={!canEdit} onClick={() => onEdit(item)}>{tab === "history" ? "Ver y editar" : "Editar"}</button></div></footer>
          </article>)}
          {!visible.length && <div className="empty-state"><strong>{tab === "current" ? "Sin indicaciones esta semana" : "No encontramos indicaciones anteriores"}</strong><p>{tab === "current" ? "Añade solo la información que producción necesita tener presente." : "Prueba con otra búsqueda."}</p></div>}
        </div>
      </section>
    </div>
  );
}
