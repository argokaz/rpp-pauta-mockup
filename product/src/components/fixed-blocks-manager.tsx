"use client";

import { useMemo, useState } from "react";
import type { WorkspaceRepository } from "@/data/workspace-repository";
import type { FixedBlock, Program, WorkspaceState } from "@/domain/schemas";

const weekdayOptions = [
  { value: 1, label: "Lun" }, { value: 2, label: "Mar" }, { value: 3, label: "Mié" },
  { value: 4, label: "Jue" }, { value: 5, label: "Vie" }, { value: 6, label: "Sáb" }, { value: 0, label: "Dom" },
];

const typeOptions: Array<{ value: FixedBlock["type"]; label: string }> = [
  { value: "sequence", label: "Secuencia" },
  { value: "interview", label: "Entrevista" },
  { value: "sports", label: "Deportes" },
  { value: "audience", label: "Audiencia" },
  { value: "live", label: "Vivo" },
  { value: "other", label: "Otro" },
];

type FixedBlocksManagerProps = {
  initialDate: string;
  onClose: () => void;
  onWorkspaceChange: (workspace: WorkspaceState) => void;
  program: Program;
  repository: WorkspaceRepository;
  workspace: WorkspaceState;
};

function newBlock(programId: string, date: string): FixedBlock {
  return {
    id: `new-${crypto.randomUUID()}`,
    programId,
    title: "",
    sequence: "",
    type: "sequence",
    guest: "",
    guestRole: "",
    notes: "",
    daysOfWeek: [new Date(`${date}T12:00:00`).getDay()],
    startTime: "11:30",
    durationMinutes: 10,
    effectiveFrom: date,
    effectiveTo: null,
    active: true,
  };
}

function daysLabel(days: number[]): string {
  return weekdayOptions.filter((day) => days.includes(day.value)).map((day) => day.label).join(" y ");
}

export function FixedBlocksManager({ initialDate, onClose, onWorkspaceChange, program, repository, workspace }: FixedBlocksManagerProps) {
  const [draft, setDraft] = useState<FixedBlock | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const blocks = useMemo(() => workspace.fixedBlocks
    .filter((block) => block.programId === program.id)
    .sort((a, b) => a.startTime.localeCompare(b.startTime)), [program.id, workspace.fixedBlocks]);

  async function refresh() {
    onWorkspaceChange(await repository.load());
  }

  async function save() {
    if (!draft || !repository.saveFixedBlock) return;
    if (!draft.title.trim() || !draft.daysOfWeek.length || !draft.startTime || draft.durationMinutes < 1) {
      setMessage("Completa nombre, días, hora y duración.");
      return;
    }
    setSaving(true); setMessage("");
    try {
      await repository.saveFixedBlock({ ...draft, title: draft.title.trim(), sequence: draft.sequence.trim() || draft.title.trim() });
      await refresh();
      setDraft(null);
      setMessage("Bloque fijo guardado. Se prellenará en las próximas pautas aplicables.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el bloque fijo.");
    } finally { setSaving(false); }
  }

  async function retire(block: FixedBlock) {
    if (!repository.deleteFixedBlock || !window.confirm(`¿Dejar de pre-pautear “${block.title}” desde esta fecha? Las pautas anteriores se conservarán.`)) return;
    setSaving(true); setMessage("");
    try {
      await repository.deleteFixedBlock(block.id, initialDate);
      await refresh();
      setMessage("La repetición fue retirada sin borrar pautas anteriores.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo retirar la repetición.");
    } finally { setSaving(false); }
  }

  function toggleDay(value: number) {
    if (!draft) return;
    setDraft({ ...draft, daysOfWeek: draft.daysOfWeek.includes(value) ? draft.daysOfWeek.filter((day) => day !== value) : [...draft.daysOfWeek, value] });
  }

  return (
    <div className="modal-backdrop fixed-blocks-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal fixed-blocks-modal" role="dialog" aria-modal="true" aria-labelledby="fixed-blocks-title">
        <header><div><span>Configuración del programa</span><h2 id="fixed-blocks-title">Bloques fijos de {program.shortName}</h2></div><button onClick={onClose}>Cerrar</button></header>
        <div className="fixed-blocks-explainer"><strong>Se pre-pautan, no se bloquean.</strong><p>Cada fecha recibe una copia editable. Moverla, cambiar el tema o quitarla modifica solo esa pauta.</p></div>
        {message && <p className="admin-message" role="status">{message}</p>}
        <div className="fixed-blocks-toolbar"><div><strong>Repeticiones activas</strong><span>{blocks.filter((block) => block.active).length} configuradas</span></div><button className="primary" onClick={() => setDraft(newBlock(program.id, initialDate))}>+ Nuevo bloque fijo</button></div>
        <div className="fixed-block-list">
          {blocks.map((block) => <article key={block.id} className={block.active ? "" : "inactive"}>
            <time>{block.startTime}<span>{block.durationMinutes} min</span></time>
            <div><strong>{block.title}</strong><p>{daysLabel(block.daysOfWeek)}{block.guest ? ` · ${block.guest}` : ""}</p><small>{block.effectiveFrom} a {block.effectiveTo || "sin fecha final"}</small></div>
            <b>{block.active ? "Activo" : "Histórico"}</b>
            <button disabled={!block.active || saving} onClick={() => setDraft({ ...block, id: `version-${block.id}`, effectiveFrom: initialDate, effectiveTo: null, active: true })}>Cambiar repetición</button>
            <button disabled={!block.active || saving} onClick={() => void retire(block)}>Retirar</button>
          </article>)}
          {!blocks.length && <div className="empty-state compact"><strong>Aún no hay bloques fijos</strong><p>Crea una secuencia recurrente una sola vez y aparecerá en los días elegidos.</p></div>}
        </div>

        {draft && <div className="admin-drawer fixed-block-drawer"><header><strong>{draft.id.startsWith("new-") ? "Nuevo bloque fijo" : "Cambiar repetición"}</strong><button onClick={() => setDraft(null)}>Cerrar</button></header><div>
          {draft.id.startsWith("version-") && <p className="admin-drawer-note">Las pautas anteriores no cambian. Esta versión se aplicará desde la fecha indicada.</p>}
          <label><span>Nombre del bloque</span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Tecnoverso" /></label>
          <div className="admin-inline"><label><span>Tipo</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as FixedBlock["type"] })}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label><span>Aplica desde</span><input type="date" value={draft.effectiveFrom} onChange={(event) => setDraft({ ...draft, effectiveFrom: event.target.value })} /></label></div>
          <fieldset className="fixed-days"><legend>Días</legend><div>{weekdayOptions.map((day) => <label key={day.value}><input type="checkbox" checked={draft.daysOfWeek.includes(day.value)} onChange={() => toggleDay(day.value)} /><span>{day.label}</span></label>)}</div></fieldset>
          <div className="admin-inline"><label><span>Hora sugerida</span><input type="time" step="60" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label><label><span>Duración</span><div className="fixed-duration"><input type="number" min="1" max="360" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Number(event.target.value) })} /><em>min</em></div></label></div>
          <div className="fixed-duration-presets">{[10, 15, 30, 60].map((duration) => <button key={duration} className={draft.durationMinutes === duration ? "active" : ""} onClick={() => setDraft({ ...draft, durationMinutes: duration })}>{duration} min</button>)}</div>
          <label><span>Persona habitual, opcional</span><input value={draft.guest} onChange={(event) => setDraft({ ...draft, guest: event.target.value })} placeholder="Nombre completo" /></label>
          <label><span>Cargo o especialidad</span><input value={draft.guestRole} onChange={(event) => setDraft({ ...draft, guestRole: event.target.value })} /></label>
          <label><span>Nota base, opcional</span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Lo que conviene recordar al preparar el tema" /></label>
          <button className="primary" disabled={saving} onClick={() => void save()}>{saving ? "Guardando..." : "Guardar repetición"}</button>
        </div></div>}
      </section>
    </div>
  );
}
