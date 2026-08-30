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
  draft: Bulletin | null;
  saving: boolean;
  onDraftChange: (bulletin: Bulletin) => void;
  onPinnedRankChange: (value: string) => void;
  onCancelEdit: () => void;
  onSave: () => Promise<void>;
};

function weekLabel(weekStart: string): string {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${weekStart}T12:00:00`)).replace(".", "");
}

export function BulletinCenter({ bulletins, programs, weekStart, canEdit, onClose, onCreate, onEdit, onResend, draft, saving, onDraftChange, onPinnedRankChange, onCancelEdit, onSave }: BulletinCenterProps) {
  const [tab, setTab] = useState<"current" | "history">("current");
  const [query, setQuery] = useState("");
  const current = useMemo(() => bulletins.filter((item) => item.weekStart === weekStart).sort((left, right) => (left.pinnedRank ?? 99) - (right.pinnedRank ?? 99) || right.updatedAt.localeCompare(left.updatedAt)), [bulletins, weekStart]);
  const history = useMemo(() => bulletins.filter((item) => item.weekStart !== weekStart).filter((item) => `${item.title} ${item.body} ${item.scope}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))).sort((left, right) => right.weekStart.localeCompare(left.weekStart) || right.updatedAt.localeCompare(left.updatedAt)), [bulletins, query, weekStart]);
  const visible = tab === "current" ? current : history;

  function scopeLabel(scope: string) {
    const program = programs.find((item) => item.id === scope || item.name === scope || item.shortName === scope);
    return program ? program.shortName : scope;
  }

  if (draft) {
    const exists = bulletins.some((item) => item.id === draft.id);
    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancelEdit()}>
        <section className="modal bulletin-center bulletin-editor" role="dialog" aria-modal="true" aria-labelledby="bulletin-editor-title">
          <header><div><span>Comunicación editorial</span><h2 id="bulletin-editor-title">{exists ? "Editar indicación" : "Nueva indicación"}</h2><p>Define el mensaje, su alcance y la prioridad. Todas las indicaciones de la semana permanecerán visibles.</p></div><button onClick={onCancelEdit}>Volver</button></header>
          <div className="bulletin-editor-fields">
            <label className="field"><span>Título</span><input autoFocus value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} /></label>
            <label className="field"><span>Detalle</span><textarea rows={5} value={draft.body} onChange={(event) => onDraftChange({ ...draft, body: event.target.value })} /></label>
            <div className="bulletin-editor-options">
              <label className="field"><span>Aplica a</span><select value={draft.scope} onChange={(event) => onDraftChange({ ...draft, scope: event.target.value })}><option>Todos los programas</option><option>Programas informativos</option>{programs.filter((program) => program.managed && program.active).map((program) => <option key={program.id} value={program.id}>Solo {program.shortName}</option>)}</select><small>Solo los equipos elegidos recibirán esta indicación.</small></label>
              <label className="field"><span>Prioridad</span><select value={draft.pinnedRank ?? ""} onChange={(event) => onPinnedRankChange(event.target.value)}><option value="">Orden normal</option><option value="1">Prioridad 1</option><option value="2">Prioridad 2</option><option value="3">Prioridad 3</option><option value="4">Prioridad 4</option></select><small>La prioridad cambia el orden; nunca oculta otras indicaciones.</small></label>
            </div>
          </div>
          <footer><button onClick={onCancelEdit}>Cancelar</button><button className="primary" disabled={saving} onClick={() => void onSave()}>{saving ? "Guardando…" : "Guardar indicación"}</button></footer>
        </section>
      </div>
    );
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
        <div className="bulletin-center-list" data-tab={tab}>
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
