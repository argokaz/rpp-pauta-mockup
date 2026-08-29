"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PautaAiReview } from "@/components/pauta-ai-review";
import { PeopleDirectory } from "@/components/people-directory";
import { VersionHistoryModal } from "@/components/version-history-modal";
import { structurePauta } from "@/data/ai-pauta-client";
import { initialWorkspaceState, programs, scheduleSlots } from "@/data/seed";
import { CURRENT_VERSION } from "@/data/version-history";
import type { WorkspaceRepository } from "@/data/workspace-repository";
import { proposalSegmentToSegment, type ImportSource, type StructurePautaResponse } from "@/domain/pauta-import";
import { normalizePersonName } from "@/domain/people-history";
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

function newId(): string {
  return crypto.randomUUID();
}

function minutes(value: string): number {
  const [hours, minute] = value.split(":").map(Number);
  return hours * 60 + minute;
}

type WorkspaceAppProps = {
  repository: WorkspaceRepository;
  accountLabel: string;
  accountName?: string;
  canEdit: boolean;
  getAccessToken?: (forceRefresh?: boolean) => Promise<string>;
  onSignOut?: () => void;
};

type WorkspaceView = "agenda" | "program" | "desk" | "reception";

const workspaceViews: Array<{ id: WorkspaceView; code: string; label: string; description: string }> = [
  { id: "agenda", code: "A", label: "Agenda", description: "Programación semanal" },
  { id: "program", code: "B", label: "Programa", description: "Editar mi pauta" },
  { id: "desk", code: "C", label: "Mesa", description: "Control editorial" },
  { id: "reception", code: "D", label: "Recepción", description: "Pegar y ordenar" },
];

export function WorkspaceApp({ repository, accountLabel, accountName, canEdit, getAccessToken, onSignOut }: WorkspaceAppProps) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialWorkspaceState);
  const [activeView, setActiveView] = useState<WorkspaceView>("agenda");
  const [selectedDate, setSelectedDate] = useState("2026-08-28");
  const [selectedSlotId, setSelectedSlotId] = useState("encendidos-5-4");
  const [programFilter, setProgramFilter] = useState<"all" | "managed">("all");
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [now, setNow] = useState<{ date: string; minutes: number } | null>(null);
  const [bulletinDraft, setBulletinDraft] = useState<Bulletin | null>(null);
  const [dateDraft, setDateDraft] = useState<ImportantDate | null>(null);
  const [importSource, setImportSource] = useState<ImportSource>("whatsapp");
  const [receptionSender, setReceptionSender] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiApplying, setAiApplying] = useState(false);
  const [aiResult, setAiResult] = useState<StructurePautaResponse | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPeopleDirectory, setShowPeopleDirectory] = useState(false);

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      void repository.load().then((loaded) => {
        if (!active) return;
        setWorkspace(loaded);
        setHydrated(true);
      }).catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los datos.");
        setHydrated(true);
      });
      const limaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
      const limaTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setNow({ date: limaDate, minutes: minutes(limaTime) });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [repository]);

  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[4];
  const daySlots = useMemo(
    () => scheduleSlots
      .filter((slot) => slot.dayOfWeek === selectedDay.dayOfWeek)
      .filter((slot) => programFilter === "all" || programs.find((program) => program.id === slot.programId)?.managed),
    [programFilter, selectedDay.dayOfWeek],
  );

  const selectedSlot = daySlots.find((slot) => slot.id === selectedSlotId)
    ?? daySlots.find((slot) => programs.find((program) => program.id === slot.programId)?.managed)
    ?? daySlots[0];
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

  async function commit(next: WorkspaceState, message: string) {
    if (!canEdit) {
      notify("Tu perfil tiene acceso de lectura.");
      return false;
    }
    setSaving(true);
    try {
      const saved = await repository.save(next);
      setWorkspace(saved);
      setDirty(false);
      notify(message);
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron guardar los cambios.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function updateEmission(change: Partial<Emission>) {
    if (!selectedEmission || !canEdit) return;
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

  async function saveDraft() {
    await commit(workspace, repository.mode === "supabase" ? "Borrador guardado para el equipo." : "Borrador guardado en este navegador.");
  }

  async function saveBulletin() {
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
    if (await commit(next, exists ? "Indicación actualizada." : "Indicación añadida.")) setBulletinDraft(null);
  }

  async function saveImportantDate() {
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
    if (await commit(next, exists ? "Fecha actualizada." : "Fecha añadida.")) setDateDraft(null);
  }

  function addSegment() {
    if (!selectedEmission || !selectedSlot) return;
    const last = selectedEmission.segments.at(-1);
    const startTime = last?.endTime || selectedSlot.startTime;
    updateEmission({
      status: "draft",
      segments: [
        ...selectedEmission.segments,
        { id: newId(), startTime, endTime: startTime, type: "other", title: "Nuevo segmento", guest: "", notes: "" },
      ],
    });
  }

  function updateSegmentGuest(segment: Segment, value: string) {
    if (!selectedEmission) return;
    const knownPerson = workspace.people.find((person) => person.normalizedName === normalizePersonName(value));
    updateEmission({
      segments: selectedEmission.segments.map((item) => item.id === segment.id ? {
        ...item,
        guest: value,
        guestRole: knownPerson?.primaryRole ?? "",
      } : item),
    });
  }

  async function orderWithAi() {
    if (!selectedEmission || !selectedProgram || !selectedSlot || !getAccessToken) {
      notify("La IA requiere una sesión activa en la base compartida.");
      return;
    }
    if (selectedEmission.rawText.trim().length < 20) {
      notify("Pega una pauta más completa antes de ordenarla.");
      return;
    }

    setAiProcessing(true);
    try {
      const result = await structurePauta({
        programId: selectedProgram.id,
        programName: selectedProgram.name,
        targetDate: selectedDate,
        plannedStart: selectedSlot.startTime,
        plannedEnd: selectedSlot.endTime,
        sourceChannel: importSource,
        rawText: selectedEmission.rawText,
      }, getAccessToken);
      setAiResult(result);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No pudimos ordenar esta pauta.");
    } finally {
      setAiProcessing(false);
    }
  }

  async function applyAiProposal() {
    if (!aiResult || !selectedEmission) return;
    setAiApplying(true);

    const nextEmission: Emission = {
      ...selectedEmission,
      status: "draft",
      segments: aiResult.proposal.segments.map(proposalSegmentToSegment),
      updatedAt: new Date().toISOString(),
    };
    const exists = workspace.emissions.some((emission) => emission.id === selectedEmission.id);
    const nextWorkspace: WorkspaceState = {
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission)
        : [...workspace.emissions, nextEmission],
    };

    const saved = await commit(nextWorkspace, "Escaleta ordenada y guardada.");
    if (saved) {
      try {
        await repository.confirmImport(aiResult.importId);
      } catch {
        notify("La escaleta se guardó, pero falta cerrar el registro de importación.");
      }
      setAiResult(null);
    }
    setAiApplying(false);
  }

  const scheduledProgramsForDraft = dateDraft
    ? scheduleSlots
      .filter((slot) => slot.dayOfWeek === new Date(`${dateDraft.date}T12:00:00`).getDay())
      .map((slot) => ({ slot, program: programs.find((program) => program.id === slot.programId) }))
      .filter((item) => item.program)
    : [];

  const managedDaySlots = daySlots.filter((slot) => programs.find((program) => program.id === slot.programId)?.managed);

  function chooseSlot(slotId: string) {
    setSelectedSlotId(slotId);
    setAiResult(null);
  }

  function renderSavedRundown() {
    if (!selectedEmission) return <div className="empty-state compact"><strong>Elige un programa</strong><p>Selecciona el bloque que quieres revisar.</p></div>;
    if (!selectedEmission.segments.length) return <div className="empty-state compact"><strong>Aún no hay una vista ordenada</strong><p>Pega la pauta original y usa Ordenar pauta.</p></div>;

    return (
      <div className="saved-rundown-list">
        {selectedEmission.segments.map((segment, index) => (
          <details className="saved-rundown-row" key={segment.id}>
            <summary>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <time>{segment.startTime}<small>{segment.endTime}</small></time>
              <span><strong>{segment.title}</strong><small>{segmentTypeLabel[segment.type]}{segment.guest ? ` · ${segment.guest}` : ""}</small></span>
              <b>Editar</b>
            </summary>
            <div>
              <label><span>Inicio</span><input disabled={!canEdit} value={segment.startTime} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, startTime: event.target.value } : item) })} /></label>
              <label><span>Fin</span><input disabled={!canEdit} value={segment.endTime} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, endTime: event.target.value } : item) })} /></label>
              <label><span>Tipo</span><select disabled={!canEdit} value={segment.type} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, type: event.target.value as Segment["type"] } : item) })}>{Object.entries(segmentTypeLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="wide"><span>Título</span><input disabled={!canEdit} value={segment.title} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, title: event.target.value } : item) })} /></label>
              <label><span>Invitado</span><input list="known-guests" disabled={!canEdit} value={segment.guest} onChange={(event) => updateSegmentGuest(segment, event.target.value)} /></label>
              <label><span>Cargo</span><input disabled={!canEdit} value={segment.guestRole ?? ""} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, guestRole: event.target.value } : item) })} /></label>
              <label className="wide"><span>Tema</span><textarea disabled={!canEdit} rows={2} value={segment.topic ?? ""} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, topic: event.target.value } : item) })} /></label>
              <label className="wide"><span>Enfoque y notas</span><textarea disabled={!canEdit} rows={3} value={segment.focus || segment.notes} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, focus: event.target.value } : item) })} /></label>
              <button className="remove" disabled={!canEdit} onClick={() => updateEmission({ segments: selectedEmission.segments.filter((item) => item.id !== segment.id) })}>Quitar bloque</button>
            </div>
          </details>
        ))}
        <button className="add-ordered-block" disabled={!canEdit} onClick={addSegment}>Añadir bloque</button>
      </div>
    );
  }

  function renderProgramRoutes() {
    return (
      <aside className="route-rail">
        <header><span>{selectedDay.label}</span><strong>Programas administrados</strong></header>
        <div>
          {managedDaySlots.map((slot) => {
            const program = programs.find((item) => item.id === slot.programId);
            const emission = workspace.emissions.find((item) => item.programId === program?.id && item.date === selectedDate);
            if (!program) return null;
            return (
              <button className={selectedSlot?.id === slot.id ? "active" : ""} key={slot.id} onClick={() => chooseSlot(slot.id)}>
                <time>{slot.startTime}</time>
                <span><strong>{program.shortName}</strong><small>{statusLabel[emission?.status ?? "empty"]}</small></span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  function renderCaptureWorkspace(reception: boolean) {
    return (
      <section className="mode-page">
        <header className="mode-heading">
          <div><span>{reception ? "Piloto de productora general" : "Espacio del programa"}</span><h1>{reception ? "Recepción de pautas" : selectedProgram?.shortName ?? "Mi programa"}</h1><p>{reception ? "Elige el destino, pega el mensaje recibido y revisa cómo quedará." : "Trabaja la pre-pauta y la vista ordenada del bloque seleccionado."}</p></div>
          <div className="mode-day-tabs">{days.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => { setSelectedDate(day.date); setAiResult(null); }}>{day.label}</button>)}</div>
        </header>

        <div className={reception ? "reception-grid" : "program-grid"}>
          {renderProgramRoutes()}

          <section className="capture-pane">
            <header>
              <div><span>{reception ? "1. Destino y origen" : "Pauta original"}</span><h2>{selectedProgram?.shortName ?? "Selecciona un programa"}</h2></div>
              {selectedSlot && <time>{selectedSlot.startTime} a {selectedSlot.endTime}</time>}
            </header>

            {reception && (
              <div className="capture-meta">
                <label><span>Canal</span><select disabled={!canEdit} value={importSource} onChange={(event) => setImportSource(event.target.value as ImportSource)}><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="document">Documento</option><option value="other">Otro</option></select></label>
                <label><span>Enviado por</span><input disabled={!canEdit} value={receptionSender} onChange={(event) => setReceptionSender(event.target.value)} placeholder="Nombre del productor" /></label>
              </div>
            )}

            <label className="field capture-text">
              <span>{reception ? "2. Mensaje recibido" : "Pega aquí la pauta de WhatsApp, email o documento"}</span>
              <textarea disabled={!canEdit || !selectedEmission} rows={reception ? 20 : 16} value={selectedEmission?.rawText ?? ""} onChange={(event) => updateEmission({ rawText: event.target.value, status: "draft" })} placeholder="Pega el texto completo. No necesitas ordenarlo antes." />
            </label>

            <div className="capture-actions">
              <p>El original queda guardado para comparar y auditar.</p>
              {!reception && <label><span>Origen</span><select disabled={!canEdit} value={importSource} onChange={(event) => setImportSource(event.target.value as ImportSource)}><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="document">Documento</option><option value="other">Otro</option></select></label>}
              <button className="primary" disabled={!canEdit || !getAccessToken || aiProcessing || !selectedEmission || selectedEmission.rawText.trim().length < 20} onClick={orderWithAi}>{aiProcessing ? "Ordenando pauta..." : reception ? "Formatear y ubicar" : "Ordenar pauta"}</button>
            </div>
          </section>

          <section className="ordered-pane">
            {aiResult ? (
              <PautaAiReview proposal={aiResult.proposal} model={aiResult.model} applying={aiApplying} people={workspace.people} onChange={(proposal) => setAiResult({ ...aiResult, proposal })} onClose={() => setAiResult(null)} onApply={applyAiProposal} />
            ) : (
              <>
                <header className="ordered-pane-heading"><div><span>{reception ? "3. Así quedaría" : "Escaleta del programa"}</span><h2>Vista ordenada</h2></div><strong>{selectedEmission?.segments.length ?? 0} bloques</strong></header>
                {renderSavedRundown()}
                {dirty && <footer className="ordered-save"><span>Cambios sin guardar</span><button className="primary" onClick={saveDraft} disabled={saving || !canEdit}>{saving ? "Guardando..." : "Guardar cambios"}</button></footer>}
              </>
            )}
          </section>
        </div>
      </section>
    );
  }

  function renderEditorialDesk() {
    const columns: Array<{ status: Emission["status"]; title: string; hint: string }> = [
      { status: "empty", title: "Falta pauta", hint: "Requiere acción" },
      { status: "draft", title: "En preparación", hint: "Edición en curso" },
      { status: "ready", title: "Lista para salir", hint: "Revisada" },
      { status: "post", title: "Post-pauta", hint: "Emisión registrada" },
    ];
    return (
      <section className="mode-page desk-page">
        <header className="mode-heading">
          <div><span>{selectedDay.label}</span><h1>Mesa editorial</h1><p>Un vistazo operativo a todos los programas administrados del día.</p></div>
          <div className="mode-day-tabs">{days.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => setSelectedDate(day.date)}>{day.label}</button>)}</div>
        </header>
        {workspace.bulletins[0] && <article className="desk-bulletin"><span>Indicación del día</span><strong>{workspace.bulletins[0].title}</strong><p>{workspace.bulletins[0].body}</p></article>}
        <div className="desk-columns">
          {columns.map((column) => {
            const items = managedDaySlots.filter((slot) => (workspace.emissions.find((emission) => emission.programId === slot.programId && emission.date === selectedDate)?.status ?? "empty") === column.status);
            return (
              <section key={column.status} className={`desk-column desk-${column.status}`}>
                <header><div><strong>{column.title}</strong><span>{column.hint}</span></div><b>{items.length}</b></header>
                <div>
                  {items.map((slot) => {
                    const program = programs.find((item) => item.id === slot.programId);
                    const emission = workspace.emissions.find((item) => item.programId === slot.programId && item.date === selectedDate);
                    if (!program) return null;
                    return <article key={slot.id}><time>{slot.startTime}</time><h2>{program.shortName}</h2><p>{emission?.segments.length ? `${emission.segments.length} bloques estructurados` : "Sin contenido para este día."}</p><button onClick={() => { chooseSlot(slot.id); setActiveView(column.status === "empty" ? "reception" : "program"); }}>{column.status === "empty" ? "Completar" : "Abrir pauta"}</button></article>;
                  })}
                  {!items.length && <p className="desk-empty">No hay programas en este estado.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    );
  }

  if (!hydrated) {
    return <main className="access-shell"><section className="access-panel compact"><strong>Cargando la agenda</strong><p>Estamos recuperando la pauta y los horarios.</p></section></main>;
  }

  if (loadError) {
    return <main className="access-shell"><section className="access-panel compact"><strong>No pudimos cargar la agenda</strong><p>{loadError}</p><button className="primary" onClick={() => window.location.reload()}>Reintentar</button></section></main>;
  }

  return (
    <main className="product-shell">
      <header className="mode-switcher">
        <div className="switcher-brand"><Image src="/rpp-logo.svg" alt="RPP" width={38} height={38} priority /><span><strong>Pauta RPP</strong><small>Informativos</small></span></div>
        <nav aria-label="Vistas de trabajo">
          {workspaceViews.map((view) => (
            <button className={activeView === view.id ? "active" : ""} key={view.id} onClick={() => setActiveView(view.id)} aria-current={activeView === view.id ? "page" : undefined}>
              <b>{view.code}</b><span><strong>{view.label}</strong><small>{view.description}</small></span>
            </button>
          ))}
        </nav>
        <div className="switcher-account"><span>{accountName ?? "Equipo editorial"}</span><b>{accountLabel}</b></div>
      </header>

      {activeView === "agenda" && (
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><Image src="/rpp-logo.svg" alt="RPP" width={48} height={48} priority /><div><strong>Pauta</strong><small>Informativos</small></div></div>
        <label className="sidebar-filter"><span>Programa</span><select value={programFilter} onChange={(event) => setProgramFilter(event.target.value as "all" | "managed")}><option value="all">Todos los programas</option><option value="managed">Solo administrados</option></select></label>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className="active">Agenda semanal <b>35</b></button>
          <button onClick={() => notify("La vista de indicaciones se habilitará después del piloto.")}>Indicaciones <b>{workspace.bulletins.length}</b></button>
          <button onClick={() => setShowPeopleDirectory(true)}>Personas <b>{workspace.people.length}</b></button>
          <button onClick={() => notify("El archivo histórico se habilitará en la siguiente fase.")}>Archivo</button>
          <button onClick={() => notify("El calendario anual se habilitará después del piloto.")}>Calendario anual</button>
        </nav>
        <div className="side-summary"><span>Semana 35</span><strong>22 programas</strong><small>Administrados dentro de la señal completa</small></div>
        <div className="sidebar-footer">
          <button className="version-button" onClick={() => setShowVersionHistory(true)} aria-label={`Ver historial de versiones. Versión actual ${CURRENT_VERSION}`}>
            <span>Versión actual</span><strong>v{CURRENT_VERSION}</strong><small>Ver novedades</small>
          </button>
          {onSignOut ? <button className="nav-bottom" onClick={onSignOut}>Cerrar sesión</button> : <div className="side-mode"><span>{repository.mode === "supabase" ? "Base compartida" : "Modo local"}</span><small>{accountName ?? "Fase 1"}</small></div>}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span>Programación informativa</span><h1>Semana del 24 al 30 de agosto</h1></div>
          <div className="topbar-actions"><button className="search" onClick={() => setShowPeopleDirectory(true)}>Buscar invitado, tema o programa</button><span className="avatar">{accountLabel}</span></div>
        </header>

        <div className="workspace-body">
          <section className="notices" aria-label="Indicaciones y fechas importantes">
            <article className="bulletin-panel">
              <header><strong>Indicaciones de la semana</strong><button disabled={!canEdit} onClick={() => setBulletinDraft({ id: newId(), title: "", body: "", scope: "Todos los programas" })}>Añadir indicación</button></header>
              <div className="bulletin-list">
                {workspace.bulletins.map((item) => (
                  <button className="bulletin-item" key={item.id} disabled={!canEdit} onClick={() => setBulletinDraft(item)}>
                    <span><strong>{item.title}</strong><small>{item.body}</small></span><b>{item.scope}</b>
                  </button>
                ))}
              </div>
            </article>
            <article className="dates-panel">
              <header><strong>Fechas importantes</strong><button disabled={!canEdit} onClick={() => setDateDraft({ id: newId(), date: selectedDate, title: "", details: "", plans: {} })}>Añadir fecha</button></header>
              <div className="date-list">
                {workspace.importantDates.map((item) => (
                  <button className="date-item" key={item.id} disabled={!canEdit} onClick={() => setDateDraft(item)}>
                    <time>{new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(`${item.date}T12:00:00`)).replace(".", "").toUpperCase()}</time>
                    <span><strong>{item.title}</strong><small>{item.details}</small></span><b>Abrir</b>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="agenda-panel">
            <header className="agenda-toolbar">
              <div className="week-nav"><button onClick={() => notify("La navegación entre semanas se habilitará después del piloto.")}>Anterior</button><button className="today-button" onClick={() => setSelectedDate("2026-08-28")}>Esta semana</button><button onClick={() => notify("La navegación entre semanas se habilitará después del piloto.")}>Siguiente</button></div>
              <div className="day-tabs" aria-label="Días de la semana">
                {days.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => setSelectedDate(day.date)}>{day.label}</button>)}
              </div>
              <button className="primary" onClick={() => notify("La edición de horarios se habilitará después del piloto.")}>Añadir bloque</button>
            </header>

            <div className="agenda-layout">
              <section className="timeline-panel">
                <header><div><strong>{selectedDay.label}</strong><span>{daySlots.length} bloques programados</span></div><div className="legend"><span>Administrado</span><span>Solo horario</span></div></header>
                <div className="slot-list">
                  {daySlots.map((slot) => {
                    const program = programs.find((item) => item.id === slot.programId);
                    if (!program) return null;
                    const emission = workspace.emissions.find((item) => item.programId === program.id && item.date === selectedDate);
                    const status = emission?.status ?? "empty";
                    const isLive = now?.date === selectedDate && now.minutes >= minutes(slot.startTime) && now.minutes < (slot.endTime === "00:00" ? 1440 : minutes(slot.endTime));
                    return (
                      <div className="schedule-row" key={slot.id}>
                        <time className="schedule-time">{slot.startTime}</time>
                        <button className={`schedule-card status-${status} ${selectedSlot?.id === slot.id ? "selected" : ""} ${!program.managed ? "schedule-only" : ""} ${isLive ? "live" : ""}`} onClick={() => setSelectedSlotId(slot.id)}>
                          <span className="schedule-main"><strong>{program.name}</strong><small>{program.hosts} | {slot.startTime} - {slot.endTime}</small></span>
                          <span className="slot-badges">{isLive && <b>Al aire ahora</b>}<em className={program.managed ? "managed-label" : "schedule-only-label"}>{program.managed ? "En herramienta" : "Solo horario"}</em>{program.managed && <i data-status={status}>{statusLabel[status]}</i>}</span>
                        </button>
                        <button className="row-actions" onClick={() => setSelectedSlotId(slot.id)}>Más</button>
                      </div>
                    );
                  })}
                  {!daySlots.length && <div className="empty-state"><strong>No hay horarios configurados</strong><p>Este día quedará disponible cuando carguemos la programación correspondiente.</p></div>}
                </div>
              </section>

              <aside className="editor">
                {selectedProgram && selectedEmission && selectedSlot ? selectedProgram.managed ? (
                  <>
                    <header className="editor-header"><div><span>{selectedDay.label} | {selectedSlot.startTime} - {selectedSlot.endTime}</span><h2>{selectedProgram.shortName}</h2></div><select disabled={!canEdit} value={selectedEmission.status} onChange={(event) => updateEmission({ status: event.target.value as Emission["status"] })}><option value="empty">Sin pauta</option><option value="draft">En edición</option><option value="ready">Lista</option><option value="post">Post-pauta</option></select></header>
                    <div className="editor-scroll">
                      <label className="field"><span>Pauta original</span><textarea disabled={!canEdit} rows={8} value={selectedEmission.rawText} onChange={(event) => updateEmission({ rawText: event.target.value, status: "draft" })} placeholder="Pega aquí la pauta recibida por WhatsApp o correo" /></label>
                      <div className="phase-two">
                        <div><strong>Ordenar con IA</strong><span>Genera una propuesta editable. El original se conserva sin cambios.</span></div>
                        <label><span>Origen</span><select disabled={!canEdit || aiProcessing} value={importSource} onChange={(event) => setImportSource(event.target.value as ImportSource)}><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="document">Documento</option><option value="other">Otro</option></select></label>
                        <button className="ai-action" disabled={!canEdit || !getAccessToken || aiProcessing || selectedEmission.rawText.trim().length < 20} onClick={orderWithAi}>{aiProcessing ? "Ordenando..." : "Ordenar pauta"}</button>
                      </div>
                      {aiResult && (
                        <PautaAiReview proposal={aiResult.proposal} model={aiResult.model} applying={aiApplying} people={workspace.people} onChange={(proposal) => setAiResult({ ...aiResult, proposal })} onClose={() => setAiResult(null)} onApply={applyAiProposal} />
                      )}
                      <div className="segments-heading"><div><strong>Escaleta</strong><span>{selectedEmission.segments.length} segmentos</span></div><button disabled={!canEdit} onClick={addSegment}>Añadir segmento</button></div>
                      <div className="segment-list">
                        {selectedEmission.segments.map((segment) => (
                          <article className="segment" key={segment.id}>
                            <div className="segment-times"><input disabled={!canEdit} aria-label="Hora de inicio" value={segment.startTime} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, startTime: event.target.value } : item) })} /><span>a</span><input disabled={!canEdit} aria-label="Hora de fin" value={segment.endTime} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, endTime: event.target.value } : item) })} /></div>
                            <label><span>Tipo</span><select disabled={!canEdit} value={segment.type} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, type: event.target.value as Segment["type"] } : item) })}>{Object.entries(segmentTypeLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                            <label className="segment-title"><span>Título</span><input disabled={!canEdit} value={segment.title} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, title: event.target.value } : item) })} /></label>
                            <label className="segment-guest"><span>Invitado</span><input list="known-guests" disabled={!canEdit} value={segment.guest} onChange={(event) => updateSegmentGuest(segment, event.target.value)} placeholder="Empieza a escribir un nombre" /></label>
                            <label className="segment-notes"><span>Notas</span><textarea disabled={!canEdit} rows={2} value={segment.notes} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, notes: event.target.value } : item) })} /></label>
                            <details className="segment-details">
                              <summary>Detalles extraídos</summary>
                              <div>
                                <label><span>Cargo</span><input disabled={!canEdit} value={segment.guestRole ?? ""} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, guestRole: event.target.value } : item) })} /></label>
                                <label><span>Tema</span><textarea disabled={!canEdit} rows={2} value={segment.topic ?? ""} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, topic: event.target.value } : item) })} /></label>
                                <label><span>Enfoque</span><textarea disabled={!canEdit} rows={3} value={segment.focus ?? ""} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, focus: event.target.value } : item) })} /></label>
                                <label><span>Pregunta al público</span><textarea disabled={!canEdit} rows={2} value={segment.audienceQuestion ?? ""} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, audienceQuestion: event.target.value } : item) })} /></label>
                                <label><span>Indicaciones de producción</span><textarea disabled={!canEdit} rows={2} value={(segment.productionCues ?? []).join("\n")} onChange={(event) => updateEmission({ segments: selectedEmission.segments.map((item) => item.id === segment.id ? { ...item, productionCues: event.target.value.split("\n").map((cue) => cue.trim()).filter(Boolean) } : item) })} /></label>
                              </div>
                            </details>
                            <button className="remove" disabled={!canEdit} onClick={() => updateEmission({ segments: selectedEmission.segments.filter((item) => item.id !== segment.id) })}>Quitar</button>
                          </article>
                        ))}
                        {!selectedEmission.segments.length && <div className="empty-state compact"><strong>Aún no hay segmentos</strong><p>Puedes pegar el texto original y construir la escaleta manualmente.</p></div>}
                      </div>
                    </div>
                    <footer className="editor-footer"><span>{saving ? "Guardando" : dirty ? "Cambios sin guardar" : repository.mode === "supabase" ? "Guardado para el equipo" : "Guardado local"}</span><button className="primary" onClick={saveDraft} disabled={!dirty || saving || !canEdit}>{saving ? "Guardando..." : "Guardar borrador"}</button></footer>
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
      </div>
      )}

      {activeView === "program" && renderCaptureWorkspace(false)}
      {activeView === "desk" && renderEditorialDesk()}
      {activeView === "reception" && renderCaptureWorkspace(true)}

      {bulletinDraft && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setBulletinDraft(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="bulletin-title">
            <header><div><span>Tablero semanal</span><h2 id="bulletin-title">Editar indicación</h2></div><button onClick={() => setBulletinDraft(null)}>Cerrar</button></header>
            <div className="modal-fields"><label className="field"><span>Título</span><input value={bulletinDraft.title} onChange={(event) => setBulletinDraft({ ...bulletinDraft, title: event.target.value })} /></label><label className="field"><span>Detalle</span><textarea rows={4} value={bulletinDraft.body} onChange={(event) => setBulletinDraft({ ...bulletinDraft, body: event.target.value })} /></label><label className="field"><span>Aplica a</span><select value={bulletinDraft.scope} onChange={(event) => setBulletinDraft({ ...bulletinDraft, scope: event.target.value })}><option>Todos los programas</option><option>Programas informativos</option></select></label></div>
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

      <datalist id="known-guests">
        {workspace.people.map((person) => <option key={person.id} value={person.displayName}>{person.primaryRole}</option>)}
      </datalist>

      {showPeopleDirectory && <PeopleDirectory people={workspace.people} onClose={() => setShowPeopleDirectory(false)} />}

      {showVersionHistory && <VersionHistoryModal onClose={() => setShowVersionHistory(false)} />}

      {activeView !== "agenda" && (
        <button className="floating-version" onClick={() => setShowVersionHistory(true)} aria-label={`Ver historial de versiones. Versión actual ${CURRENT_VERSION}`}>
          <span>Versión</span><strong>v{CURRENT_VERSION}</strong>
        </button>
      )}

      <div className={`toast ${toast ? "visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}
