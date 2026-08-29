"use client";

import { useEffect, useMemo, useState } from "react";
import { initialWorkspaceState, programs, scheduleSlots } from "@/data/seed";
import { loadWorkspace, saveWorkspace } from "@/data/local-repository";
import type { Bulletin, Emission, ImportantDate, Segment, WorkspaceState } from "@/domain/schemas";

const days = [
  { label: "Lun 24", date: "2026-08-24", dayOfWeek: 1 },
  { label: "Mar 25", date: "2026-08-25", dayOfWeek: 2 },
  { label: "Mié 26", date: "2026-08-26", dayOfWeek: 3 },
  { label: "Jue 27", date: "2026-08-27", dayOfWeek: 4 },
  { label: "Vie 28", date: "2026-08-28", dayOfWeek: 5 },
  { label: "Sáb 29", date: "2026-08-29", dayOfWeek: 6 },
  { label: "Dom 30", date: "2026-08-30", dayOfWeek: 0 },
];

const statusLabel: Record<Emission["status"], string> = {
  empty: "Sin pauta",
  draft: "En edición",
  ready: "Lista",
  post: "Post-pauta",
};

const segmentTypeLabel: Record<Segment["type"], string> = {
  opening: "Apertura",
  interview: "Entrevista",
  live: "Vivo",
  audience: "Audiencia",
  sequence: "Secuencia",
  sports: "Deportes",
  cue: "Cue",
  other: "Otro",
};

function emptyEmission(programId: string, date: string): Emission {
  return {
    id: `emission-${programId}-${date}`,
    programId,
    date,
    status: "empty",
    rawText: "",
    segments: [],
    updatedAt: new Date().toISOString(),
  };
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function minutes(value: string): number {
  const [hours, minute] = value.split(":").map(Number);
  return hours * 60 + minute;
}

export function WorkspaceApp() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialWorkspaceState);
  const [selectedDate, setSelectedDate] = useState("2026-08-28");
  const [selectedSlotId, setSelectedSlotId] = useState("encendidos-5-4");
  const [programFilter, setProgramFilter] = useState<"all" | "managed">("all");
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState<{ date: string; minutes: number } | null>(null);
  const [bulletinDraft, setBulletinDraft] = useState<Bulletin | null>(null);
  const [dateDraft, setDateDraft] = useState<ImportantDate | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setWorkspace(loadWorkspace());
      setHydrated(true);
      const limaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
      const limaTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setNow({ date: limaDate, minutes: minutes(limaTime) });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[4];
  const daySlots = useMemo(
    () => scheduleSlots
      .filter((slot) => slot.dayOfWeek === selectedDay.dayOfWeek)
      .filter((slot) => programFilter === "all" || programs.find((program) => program.id === slot.programId)?.managed),
    [programFilter, selectedDay.dayOfWeek],
  );

  const selectedSlot = daySlots.find((slot) => slot.id === selectedSlotId) ?? daySlots[0];
  const selectedProgram = programs.find((program) => program.id === selectedSlot?.programId);
  const storedEmission = workspace.emissions.find(
    (emission) => emission.programId === selectedProgram?.id && emission.date === selectedDate,
  );
  const selectedEmission = selectedProgram && selectedSlot
    ? storedEmission ?? emptyEmission(selectedProgram.id, selectedDate)
    : null;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  function commit(next: WorkspaceState, message: string) {
    setWorkspace(next);
    saveWorkspace(next);
    setDirty(false);
    notify(message);
  }

  function updateEmission(change: Partial<Emission>) {
    if (!selectedEmission) return;
    const nextEmission = { ...selectedEmission, ...change, updatedAt: new Date().toISOString() };
    const exists = workspace.emissions.some((emission) => emission.id === selectedEmission.id);
    setWorkspace({
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission)
        : [...workspace.emissions, nextEmission],
    });
    setDirty(true);
  }

  function saveDraft() {
    commit(workspace, "Borrador guardado en este navegador.");
  }

  function saveBulletin() {
    if (!bulletinDraft?.title.trim() || !bulletinDraft.body.trim()) {
      notify("Completa el título y el detalle.");
      return;
    }
    const exists = workspace.bulletins.some((item) => item.id === bulletinDraft.id);
    const next = {
      ...workspace,
      bulletins: exists
        ? workspace.bulletins.map((item) => item.id === bulletinDraft.id ? bulletinDraft : item)
        : [...workspace.bulletins, bulletinDraft],
    };
    commit(next, exists ? "Indicación actualizada." : "Indicación añadida.");
    setBulletinDraft(null);
  }

  function saveImportantDate() {
    if (!dateDraft?.date || !dateDraft.title.trim()) {
      notify("Completa la fecha y su nombre.");
      return;
    }
    const exists = workspace.importantDates.some((item) => item.id === dateDraft.id);
    const next = {
      ...workspace,
      importantDates: exists
        ? workspace.importantDates.map((item) => item.id === dateDraft.id ? dateDraft : item)
        : [...workspace.importantDates, dateDraft],
    };
    commit(next, exists ? "Fecha actualizada." : "Fecha añadida.");
    setDateDraft(null);
  }

  function addSegment() {
    if (!selectedEmission || !selectedSlot) return;
    const last = selectedEmission.segments.at(-1);
    const startTime = last?.endTime || selectedSlot.startTime;
    updateEmission({
      status: "draft",
      segments: [
        ...selectedEmission.segments,
        { id: newId("segment"), startTime, endTime: startTime, type: "other", title: "Nuevo segmento", guest: "", notes: "" },
      ],
    });
  }

  const scheduledProgramsForDraft = dateDraft
    ? scheduleSlots
      .filter((slot) => slot.dayOfWeek === new Date(`${dateDraft.date}T12:00:00`).getDay())
      .map((slot) => ({ slot, program: programs.find((program) => program.id === slot.programId) }))
      .filter((item) => item.program)
    : [];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>RPP</span><div><strong>Pauta</strong><small>Informativos</small></div></div>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className="active">Agenda semanal <b>{daySlots.length}</b></button>
          <button disabled title="Disponible en una fase posterior">Programas <b>22</b></button>
          <button disabled title="Disponible en una fase posterior">Personas</button>
          <button disabled title="Disponible en una fase posterior">Archivo</button>
          <button disabled title="Disponible en una fase posterior">Ajustes</button>
        </nav>
        <div className="local-mode"><span>Modo local</span><strong>Fase 1</strong><p>Los cambios se guardan solo en este navegador.</p></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span>Programación informativa</span><h1>Semana del 24 al 30 de agosto</h1></div>
          <div className="topbar-actions"><button className="search" disabled title="Disponible en la Fase 2">Buscar invitado, tema o frase | Fase 2</button><span className="avatar">AG</span></div>
        </header>

        <div className="workspace-body">
          <section className="notices" aria-label="Indicaciones y fechas importantes">
            <article className="bulletin-panel">
              <header><strong>Indicaciones de la semana</strong><button onClick={() => setBulletinDraft({ id: newId("bulletin"), title: "", body: "", scope: "Todos los programas" })}>Añadir indicación</button></header>
              <div className="bulletin-list">
                {workspace.bulletins.map((item) => (
                  <button className="bulletin-item" key={item.id} onClick={() => setBulletinDraft(item)}>
                    <span><strong>{item.title}</strong><small>{item.body}</small></span><b>{item.scope}</b>
                  </button>
                ))}
              </div>
            </article>
            <article className="dates-panel">
              <header><strong>Fechas importantes</strong><button onClick={() => setDateDraft({ id: newId("date"), date: selectedDate, title: "", details: "", plans: {} })}>Añadir fecha</button></header>
              <div className="date-list">
                {workspace.importantDates.map((item) => (
                  <button className="date-item" key={item.id} onClick={() => setDateDraft(item)}>
                    <time>{new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(`${item.date}T12:00:00`)).replace(".", "").toUpperCase()}</time>
                    <span><strong>{item.title}</strong><small>{item.details}</small></span><b>Abrir</b>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="agenda-panel">
            <header className="agenda-toolbar">
              <label><span>Mostrar</span><select value={programFilter} onChange={(event) => setProgramFilter(event.target.value as "all" | "managed")}><option value="all">Toda la señal</option><option value="managed">Solo administrados</option></select></label>
              <div className="day-tabs" aria-label="Días de la semana">
                {days.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => setSelectedDate(day.date)}>{day.label}</button>)}
              </div>
              <button className="primary" disabled title="La edición de horarios se habilitará con Supabase">Añadir bloque</button>
            </header>

            <div className="agenda-layout">
              <section className="timeline">
                <header><div><strong>{selectedDay.label}</strong><span>{daySlots.length} bloques programados</span></div><div className="legend"><span>Administrado</span><span>Solo horario</span></div></header>
                <div className="slot-list">
                  {daySlots.map((slot) => {
                    const program = programs.find((item) => item.id === slot.programId);
                    if (!program) return null;
                    const emission = workspace.emissions.find((item) => item.programId === program.id && item.date === selectedDate);
                    const status = emission?.status ?? "empty";
                    const isLive = now?.date === selectedDate && now.minutes >= minutes(slot.startTime) && now.minutes < (slot.endTime === "00:00" ? 1440 : minutes(slot.endTime));
                    return (
                      <button key={slot.id} className={`slot ${selectedSlot?.id === slot.id ? "selected" : ""} ${isLive ? "live" : ""}`} onClick={() => setSelectedSlotId(slot.id)}>
                        <time>{slot.startTime}</time>
                        <span><strong>{program.name}</strong><small>{program.hosts} | {slot.startTime} - {slot.endTime}</small></span>
                        <span className="slot-badges">{isLive && <b>Al aire ahora</b>}<em>{program.managed ? "En herramienta" : "Solo horario"}</em>{program.managed && <i data-status={status}>{statusLabel[status]}</i>}</span>
                      </button>
                    );
                  })}
                  {!daySlots.length && <div className="empty-state"><strong>No hay horarios configurados</strong><p>Este día quedará disponible cuando carguemos la programación correspondiente.</p></div>}
                </div>
              </section>

              <aside className="editor">
                {selectedProgram && selectedEmission && selectedSlot ? selectedProgram.managed ? (
                  <>
                    <header className="editor-header"><div><span>{selectedDay.label} | {selectedSlot.startTime} - {selectedSlot.endTime}</span><h2>{selectedProgram.shortName}</h2></div><select value={selectedEmission.status} onChange={(event) => updateEmission({ status: event.target.value as Emission["status"] })}><option value="empty">Sin pauta</option><option value="draft">En edición</option><option value="ready">Lista</option><option value="post">Post-pauta</option></select></header>
                    <div className="editor-scroll">
                      <label className="field"><span>Pauta original</span><textarea rows={8} value={selectedEmission.rawText} onChange={(event) => updateEmission({ rawText: event.target.value, status: "draft" })} placeholder="Pega aquí la pauta recibida por WhatsApp o correo" /></label>
                      <div className="phase-two"><strong>Ordenar con IA</strong><span>Se activará en la Fase 2, después de validar el guardado manual.</span><button disabled>Próximamente</button></div>
                      <div className="segments-heading"><div><strong>Escaleta manual</strong><span>{selectedEmission.segments.length} segmentos</span></div><button onClick={addSegment}>Añadir segmento</button></div>
                      <div className="segment-list">
                        {selectedEmission.segments.map((segment) => (
                          <article className="segment" key={segment.id}>
                            <div className="segment-times"><input aria-label="Hora de inicio" value={segment.startTime} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, startTime: event.target.value } : item) })} /><span>a</span><input aria-label="Hora de fin" value={segment.endTime} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, endTime: event.target.value } : item) })} /></div>
                            <label><span>Tipo</span><select value={segment.type} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, type: event.target.value as Segment["type"] } : item) })}>{Object.entries(segmentTypeLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                            <label className="segment-title"><span>Título</span><input value={segment.title} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, title: event.target.value } : item) })} /></label>
                            <label className="segment-guest"><span>Invitado</span><input value={segment.guest} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, guest: event.target.value } : item) })} placeholder="Nombre y cargo" /></label>
                            <label className="segment-notes"><span>Notas</span><textarea rows={2} value={segment.notes} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, notes: event.target.value } : item) })} /></label>
                            <button className="remove" onClick={() => updateEmission({ segments: selectedEmission.segments.filter((item) => item.id !== segment.id) })}>Quitar</button>
                          </article>
                        ))}
                        {!selectedEmission.segments.length && <div className="empty-state compact"><strong>Aún no hay segmentos</strong><p>Puedes pegar el texto original y construir la escaleta manualmente.</p></div>}
                      </div>
                    </div>
                    <footer className="editor-footer"><span>{dirty ? "Cambios sin guardar" : hydrated ? "Guardado local" : "Cargando datos"}</span><button className="primary" onClick={saveDraft} disabled={!dirty}>Guardar borrador</button></footer>
                  </>
                ) : (
                  <div className="empty-state">
                    <strong>{selectedProgram.shortName} aparece solo como horario</strong>
                    <p>Este programa completa la señal, pero no se administra desde la herramienta. Puedes cambiar esa condición más adelante en la configuración de programas.</p>
                  </div>
                ) : <div className="empty-state"><strong>Elige un bloque</strong><p>Selecciona un programa de la agenda para editarlo.</p></div>}
              </aside>
            </div>
          </section>
        </div>
      </section>

      {bulletinDraft && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setBulletinDraft(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="bulletin-title">
            <header><div><span>Tablero semanal</span><h2 id="bulletin-title">Editar indicación</h2></div><button onClick={() => setBulletinDraft(null)}>Cerrar</button></header>
            <div className="modal-fields"><label className="field"><span>Título</span><input value={bulletinDraft.title} onChange={(event) => setBulletinDraft({ ...bulletinDraft, title: event.target.value })} /></label><label className="field"><span>Detalle</span><textarea rows={4} value={bulletinDraft.body} onChange={(event) => setBulletinDraft({ ...bulletinDraft, body: event.target.value })} /></label><label className="field"><span>Aplica a</span><select value={bulletinDraft.scope} onChange={(event) => setBulletinDraft({ ...bulletinDraft, scope: event.target.value })}><option>Todos los programas</option><option>Programas informativos</option><option>Un programa específico</option></select></label></div>
            <footer><button onClick={() => setBulletinDraft(null)}>Cancelar</button><button className="primary" onClick={saveBulletin}>Guardar indicación</button></footer>
          </section>
        </div>
      )}

      {dateDraft && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDateDraft(null)}>
          <section className="modal wide" role="dialog" aria-modal="true" aria-labelledby="date-title">
            <header><div><span>Planificación anticipada</span><h2 id="date-title">Programación del día</h2></div><button onClick={() => setDateDraft(null)}>Cerrar</button></header>
            <div className="date-modal-grid">
              <div className="modal-fields date-fields"><label className="field"><span>Fecha</span><input type="date" value={dateDraft.date} onChange={(event) => setDateDraft({ ...dateDraft, date: event.target.value })} /></label><label className="field"><span>Nombre</span><input value={dateDraft.title} onChange={(event) => setDateDraft({ ...dateDraft, title: event.target.value })} /></label><label className="field"><span>Contexto</span><textarea rows={5} value={dateDraft.details} onChange={(event) => setDateDraft({ ...dateDraft, details: event.target.value })} /></label></div>
              <div className="program-plans"><header><div><strong>Qué preparará cada programa</strong><span>{scheduledProgramsForDraft.length} bloques del día</span></div></header><div>{scheduledProgramsForDraft.map(({ slot, program }) => program && <label className="plan-row" key={slot.id}><time>{slot.startTime}</time><span><strong>{program.shortName}</strong><small>{program.managed ? "En herramienta" : "Solo horario"}</small></span><input value={dateDraft.plans[program.id] ?? ""} onChange={(event) => setDateDraft({ ...dateDraft, plans: { ...dateDraft.plans, [program.id]: event.target.value } })} placeholder="Tema, invitado o cobertura" /></label>)}</div></div>
            </div>
            <footer><button onClick={() => setDateDraft(null)}>Cancelar</button><button className="primary" onClick={saveImportantDate}>Guardar fecha</button></footer>
          </section>
        </div>
      )}

      <div className={`toast ${toast ? "visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}
