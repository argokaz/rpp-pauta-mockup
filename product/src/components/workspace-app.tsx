"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FocusEvent, type MouseEvent } from "react";
import Image from "next/image";
import { DragDropProvider, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/react";
import { PautaAiReview } from "@/components/pauta-ai-review";
import { ArchiveSearch } from "@/components/archive-search";
import { PeopleDirectory } from "@/components/people-directory";
import { RundownBlock } from "@/components/rundown-block";
import { VersionHistoryModal } from "@/components/version-history-modal";
import { WorkspaceLoadingShell } from "@/components/workspace-loading-shell";
import { structurePauta } from "@/data/ai-pauta-client";
import { DEMO_DATA_AVAILABLE, isDemoId, mergeDemoEmissions, mergeDemoPeople, stripDemoData } from "@/data/demo-week";
import { initialWorkspaceState, programs, scheduleSlots } from "@/data/seed";
import { CURRENT_VERSION } from "@/data/version-history";
import type { SegmentRevision, SegmentSaveResult, WorkspaceRepository } from "@/data/workspace-repository";
import { proposalSegmentToSegment, type StructurePautaResponse } from "@/domain/pauta-import";
import type { ArchiveSearchRecord } from "@/domain/archive-search";
import { findSimilarPeople, normalizePersonName } from "@/domain/people-history";
import { markStoryResult, moveStoryInActualOrder, storyResultComplete } from "@/domain/post-pauta";
import { durationMinutes, endTimeForDuration, formatDuration, reorderItems } from "@/domain/rundown";
import { emissionSchema } from "@/domain/schemas";
import type { Bulletin, Emission, ImportantDate, PostPauta, Program, ScheduleSlot, Segment, StoryItem, WorkspaceState } from "@/domain/schemas";

const DEMO_TOGGLE_STORAGE_KEY = "rpp-pauta-demo-enabled";
const DEMO_OVERRIDES_STORAGE_KEY = "rpp-pauta-demo-overrides";
const PRODUCER_NOTICES_STORAGE_KEY = "rpp-pauta-producer-notices-seen";

type ProducerComposerMode = "paste" | "write";
type SegmentSyncStatus = "pending" | "saving" | "saved" | "error" | "conflict";
type SegmentSavePayload = { emission: Emission; segment: Segment; sortOrder: number };
type SegmentConflict = { localSegment: Segment; remoteSegment?: Segment; editorName: string };

const days = [
  { label: "Lun 24", date: "2026-08-24", dayOfWeek: 1 },
  { label: "Mar 25", date: "2026-08-25", dayOfWeek: 2 },
  { label: "Mié 26", date: "2026-08-26", dayOfWeek: 3 },
  { label: "Jue 27", date: "2026-08-27", dayOfWeek: 4 },
  { label: "Vie 28", date: "2026-08-28", dayOfWeek: 5 },
  { label: "Sáb 29", date: "2026-08-29", dayOfWeek: 6 },
  { label: "Dom 30", date: "2026-08-30", dayOfWeek: 0 },
];

function editorialDayForDate(date: string) {
  const scheduledDay = days.find((day) => day.date === date);
  if (scheduledDay) return scheduledDay;

  const parsedDate = new Date(`${date}T12:00:00`);
  const formattedLabel = new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(parsedDate).replaceAll(".", "");

  return {
    label: formattedLabel.charAt(0).toUpperCase() + formattedLabel.slice(1),
    date,
    dayOfWeek: parsedDate.getDay(),
  };
}

function shiftIsoDate(date: string, amount: number): string {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + amount);
  return new Intl.DateTimeFormat("en-CA").format(shifted);
}

function longSpanishDate(date: string): string {
  if (!date) return "Elige una fecha";
  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "Elige una fecha válida";
  const label = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const statusLabel: Record<Emission["status"], string> = {
  empty: "Sin pauta",
  draft: "En edición",
  ready: "Lista",
  post: "Post-pauta",
};

const kanbanStatuses: Emission["status"][] = ["empty", "draft", "ready", "post"];

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

const dispositionLabel: Record<NonNullable<Segment["disposition"]>, string> = {
  aired: "Emitido",
  partial: "Parcial",
  skipped: "No salió",
  added_live: "Añadido en vivo",
};

const postReviewLabel: Record<PostPauta["reviewStatus"], string> = {
  capture: "Registro en curso",
  review: "Pendiente de revisión",
  verified: "Post-pauta verificada",
};

function emptyPostPauta(): PostPauta {
  return {
    reviewStatus: "capture",
    sourceType: "none",
    sourceUrl: "",
    transcriptStatus: "none",
    notes: "",
  };
}

function emptyEmission(programId: string, date: string, producerName = ""): Emission {
  return {
    id: `emission-${programId}-${date}`,
    programId,
    date,
    status: "empty",
    rawText: "",
    producerName,
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

type KanbanCardProps = {
  slot: ScheduleSlot;
  program: Program;
  emission?: Emission;
  status: Emission["status"];
  canEdit: boolean;
  saving: boolean;
  isDemo: boolean;
  onMove: (slotId: string, status: Emission["status"]) => void;
  onOpen: () => void;
};

function KanbanCard({ slot, program, emission, status, canEdit, saving, isDemo, onMove, onOpen }: KanbanCardProps) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: slot.id,
    type: "program-card",
    data: { status },
    disabled: !canEdit || saving,
  });

  return (
    <article ref={ref} className={`kanban-card ${isDragging ? "dragging" : ""} ${isDemo ? "demo-card" : ""}`}>
      <header>
        <time>{slot.startTime}</time>
        <button ref={handleRef} className="kanban-drag-handle" disabled={!canEdit || saving} aria-label={`Arrastrar ${program.shortName}`}>
          {saving ? "Guardando" : "Arrastrar"}
        </button>
      </header>
      <h2>{program.shortName}</h2>
      <div className="kanban-card-meta">
        <span>{emission?.segments.length ? `${emission.segments.length} bloques` : "Sin contenido"}</span>
        <span>{emission?.producerName?.trim() || "Productor pendiente"}</span>
        {isDemo && <b>Datos de prueba</b>}
      </div>
      <footer>
        <label>
          <span>Estado</span>
          <select disabled={!canEdit || saving} value={status} onChange={(event) => onMove(slot.id, event.target.value as Emission["status"])} aria-label={`Cambiar estado de ${program.shortName}`}>
            {kanbanStatuses.map((value) => <option value={value} key={value}>{statusLabel[value]}</option>)}
          </select>
        </label>
        <button className="kanban-open" onClick={onOpen}>{status === "empty" ? "Completar" : "Abrir pauta"}</button>
      </footer>
    </article>
  );
}

type KanbanColumnProps = {
  status: Emission["status"];
  title: string;
  hint: string;
  canEdit: boolean;
  children: React.ReactNode;
  count: number;
  mobileActive: boolean;
};

function KanbanColumn({ status, title, hint, canEdit, children, count, mobileActive }: KanbanColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id: status,
    type: "status-column",
    accept: "program-card",
    disabled: !canEdit,
  });

  return (
    <section ref={ref} className={`desk-column desk-${status} ${mobileActive ? "mobile-active" : ""} ${isDropTarget ? "drop-target" : ""}`}>
      <header><div><strong>{title}</strong><span>{hint}</span></div><b>{count}</b></header>
      <div>{children}</div>
    </section>
  );
}

type WorkspaceAppProps = {
  repository: WorkspaceRepository;
  initialWorkspace?: WorkspaceState;
  accountLabel: string;
  accountName?: string;
  canEdit: boolean;
  getAccessToken?: (forceRefresh?: boolean) => Promise<string>;
  onSignOut?: () => void;
  producerProgramId?: string;
};

type WorkspaceView = "agenda" | "program" | "desk" | "reception" | "post";

const workspaceViews: Array<{ id: WorkspaceView; code: string; label: string; description: string }> = [
  { id: "agenda", code: "A", label: "Agenda", description: "Programación semanal" },
  { id: "desk", code: "B", label: "Mesa", description: "Kanban editorial" },
  { id: "program", code: "C", label: "Programa", description: "Editar mi pauta" },
  { id: "reception", code: "D", label: "Recepción", description: "Pegar y ordenar" },
  { id: "post", code: "E", label: "Post", description: "Registrar lo emitido" },
];

export function WorkspaceApp({ repository, initialWorkspace, accountLabel, accountName, canEdit, getAccessToken, onSignOut, producerProgramId }: WorkspaceAppProps) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => initialWorkspace ?? initialWorkspaceState);
  const [activeView, setActiveView] = useState<WorkspaceView>("agenda");
  const [selectedDate, setSelectedDate] = useState("2026-08-28");
  const [selectedSlotId, setSelectedSlotId] = useState("encendidos-5-4");
  const [programFilter, setProgramFilter] = useState<"all" | "managed">("all");
  const [hydrated, setHydrated] = useState(Boolean(initialWorkspace));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [now, setNow] = useState<{ date: string; minutes: number; time: string } | null>(null);
  const [bulletinDraft, setBulletinDraft] = useState<Bulletin | null>(null);
  const [dateDraft, setDateDraft] = useState<ImportantDate | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiApplying, setAiApplying] = useState(false);
  const [aiResult, setAiResult] = useState<StructurePautaResponse | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPeopleDirectory, setShowPeopleDirectory] = useState(false);
  const [showArchiveSearch, setShowArchiveSearch] = useState(false);
  const [producerExperience, setProducerExperience] = useState(Boolean(producerProgramId));
  const [producerSection, setProducerSection] = useState<"today" | "people" | "post">("today");
  const [producerPeopleQuery, setProducerPeopleQuery] = useState("");
  const [producerComposerMode, setProducerComposerMode] = useState<ProducerComposerMode | null>(null);
  const [showProducerNewPauta, setShowProducerNewPauta] = useState(false);
  const [producerNewPautaDate, setProducerNewPautaDate] = useState("2026-08-31");
  const [producerNewPautaMode, setProducerNewPautaMode] = useState<ProducerComposerMode>("paste");
  const [producerNoticesUpdated, setProducerNoticesUpdated] = useState(false);
  const [kanbanSavingId, setKanbanSavingId] = useState("");
  const [mobileDeskStatus, setMobileDeskStatus] = useState<Emission["status"]>("empty");
  const [captureCollapsed, setCaptureCollapsed] = useState(false);
  const [expandedSavedSegments, setExpandedSavedSegments] = useState<Set<string>>(() => new Set());
  const [demoDataEnabled, setDemoDataEnabled] = useState(DEMO_DATA_AVAILABLE);
  const [demoOverrides, setDemoOverrides] = useState<Emission[]>([]);
  const [segmentSyncStates, setSegmentSyncStates] = useState<Record<string, SegmentSyncStatus>>({});
  const [segmentConflicts, setSegmentConflicts] = useState<Record<string, SegmentConflict>>({});
  const [segmentHistory, setSegmentHistory] = useState<{ segmentId: string; title: string; loading: boolean; entries: SegmentRevision[] } | null>(null);
  const segmentSaveTimersRef = useRef<Map<string, number>>(new Map());
  const segmentSavesInFlightRef = useRef<Set<string>>(new Set());
  const pendingSegmentSavesRef = useRef<Map<string, SegmentSavePayload>>(new Map());
  const latestSegmentVersionsRef = useRef<Map<string, number>>(new Map());
  const segmentSyncStatesRef = useRef<Record<string, SegmentSyncStatus>>({});
  const segmentConflictsRef = useRef<Record<string, SegmentConflict>>({});

  useEffect(() => () => {
    segmentSaveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    segmentSaveTimersRef.current.clear();
  }, []);

  useEffect(() => {
    workspace.emissions.forEach((emission) => emission.segments.forEach((segment) => {
      if (segment.version !== undefined && !segmentSavesInFlightRef.current.has(segment.id)) {
        latestSegmentVersionsRef.current.set(segment.id, segment.version);
      }
    }));
  }, [workspace.emissions]);

  useEffect(() => {
    segmentSyncStatesRef.current = segmentSyncStates;
  }, [segmentSyncStates]);

  useEffect(() => {
    segmentConflictsRef.current = segmentConflicts;
  }, [segmentConflicts]);

  useEffect(() => {
    if (initialWorkspace) return;
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
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [initialWorkspace, repository]);

  useEffect(() => {
    function updateLimaClock() {
      const currentDate = new Date();
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(currentDate);
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(currentDate);
      setNow({ date, time, minutes: minutes(time) });
    }
    updateLimaClock();
    const timer = window.setInterval(updateLimaClock, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!DEMO_DATA_AVAILABLE) return;
    const frame = window.requestAnimationFrame(() => {
      const storedToggle = window.localStorage.getItem(DEMO_TOGGLE_STORAGE_KEY);
      if (storedToggle === "false") setDemoDataEnabled(false);

      const storedOverrides = window.localStorage.getItem(DEMO_OVERRIDES_STORAGE_KEY);
      if (!storedOverrides) return;
      try {
        const parsed = emissionSchema.array().safeParse(JSON.parse(storedOverrides));
        if (parsed.success) setDemoOverrides(parsed.data.filter((emission) => isDemoId(emission.id)));
      } catch {
        window.localStorage.removeItem(DEMO_OVERRIDES_STORAGE_KEY);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!repository.subscribe) return;
    return repository.subscribe(() => {
      if (dirty || saving || Object.values(segmentSyncStatesRef.current).some((state) => state === "pending" || state === "saving" || state === "conflict")) return;
      void repository.load().then((loaded) => setWorkspace(loaded)).catch(() => undefined);
    });
  }, [dirty, repository, saving]);

  const effectiveEmissions = useMemo(
    () => mergeDemoEmissions(workspace.emissions, demoOverrides, demoDataEnabled),
    [demoDataEnabled, demoOverrides, workspace.emissions],
  );
  const effectivePeople = useMemo(
    () => mergeDemoPeople(workspace.people, demoDataEnabled),
    [demoDataEnabled, workspace.people],
  );
  const producerNoticesSignature = useMemo(() => JSON.stringify({
    bulletins: workspace.bulletins.map(({ id, title, body }) => ({ id, title, body })),
    importantDates: workspace.importantDates.map(({ id, date, title, details }) => ({ id, date, title, details })),
  }), [workspace.bulletins, workspace.importantDates]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProducerNoticesUpdated(window.localStorage.getItem(PRODUCER_NOTICES_STORAGE_KEY) !== producerNoticesSignature);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [producerNoticesSignature]);

  const selectedDay = editorialDayForDate(selectedDate);
  const selectedDateIsInVisibleWeek = days.some((day) => day.date === selectedDate);
  const daySlots = useMemo(
    () => scheduleSlots
      .filter((slot) => slot.dayOfWeek === selectedDay.dayOfWeek)
      .filter((slot) => !producerExperience || slot.programId === (producerProgramId ?? "encendidos"))
      .filter((slot) => programFilter === "all" || programs.find((program) => program.id === slot.programId)?.managed),
    [producerExperience, producerProgramId, programFilter, selectedDay.dayOfWeek],
  );

  const selectedSlot = daySlots.find((slot) => slot.id === selectedSlotId)
    ?? daySlots.find((slot) => programs.find((program) => program.id === slot.programId)?.managed)
    ?? daySlots[0];
  const selectedProgram = programs.find((program) => program.id === selectedSlot?.programId);
  const rememberedProducer = effectiveEmissions
    .filter((emission) => emission.programId === selectedProgram?.id && emission.producerName.trim())
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .at(-1)?.producerName ?? "";
  const storedEmission = effectiveEmissions.find(
    (emission) => emission.programId === selectedProgram?.id && emission.date === selectedDate,
  );
  const selectedEmission = selectedProgram && selectedSlot
    ? storedEmission ?? emptyEmission(selectedProgram.id, selectedDate, rememberedProducer)
    : null;
  const selectedEmissionIsDemo = Boolean(selectedEmission && isDemoId(selectedEmission.id));
  const producerSuggestions = [...new Set(effectiveEmissions.map((emission) => emission.producerName.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  function upsertDemoOverride(nextEmission: Emission, persist = false) {
    setDemoOverrides((current) => {
      const exists = current.some((emission) => emission.id === nextEmission.id);
      const next = exists
        ? current.map((emission) => emission.id === nextEmission.id ? nextEmission : emission)
        : [...current, nextEmission];
      if (persist) window.localStorage.setItem(DEMO_OVERRIDES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleDemoData() {
    if (!DEMO_DATA_AVAILABLE) return;
    const next = !demoDataEnabled;
    setDemoDataEnabled(next);
    setDirty(false);
    window.localStorage.setItem(DEMO_TOGGLE_STORAGE_KEY, String(next));
    notify(next ? "Datos de prueba activados." : "Datos de prueba ocultos. Las pautas reales siguen intactas.");
  }

  function resetDemoData() {
    setDemoOverrides([]);
    setDirty(false);
    window.localStorage.removeItem(DEMO_OVERRIDES_STORAGE_KEY);
    notify("La semana de prueba volvió a su estado inicial.");
  }

  async function commit(next: WorkspaceState, message: string) {
    if (!canEdit) {
      notify("Tu perfil tiene acceso de lectura.");
      return false;
    }
    setSaving(true);
    try {
      const cleanNext = stripDemoData(next);
      const scopedEmission = producerProgramId
        ? cleanNext.emissions.find((emission) => emission.programId === producerProgramId && emission.date === selectedDate)
        : undefined;
      const saved = scopedEmission && repository.saveProgramEmission
        ? await repository.saveProgramEmission(scopedEmission)
        : await repository.save(cleanNext);
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
    if (isDemoId(selectedEmission.id)) {
      upsertDemoOverride(nextEmission);
      setDirty(true);
      return;
    }
    const exists = workspace.emissions.some((emission) => emission.id === selectedEmission.id);
    setWorkspace({
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission)
        : [...workspace.emissions, nextEmission],
    });
    setDirty(true);
  }

  function replaceLocalSegment(segmentId: string, replacement?: Segment) {
    setWorkspace((current) => ({
      ...current,
      emissions: current.emissions.map((emission) => emission.segments.some((segment) => segment.id === segmentId)
        ? { ...emission, segments: replacement ? emission.segments.map((segment) => segment.id === segmentId ? replacement : segment) : emission.segments.filter((segment) => segment.id !== segmentId) }
        : emission),
    }));
  }

  async function saveSegmentPayload(payload: SegmentSavePayload): Promise<SegmentSaveResult | undefined> {
    const { segment } = payload;
    if (!repository.saveSegment || isDemoId(payload.emission.id)) return undefined;
    if (segmentSavesInFlightRef.current.has(segment.id)) {
      pendingSegmentSavesRef.current.set(segment.id, payload);
      return undefined;
    }

    segmentSavesInFlightRef.current.add(segment.id);
    setSegmentSyncStates((current) => ({ ...current, [segment.id]: "saving" }));
    const knownVersion = latestSegmentVersionsRef.current.get(segment.id);
    const versionedPayload = knownVersion === undefined
      ? payload
      : { ...payload, segment: { ...segment, version: knownVersion } };

    try {
      const result = await repository.saveSegment(versionedPayload.emission, versionedPayload.segment, versionedPayload.sortOrder);
      if (result.status === "conflict") {
        if (result.remoteSegment?.version !== undefined) latestSegmentVersionsRef.current.set(segment.id, result.remoteSegment.version);
        segmentConflictsRef.current = {
          ...segmentConflictsRef.current,
          [segment.id]: { localSegment: payload.segment, remoteSegment: result.remoteSegment, editorName: result.editorName },
        };
        setSegmentConflicts((current) => ({
          ...current,
          [segment.id]: { localSegment: payload.segment, remoteSegment: result.remoteSegment, editorName: result.editorName },
        }));
        setSegmentSyncStates((current) => ({ ...current, [segment.id]: "conflict" }));
        pendingSegmentSavesRef.current.delete(segment.id);
        return result;
      }

      latestSegmentVersionsRef.current.set(segment.id, result.segment.version ?? 0);
      setWorkspace((current) => ({
        ...current,
        emissions: current.emissions.map((emission) => ({
          ...emission,
          segments: emission.segments.map((item) => item.id === segment.id
            ? { ...item, version: result.segment.version, lastEditedAt: result.segment.lastEditedAt }
            : item),
        })),
      }));
      setSegmentConflicts((current) => {
        const next = { ...current };
        delete next[segment.id];
        return next;
      });
      setSegmentSyncStates((current) => ({ ...current, [segment.id]: "saved" }));
      return result;
    } catch (error) {
      setSegmentSyncStates((current) => ({ ...current, [segment.id]: "error" }));
      notify(error instanceof Error ? error.message : "No se pudo guardar este bloque.");
      return undefined;
    } finally {
      segmentSavesInFlightRef.current.delete(segment.id);
      const pending = pendingSegmentSavesRef.current.get(segment.id);
      if (pending && !segmentConflictsRef.current[segment.id]) {
        pendingSegmentSavesRef.current.delete(segment.id);
        void saveSegmentPayload(pending);
      }
    }
  }

  function scheduleSegmentSave(payload: SegmentSavePayload, delay = 700) {
    if (!repository.saveSegment || isDemoId(payload.emission.id)) return;
    pendingSegmentSavesRef.current.set(payload.segment.id, payload);
    const existingTimer = segmentSaveTimersRef.current.get(payload.segment.id);
    if (existingTimer) window.clearTimeout(existingTimer);
    setSegmentSyncStates((current) => ({ ...current, [payload.segment.id]: "pending" }));
    const timer = window.setTimeout(() => {
      segmentSaveTimersRef.current.delete(payload.segment.id);
      const latest = pendingSegmentSavesRef.current.get(payload.segment.id);
      if (!latest) return;
      pendingSegmentSavesRef.current.delete(payload.segment.id);
      void saveSegmentPayload(latest);
    }, delay);
    segmentSaveTimersRef.current.set(payload.segment.id, timer);
  }

  function updateSegmentDraft(segmentId: string, change: Partial<Segment>, delay = 700) {
    if (!selectedEmission || !canEdit) return;
    const sortOrder = selectedEmission.segments.findIndex((segment) => segment.id === segmentId);
    if (sortOrder < 0) return;
    const nextSegment = { ...selectedEmission.segments[sortOrder], ...change };
    if (selectedEmissionIsDemo) {
      updateEmission({ segments: selectedEmission.segments.map((segment) => segment.id === segmentId ? nextSegment : segment) });
      return;
    }
    const nextEmission = {
      ...selectedEmission,
      status: selectedEmission.status === "empty" ? "draft" as const : selectedEmission.status,
      segments: selectedEmission.segments.map((segment) => segment.id === segmentId ? nextSegment : segment),
      updatedAt: new Date().toISOString(),
    };
    setWorkspace((current) => {
      const exists = current.emissions.some((emission) => emission.id === selectedEmission.id);
      return {
        ...current,
        emissions: exists
          ? current.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission)
          : [...current.emissions, nextEmission],
      };
    });
    scheduleSegmentSave({ emission: nextEmission, segment: nextSegment, sortOrder }, delay);
  }

  function acceptRemoteSegment(segmentId: string) {
    const conflict = segmentConflicts[segmentId];
    if (!conflict) return;
    replaceLocalSegment(segmentId, conflict.remoteSegment);
    const nextConflicts = { ...segmentConflictsRef.current };
    delete nextConflicts[segmentId];
    segmentConflictsRef.current = nextConflicts;
    setSegmentConflicts((current) => {
      const next = { ...current };
      delete next[segmentId];
      return next;
    });
    setSegmentSyncStates((current) => ({ ...current, [segmentId]: "saved" }));
  }

  function overwriteRemoteSegment(segmentId: string) {
    const conflict = segmentConflicts[segmentId];
    if (!conflict?.remoteSegment || !selectedEmission) return;
    const sortOrder = selectedEmission.segments.findIndex((segment) => segment.id === segmentId);
    if (sortOrder < 0) return;
    const localSegment = { ...conflict.localSegment, version: conflict.remoteSegment.version };
    replaceLocalSegment(segmentId, localSegment);
    const nextConflicts = { ...segmentConflictsRef.current };
    delete nextConflicts[segmentId];
    segmentConflictsRef.current = nextConflicts;
    setSegmentConflicts((current) => {
      const next = { ...current };
      delete next[segmentId];
      return next;
    });
    void saveSegmentPayload({ emission: selectedEmission, segment: localSegment, sortOrder });
  }

  async function openSegmentHistory(segment: Segment) {
    setSegmentHistory({ segmentId: segment.id, title: segment.title, loading: true, entries: [] });
    if (!repository.loadSegmentRevisions || isDemoId(selectedEmission?.id ?? "")) {
      setSegmentHistory({ segmentId: segment.id, title: segment.title, loading: false, entries: [] });
      return;
    }
    try {
      const entries = await repository.loadSegmentRevisions(segment.id);
      setSegmentHistory({ segmentId: segment.id, title: segment.title, loading: false, entries });
    } catch (error) {
      setSegmentHistory(null);
      notify(error instanceof Error ? error.message : "No se pudo abrir el historial del bloque.");
    }
  }

  function restoreSegmentRevision(revision: SegmentRevision) {
    const emission = workspace.emissions.find((item) => item.segments.some((segment) => segment.id === revision.segment.id));
    const currentSegment = emission?.segments.find((segment) => segment.id === revision.segment.id);
    if (!emission || !currentSegment) return;
    const restoredSegment = { ...revision.segment, id: currentSegment.id, version: currentSegment.version };
    const sortOrder = emission.segments.findIndex((segment) => segment.id === currentSegment.id);
    const nextEmission = { ...emission, segments: emission.segments.map((segment) => segment.id === currentSegment.id ? restoredSegment : segment), updatedAt: new Date().toISOString() };
    replaceLocalSegment(currentSegment.id, restoredSegment);
    setSegmentHistory(null);
    void saveSegmentPayload({ emission: nextEmission, segment: restoredSegment, sortOrder });
  }

  async function saveDraft() {
    if (selectedEmissionIsDemo && selectedEmission) {
      upsertDemoOverride(selectedEmission, true);
      setDirty(false);
      notify("Cambios demo guardados solo en este navegador; Supabase no fue modificado.");
      return;
    }
    await commit(workspace, repository.mode === "supabase" ? "Borrador guardado para el equipo." : "Borrador guardado en este navegador.");
  }

  function updatePostPauta(change: Partial<PostPauta>) {
    if (!selectedEmission) return;
    updateEmission({ postPauta: { ...(selectedEmission.postPauta ?? emptyPostPauta()), ...change } });
  }

  function updatePostSegment(segmentId: string, change: Partial<Segment>) {
    if (!selectedEmission) return;
    updateEmission({
      segments: selectedEmission.segments.map((segment) => segment.id === segmentId ? { ...segment, ...change } : segment),
    });
  }

  async function persistPostSegment(segmentId: string, change: Partial<Segment> = {}) {
    if (!selectedEmission) return;
    const hadUnsavedChanges = dirty;
    const sortOrder = selectedEmission.segments.findIndex((segment) => segment.id === segmentId);
    if (sortOrder < 0) return;
    const nextSegment = { ...selectedEmission.segments[sortOrder], ...change };
    updatePostSegment(segmentId, change);
    if (!repository.saveSegment || isDemoId(selectedEmission.id)) return;
    const result = await saveSegmentPayload({ emission: selectedEmission, segment: nextSegment, sortOrder });
    if (result?.status === "saved" && !hadUnsavedChanges) setDirty(false);
  }

  function liveTimeOr(fallback: string): string {
    return now?.date === selectedDate ? now.time : fallback;
  }

  function markSegmentStart(segment: Segment) {
    void persistPostSegment(segment.id, {
      actualStart: liveTimeOr(segment.startTime),
      actualEnd: undefined,
      disposition: undefined,
    });
  }

  function markSegmentEnd(segment: Segment, disposition: NonNullable<Segment["disposition"]> = "aired") {
    void persistPostSegment(segment.id, {
      actualStart: segment.actualStart || liveTimeOr(segment.startTime),
      actualEnd: liveTimeOr(segment.endTime),
      disposition,
    });
  }

  function markSegmentSkipped(segment: Segment) {
    void persistPostSegment(segment.id, { actualStart: undefined, actualEnd: undefined, disposition: "skipped" });
  }

  function markSegmentAsPlanned(segment: Segment) {
    void persistPostSegment(segment.id, { actualStart: segment.startTime, actualEnd: segment.endTime, disposition: "aired" });
  }

  function updatePostStory(segment: Segment, storyIndex: number, change: Partial<StoryItem>) {
    const stories = (segment.stories ?? []).map((story, index) => index === storyIndex ? { ...story, ...change } : story);
    updatePostSegment(segment.id, { stories });
  }

  function persistPostStory(segment: Segment, storyIndex: number, change: Partial<StoryItem>) {
    const stories = (segment.stories ?? []).map((story, index) => index === storyIndex ? { ...story, ...change } : story);
    void persistPostSegment(segment.id, { stories });
  }

  function markPostStory(segment: Segment, storyIndex: number, disposition: NonNullable<StoryItem["disposition"]>) {
    const stories = markStoryResult(segment.stories ?? [], storyIndex, disposition, liveTimeOr(""));
    void persistPostSegment(segment.id, { stories });
  }

  function handleMovePostStory(event: MouseEvent<HTMLButtonElement>) {
    const segment = selectedEmission?.segments.find((item) => item.id === event.currentTarget.dataset.segmentId);
    const storyIndex = Number(event.currentTarget.dataset.storyIndex);
    const direction = Number(event.currentTarget.dataset.direction) as -1 | 1;
    if (!segment || !Number.isInteger(storyIndex)) return;
    void persistPostSegment(segment.id, { stories: moveStoryInActualOrder(segment.stories ?? [], storyIndex, direction) });
  }

  function handleMarkPostStory(event: MouseEvent<HTMLButtonElement>) {
    const segment = selectedEmission?.segments.find((item) => item.id === event.currentTarget.dataset.segmentId);
    const storyIndex = Number(event.currentTarget.dataset.storyIndex);
    const disposition = event.currentTarget.dataset.disposition as NonNullable<StoryItem["disposition"]>;
    if (!segment || !Number.isInteger(storyIndex)) return;
    markPostStory(segment, storyIndex, disposition);
  }

  function handlePostStorySummaryChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const segment = selectedEmission?.segments.find((item) => item.id === event.currentTarget.dataset.segmentId);
    const storyIndex = Number(event.currentTarget.dataset.storyIndex);
    if (!segment || !Number.isInteger(storyIndex)) return;
    updatePostStory(segment, storyIndex, { postSummary: event.currentTarget.value });
  }

  function handlePostStorySummaryBlur(event: FocusEvent<HTMLTextAreaElement>) {
    const segment = selectedEmission?.segments.find((item) => item.id === event.currentTarget.dataset.segmentId);
    const storyIndex = Number(event.currentTarget.dataset.storyIndex);
    if (!segment || !Number.isInteger(storyIndex)) return;
    persistPostStory(segment, storyIndex, { postSummary: event.currentTarget.value });
  }

  function addLiveSegment() {
    if (!selectedEmission) return;
    const liveTime = liveTimeOr(selectedSlot?.startTime ?? "00:00");
    const nextSegment: Segment = {
      id: newId(),
      startTime: liveTime,
      endTime: liveTime,
      actualStart: liveTime,
      type: "other",
      title: "Bloque añadido durante la emisión",
      guest: "",
      notes: "",
      disposition: "added_live",
      postSummary: "",
      keyQuote: "",
      quoteVerified: false,
      version: 0,
    };
    const nextEmission = { ...selectedEmission, segments: [...selectedEmission.segments, nextSegment], updatedAt: new Date().toISOString() };
    if (selectedEmissionIsDemo) {
      updateEmission({ segments: nextEmission.segments });
      notify("Bloque imprevisto añadido a la demostración.");
      return;
    }
    setWorkspace((current) => ({
      ...current,
      emissions: current.emissions.some((emission) => emission.id === selectedEmission.id)
        ? current.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission)
        : [...current.emissions, nextEmission],
    }));
    scheduleSegmentSave({ emission: nextEmission, segment: nextSegment, sortOrder: nextEmission.segments.length - 1 }, 0);
    notify("Bloque imprevisto añadido al final del registro.");
  }

  async function savePostReview(reviewStatus: PostPauta["reviewStatus"]) {
    if (!selectedEmission) return;
    const nextEmission: Emission = {
      ...selectedEmission,
      status: reviewStatus === "capture" ? selectedEmission.status : "post",
      postPauta: {
        ...(selectedEmission.postPauta ?? emptyPostPauta()),
        reviewStatus,
        ...(reviewStatus === "verified" ? { verifiedAt: new Date().toISOString() } : { verifiedAt: undefined }),
      },
      updatedAt: new Date().toISOString(),
    };

    if (isDemoId(nextEmission.id)) {
      upsertDemoOverride(nextEmission, true);
      setDirty(false);
      notify(reviewStatus === "verified" ? "Post-pauta demo verificada en este navegador." : "Avance demo guardado en este navegador.");
      return;
    }

    const exists = workspace.emissions.some((emission) => emission.id === nextEmission.id);
    const nextWorkspace = {
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((emission) => emission.id === nextEmission.id ? nextEmission : emission)
        : [...workspace.emissions, nextEmission],
    };
    await commit(nextWorkspace, reviewStatus === "verified" ? "Post-pauta verificada y guardada en el histórico." : "Post-pauta enviada a revisión.");
  }

  async function moveEmissionStatus(slotId: string, status: Emission["status"]) {
    if (!canEdit || kanbanSavingId) return;
    const slot = managedDaySlots.find((item) => item.id === slotId);
    if (!slot) return;

    const currentEmission = effectiveEmissions.find(
      (emission) => emission.programId === slot.programId && emission.date === selectedDate,
    ) ?? emptyEmission(slot.programId, selectedDate);
    if (currentEmission.status === status) return;
    if ((status === "ready" || status === "post") && currentEmission.segments.length === 0) {
      notify("Agrega y revisa la pauta antes de marcarla como lista o post-pauta.");
      return;
    }

    const nextEmission = { ...currentEmission, status, updatedAt: new Date().toISOString() };
    if (isDemoId(currentEmission.id)) {
      upsertDemoOverride(nextEmission, true);
      notify(`${programs.find((program) => program.id === slot.programId)?.shortName ?? "Programa"}: cambio demo guardado solo en este navegador.`);
      return;
    }
    const exists = workspace.emissions.some((emission) => emission.id === currentEmission.id);
    const previousWorkspace = workspace;
    const nextWorkspace = {
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((emission) => emission.id === currentEmission.id ? nextEmission : emission)
        : [...workspace.emissions, nextEmission],
    };

    setWorkspace(nextWorkspace);
    setKanbanSavingId(slotId);
    try {
      await repository.saveEmissionStatus(nextEmission);
      notify(`${programs.find((program) => program.id === slot.programId)?.shortName ?? "Programa"}: ${statusLabel[status]}.`);
    } catch (error) {
      setWorkspace(previousWorkspace);
      notify(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
    } finally {
      setKanbanSavingId("");
    }
  }

  function handleKanbanDrop(event: DragEndEvent) {
    if (event.canceled) return;
    const sourceId = event.operation.source?.id;
    const targetId = event.operation.target?.id;
    if (!sourceId || !targetId || !kanbanStatuses.includes(targetId as Emission["status"])) return;
    void moveEmissionStatus(String(sourceId), targetId as Emission["status"]);
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
    const id = newId();
    const nextSegment: Segment = { id, startTime, endTime: startTime, type: "other", title: "Nuevo segmento", guest: "", notes: "", stories: [], version: 0 };
    const nextEmission = { ...selectedEmission, status: "draft" as const, segments: [...selectedEmission.segments, nextSegment], updatedAt: new Date().toISOString() };
    if (selectedEmissionIsDemo) updateEmission({ status: "draft", segments: nextEmission.segments });
    else {
      setWorkspace((current) => ({
        ...current,
        emissions: current.emissions.some((emission) => emission.id === selectedEmission.id)
          ? current.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission)
          : [...current.emissions, nextEmission],
      }));
      scheduleSegmentSave({ emission: nextEmission, segment: nextSegment, sortOrder: nextEmission.segments.length - 1 }, 0);
    }
    setExpandedSavedSegments((current) => new Set([...current, id]));
  }

  async function removeSegment(segment: Segment) {
    if (!selectedEmission || !canEdit || (segment.stories?.length ?? 0) > 0) return;
    if (!window.confirm(`¿Quitar el bloque “${segment.title}”?`)) return;
    const timer = segmentSaveTimersRef.current.get(segment.id);
    if (timer) window.clearTimeout(timer);
    segmentSaveTimersRef.current.delete(segment.id);
    pendingSegmentSavesRef.current.delete(segment.id);

    if (selectedEmissionIsDemo || !repository.deleteSegment) {
      updateEmission({ segments: selectedEmission.segments.filter((item) => item.id !== segment.id) });
      notify("Bloque quitado.");
      return;
    }

    setSegmentSyncStates((current) => ({ ...current, [segment.id]: "saving" }));
    try {
      const result = await repository.deleteSegment(selectedEmission, segment);
      if (result.status === "conflict") {
        if (result.remoteSegment?.version !== undefined) latestSegmentVersionsRef.current.set(segment.id, result.remoteSegment.version);
        setSegmentConflicts((current) => ({
          ...current,
          [segment.id]: { localSegment: segment, remoteSegment: result.remoteSegment, editorName: result.editorName },
        }));
        setSegmentSyncStates((current) => ({ ...current, [segment.id]: "conflict" }));
        return;
      }
      replaceLocalSegment(segment.id);
      latestSegmentVersionsRef.current.delete(segment.id);
      setSegmentSyncStates((current) => {
        const next = { ...current };
        delete next[segment.id];
        return next;
      });
      notify("Bloque quitado y orden actualizado.");
    } catch (error) {
      setSegmentSyncStates((current) => ({ ...current, [segment.id]: "error" }));
      notify(error instanceof Error ? error.message : "No se pudo quitar este bloque.");
    }
  }

  function updateSegmentGuest(segment: Segment, value: string) {
    const knownPerson = effectivePeople.find((person) => person.normalizedName === normalizePersonName(value));
    updateSegmentDraft(segment.id, { guest: value, guestRole: knownPerson?.primaryRole ?? "" });
  }

  async function orderWithAi() {
    if (!selectedEmission || !selectedProgram || !selectedSlot || !getAccessToken) {
      notify("La conversión requiere una sesión activa en la base compartida.");
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
        rawText: selectedEmission.rawText,
      }, getAccessToken);
      setAiResult(result);
      const detectedProducer = result.proposal.producers[0]?.trim();
      if (detectedProducer) updateEmission({ producerName: detectedProducer });
      setCaptureCollapsed(true);
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
    if (isDemoId(selectedEmission.id)) {
      upsertDemoOverride(nextEmission, true);
      setDirty(false);
      notify("Escaleta demo actualizada solo en este navegador; Supabase no fue modificado.");
      try {
        await repository.confirmImport(aiResult.importId);
      } catch {
        notify("La demo se actualizó, pero falta cerrar el registro de importación.");
      }
      setAiResult(null);
      setAiApplying(false);
      return;
    }
    let saved = false;
    if (repository.replaceProgramEmission) {
      setSaving(true);
      try {
        const savedWorkspace = await repository.replaceProgramEmission(nextEmission);
        setWorkspace(savedWorkspace);
        setDirty(false);
        notify("Escaleta ordenada y guardada.");
        saved = true;
      } catch (error) {
        notify(error instanceof Error ? error.message : "No se pudo reemplazar la escaleta.");
      } finally {
        setSaving(false);
      }
    } else {
      const exists = workspace.emissions.some((emission) => emission.id === selectedEmission.id);
      const nextWorkspace: WorkspaceState = {
        ...workspace,
        emissions: exists
          ? workspace.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission)
          : [...workspace.emissions, nextEmission],
      };
      saved = await commit(nextWorkspace, "Escaleta ordenada y guardada.");
    }
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
    setCaptureCollapsed(false);
    setExpandedSavedSegments(new Set());
  }

  function openArchiveResult(record: ArchiveSearchRecord) {
    const slot = scheduleSlots.find((item) => item.programId === record.programId && item.dayOfWeek === editorialDayForDate(record.date).dayOfWeek);
    if (!slot) {
      notify("Encontramos el registro, pero ese programa ya no tiene un horario activo para abrirlo.");
      return;
    }
    setProducerExperience(false);
    chooseCaptureDate(record.date);
    setSelectedSlotId(slot.id);
    setActiveView(record.disposition ? "post" : "program");
    setShowArchiveSearch(false);
    notify(record.disposition ? "Abrimos la post-pauta de la emisión encontrada." : "Abrimos la pauta de la emisión encontrada.");
  }

  function chooseCaptureDate(date: string) {
    setSelectedDate(date);
    setAiResult(null);
    setCaptureCollapsed(false);
    setExpandedSavedSegments(new Set());
    setProducerComposerMode(null);
  }

  function openProducerExperience() {
    const preferredDate = scheduleSlots.some((slot) => slot.programId === "encendidos" && slot.dayOfWeek === editorialDayForDate(selectedDate).dayOfWeek)
      ? selectedDate
      : "2026-08-28";
    const slot = scheduleSlots.find((item) => item.programId === "encendidos" && item.dayOfWeek === editorialDayForDate(preferredDate).dayOfWeek);
    if (!slot) return;
    chooseCaptureDate(preferredDate);
    setSelectedSlotId(slot.id);
    setProducerSection("today");
    setProducerExperience(true);
  }

  function producerSlotForDate(date: string) {
    if (!date) return undefined;
    const programId = producerProgramId ?? "encendidos";
    return scheduleSlots.find((slot) => slot.programId === programId && slot.dayOfWeek === editorialDayForDate(date).dayOfWeek);
  }

  function nearestProducerDate(fromDate: string, direction: -1 | 1) {
    for (let offset = 1; offset <= 14; offset += 1) {
      const candidate = shiftIsoDate(fromDate, offset * direction);
      if (producerSlotForDate(candidate)) return candidate;
    }
    return fromDate;
  }

  function chooseProducerDate(date: string) {
    if (!date) {
      notify("Elige una fecha para continuar.");
      return false;
    }
    const slot = producerSlotForDate(date);
    if (!slot) {
      notify("Este programa no tiene emisión configurada para esa fecha.");
      return false;
    }
    chooseCaptureDate(date);
    setSelectedSlotId(slot.id);
    return true;
  }

  function openProducerNewPauta() {
    setProducerNewPautaDate(nearestProducerDate(selectedDate, 1));
    setProducerNewPautaMode("paste");
    setShowProducerNewPauta(true);
  }

  function beginProducerPauta() {
    if (!chooseProducerDate(producerNewPautaDate)) return;
    const existing = effectiveEmissions.find((emission) => emission.programId === (producerProgramId ?? "encendidos") && emission.date === producerNewPautaDate);
    setProducerComposerMode(producerNewPautaMode);
    setShowProducerNewPauta(false);
    notify(existing && (existing.rawText.trim() || existing.segments.length)
      ? "Abrimos la pauta existente de esa fecha. Nada fue reemplazado."
      : "Nueva pauta preparada. Empieza con el texto o con el primer bloque.");
  }

  function chooseProducerComposer(mode: ProducerComposerMode) {
    setProducerComposerMode(mode);
  }

  function insertProducerTemplate() {
    if (!selectedEmission || selectedEmission.rawText.trim()) return;
    const programName = programs.find((program) => program.id === selectedEmission.programId)?.shortName.toLocaleUpperCase("es") ?? "PROGRAMA";
    updateEmission({
      rawText: `PREPAUTA ${programName}\n${longSpanishDate(selectedEmission.date).toLocaleUpperCase("es")}\n\n${selectedSlot?.startTime ?? "00:00"} - ${selectedSlot?.startTime ?? "00:00"}\nTEMA: \nINVITADO / INVITADA: NOMBRE COMPLETO - CARGO O ESPECIALIDAD\nENFOQUE: `,
      status: "draft",
    });
  }

  function markProducerNoticesSeen() {
    window.localStorage.setItem(PRODUCER_NOTICES_STORAGE_KEY, producerNoticesSignature);
    setProducerNoticesUpdated(false);
  }

  function setProducerName(value: string) {
    updateEmission({ producerName: value });
  }

  function toggleSavedSegment(id: string) {
    setExpandedSavedSegments((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSavedSegments() {
    if (!selectedEmission) return;
    setExpandedSavedSegments((current) => current.size === selectedEmission.segments.length
      ? new Set()
      : new Set(selectedEmission.segments.map((segment) => segment.id)));
  }

  function setSavedDuration(segmentId: string, duration: number) {
    const segment = selectedEmission?.segments.find((item) => item.id === segmentId);
    if (!segment) return;
    updateSegmentDraft(segmentId, { endTime: endTimeForDuration(segment.startTime, duration) }, 0);
  }

  function updateSavedStory(segmentId: string, storyIndex: number, change: Partial<StoryItem>) {
    const segment = selectedEmission?.segments.find((item) => item.id === segmentId);
    if (!segment) return;
    updateSegmentDraft(segmentId, { stories: (segment.stories ?? []).map((story, index) => index === storyIndex ? { ...story, ...change } : story) });
  }

  function withSavedStoryCount(segment: Segment, stories: StoryItem[]) {
    const title = /^Noticias por ubicar \(\d+\)$/i.test(segment.title)
      ? `Noticias por ubicar (${stories.length})`
      : segment.title;
    return { ...segment, title, stories };
  }

  function moveSavedStory(sourceSegmentId: string, storyIndex: number, targetSegmentId: string) {
    if (!selectedEmission || sourceSegmentId === targetSegmentId) return;
    const source = selectedEmission.segments.find((segment) => segment.id === sourceSegmentId);
    const story = source?.stories?.[storyIndex];
    if (!source || !story) return;
    const nextSegments = selectedEmission.segments.map((segment) => {
      if (segment.id === sourceSegmentId) return withSavedStoryCount(segment, (segment.stories ?? []).filter((_, index) => index !== storyIndex));
      if (segment.id === targetSegmentId) return { ...segment, stories: [...(segment.stories ?? []), story] };
      return segment;
    });
    const nextEmission = { ...selectedEmission, segments: nextSegments, updatedAt: new Date().toISOString() };
    if (selectedEmissionIsDemo) updateEmission({ segments: nextSegments });
    else {
      setWorkspace((current) => ({ ...current, emissions: current.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission) }));
      [sourceSegmentId, targetSegmentId].forEach((segmentId) => {
        const sortOrder = nextSegments.findIndex((segment) => segment.id === segmentId);
        if (sortOrder >= 0) scheduleSegmentSave({ emission: nextEmission, segment: nextSegments[sortOrder], sortOrder }, 0);
      });
    }
  }

  async function handleSavedRundownDrop(event: DragEndEvent) {
    if (event.canceled || !selectedEmission) return;
    const sourceId = String(event.operation.source?.id ?? "").replace("saved-block-", "");
    const targetId = String(event.operation.target?.id ?? "").replace("saved-block-", "");
    const sourceIndex = selectedEmission.segments.findIndex((segment) => segment.id === sourceId);
    const targetIndex = selectedEmission.segments.findIndex((segment) => segment.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const nextSegments = reorderItems(selectedEmission.segments, sourceIndex, targetIndex);
    const nextEmission = { ...selectedEmission, segments: nextSegments, updatedAt: new Date().toISOString() };
    if (selectedEmissionIsDemo) updateEmission({ segments: nextSegments });
    else {
      setWorkspace((current) => ({ ...current, emissions: current.emissions.map((emission) => emission.id === selectedEmission.id ? nextEmission : emission) }));
      if (repository.saveSegmentOrder) {
        setSegmentSyncStates((current) => Object.fromEntries(Object.entries(current).concat(nextSegments.map((segment) => [segment.id, "saving" as const]))));
        try {
          const savedSegments = await repository.saveSegmentOrder(nextEmission, nextSegments);
          savedSegments.forEach((segment) => latestSegmentVersionsRef.current.set(segment.id, segment.version ?? 0));
          setWorkspace((current) => ({
            ...current,
            emissions: current.emissions.map((emission) => emission.id === selectedEmission.id ? { ...nextEmission, segments: savedSegments } : emission),
          }));
          setSegmentSyncStates((current) => Object.fromEntries(Object.entries(current).concat(savedSegments.map((segment) => [segment.id, "saved" as const]))));
        } catch (error) {
          setWorkspace((current) => ({ ...current, emissions: current.emissions.map((emission) => emission.id === selectedEmission.id ? selectedEmission : emission) }));
          nextSegments.forEach((segment) => setSegmentSyncStates((current) => ({ ...current, [segment.id]: "error" })));
          notify(error instanceof Error ? error.message : "No se pudo guardar el nuevo orden.");
          return;
        }
      }
    }
    notify("Bloque reordenado. Los horarios se conservaron.");
  }

  function renderSavedRundown() {
    if (!selectedEmission) return <div className="empty-state compact"><strong>Elige un programa</strong><p>Selecciona el bloque que quieres revisar.</p></div>;
    if (!selectedEmission.segments.length) return <div className="empty-state compact producer-rundown-empty"><strong>La escaleta todavía está vacía</strong><p>Puedes pegar o escribir una prepauta, o comenzar directamente con un bloque editable.</p><button disabled={!canEdit} onClick={addSegment}>Añadir primer bloque</button></div>;

    const totalMinutes = selectedEmission.segments.reduce((total, segment) => total + (durationMinutes(segment.startTime, segment.endTime) ?? 0), 0);

    return (
      <>
        <div className="rundown-list-toolbar">
          <p><strong>{formatDuration(totalMinutes)} estructurados</strong><span>Reordena sin alterar los horarios; ajusta cada duración al abrir el bloque.</span></p>
          <button className="quiet-button" onClick={toggleAllSavedSegments}>{expandedSavedSegments.size === selectedEmission.segments.length ? "Contraer todos" : "Expandir todos"}</button>
        </div>
        <DragDropProvider onDragEnd={handleSavedRundownDrop}>
          <div className="saved-rundown-list">
            {selectedEmission.segments.map((segment, index) => {
              const exactGuest = effectivePeople.find((person) => person.normalizedName === normalizePersonName(segment.guest));
              const guestMatches = exactGuest ? [] : findSimilarPeople(segment.guest, effectivePeople, 2);
              const syncState = segmentSyncStates[segment.id] ?? "saved";
              const conflict = segmentConflicts[segment.id];
              return (
              <RundownBlock
                id={`saved-block-${segment.id}`}
                key={segment.id}
                index={index}
                startTime={segment.startTime}
                endTime={segment.endTime}
                type={segment.type}
                title={segment.title}
                guest={segment.guest}
                expanded={expandedSavedSegments.has(segment.id)}
                canDrag={canEdit}
                onToggle={() => toggleSavedSegment(segment.id)}
              >
                <div className="ordered-fields">
                  <div className="segment-sync-row wide" role="status" data-sync={syncState}><strong>{syncState === "pending" ? "Cambios pendientes" : syncState === "saving" ? "Guardando bloque" : syncState === "error" ? "No se pudo guardar" : syncState === "conflict" ? "Hay una edición más reciente" : "Bloque guardado"}</strong><span>{syncState === "saved" && segment.lastEditedAt ? `Actualizado ${new Date(segment.lastEditedAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}` : "El guardado es automático"}</span><button type="button" onClick={() => void openSegmentHistory(segment)}>Historial</button></div>
                  {conflict && <div className="segment-conflict wide" role="alert"><strong>{conflict.editorName} guardó este bloque antes que tú.</strong><p>Tus cambios siguen en pantalla. Elige qué versión conservar.</p><div><button onClick={() => acceptRemoteSegment(segment.id)}>Usar versión compartida</button><button className="primary" disabled={!conflict.remoteSegment} onClick={() => overwriteRemoteSegment(segment.id)}>Conservar mis cambios</button></div></div>}
                  <label><span>Inicio</span><input type="time" step="60" disabled={!canEdit} value={segment.startTime} onChange={(event) => updateSegmentDraft(segment.id, { startTime: event.target.value })} /></label>
                  <label><span>Fin</span><input type="time" step="60" disabled={!canEdit} value={segment.endTime} onChange={(event) => updateSegmentDraft(segment.id, { endTime: event.target.value })} /></label>
                  <label><span>Tipo</span><select disabled={!canEdit} value={segment.type} onChange={(event) => updateSegmentDraft(segment.id, { type: event.target.value as Segment["type"] }, 0)}>{Object.entries(segmentTypeLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <div className="duration-tools wide"><span>Duración rápida</span><div>{[15, 30, 45, 60].map((value) => <button disabled={!canEdit} key={value} className={durationMinutes(segment.startTime, segment.endTime) === value ? "active" : ""} onClick={() => setSavedDuration(segment.id, value)}>{value} min</button>)}<small>O escribe cualquier hora al minuto.</small></div></div>
                  <label className="wide"><span>Título</span><input disabled={!canEdit} value={segment.title} onChange={(event) => updateSegmentDraft(segment.id, { title: event.target.value })} /></label>
                  <div className="guest-name-field">
                    <label><span>Invitado o invitada</span><input list="known-guests" disabled={!canEdit} value={segment.guest} onChange={(event) => updateSegmentGuest(segment, event.target.value)} placeholder="Nombre y apellido" /></label>
                    {segment.guest.trim().length >= 4 && (
                      exactGuest
                        ? <small className="guest-match exact">Coincide con {exactGuest.displayName} en la base.</small>
                        : guestMatches.length
                          ? <div className="guest-match suggestions"><span>¿Quisiste decir?</span>{guestMatches.map(({ person }) => <button key={person.id} onClick={() => updateSegmentGuest(segment, person.displayName)}>{person.displayName}</button>)}</div>
                          : <small className="guest-match new-person">No encontramos este nombre. Revisa la escritura; si es correcto se añadirá como persona nueva.</small>
                    )}
                  </div>
                  <label><span>Cargo</span><input disabled={!canEdit} value={segment.guestRole ?? ""} onChange={(event) => updateSegmentDraft(segment.id, { guestRole: event.target.value })} /></label>
                  <label className="wide"><span>Tema</span><textarea disabled={!canEdit} rows={2} value={segment.topic ?? ""} onChange={(event) => updateSegmentDraft(segment.id, { topic: event.target.value })} /></label>
                  <label className="wide"><span>Enfoque y notas</span><textarea disabled={!canEdit} rows={3} value={segment.focus || segment.notes} onChange={(event) => updateSegmentDraft(segment.id, { focus: event.target.value })} /></label>
                  {(segment.stories?.length ?? 0) > 0 && (
                    <section className="story-pool saved-story-pool wide">
                      <header><div><strong>{segment.stories?.length} noticias en este bloque</strong><span>Abre una noticia para editarla o moverla.</span></div></header>
                      <div className="story-pool-list">
                        {segment.stories?.map((story, storyIndex) => (
                          <details className="story-item" key={`${story.reference}-${storyIndex}`}>
                            <summary><span>{story.reference || String(storyIndex + 1)}</span><strong>{story.title}</strong>{story.format && <b>{story.format}</b>}</summary>
                            <div>
                              <label><span>Titular</span><textarea disabled={!canEdit} rows={2} value={story.title} onChange={(event) => updateSavedStory(segment.id, storyIndex, { title: event.target.value })} /></label>
                              <label><span>Formato</span><input disabled={!canEdit} value={story.format} onChange={(event) => updateSavedStory(segment.id, storyIndex, { format: event.target.value })} /></label>
                              <label><span>Audio o referencia</span><input disabled={!canEdit} value={story.mediaCue} onChange={(event) => updateSavedStory(segment.id, storyIndex, { mediaCue: event.target.value })} /></label>
                              <label><span>Mover a bloque</span><select disabled={!canEdit} value={segment.id} onChange={(event) => moveSavedStory(segment.id, storyIndex, event.target.value)}>{selectedEmission.segments.map((target) => <option value={target.id} key={target.id}>{target.title}</option>)}</select></label>
                              <label className="story-wide"><span>Desarrollo</span><textarea disabled={!canEdit} rows={4} value={story.summary} onChange={(event) => updateSavedStory(segment.id, storyIndex, { summary: event.target.value })} /></label>
                              <label className="story-wide"><span>Notas</span><textarea disabled={!canEdit} rows={2} value={story.notes} onChange={(event) => updateSavedStory(segment.id, storyIndex, { notes: event.target.value })} /></label>
                            </div>
                          </details>
                        ))}
                      </div>
                    </section>
                  )}
                  <button className="remove ordered-remove" disabled={!canEdit || (segment.stories?.length ?? 0) > 0} title={(segment.stories?.length ?? 0) > 0 ? "Mueve las noticias antes de quitar este bloque" : undefined} onClick={() => void removeSegment(segment)}>Quitar bloque</button>
                </div>
              </RundownBlock>
              );
            })}
            <button className="add-ordered-block" disabled={!canEdit} onClick={addSegment}>+ Añadir bloque</button>
          </div>
        </DragDropProvider>
      </>
    );
  }

  function renderProgramRoutes() {
    return (
      <aside className="route-rail">
        <header><span>{selectedDay.label}</span><strong>Programas administrados</strong></header>
        <div>
          {managedDaySlots.map((slot) => {
            const program = programs.find((item) => item.id === slot.programId);
            const emission = effectiveEmissions.find((item) => item.programId === program?.id && item.date === selectedDate);
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
          <div className={`mode-day-tabs ${reception ? "reception-day-tabs" : ""}`}>
            {days.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => chooseCaptureDate(day.date)}>{day.label}</button>)}
            {reception && (
              <label className={`mode-calendar-picker ${selectedDateIsInVisibleWeek ? "" : "active"}`}>
                <span>Calendario</span>
                <input
                  aria-label="Elegir cualquier fecha"
                  type="date"
                  value={selectedDate}
                  onInput={(event) => {
                    if (!event.currentTarget.value) return;
                    chooseCaptureDate(event.currentTarget.value);
                  }}
                />
              </label>
            )}
          </div>
        </header>

        <div className={`${reception ? "reception-grid" : "program-grid"} ${captureCollapsed ? "source-collapsed" : ""}`}>
          {renderProgramRoutes()}

          <section className={`capture-pane ${captureCollapsed ? "collapsed" : ""}`}>
            {captureCollapsed ? (
              <div className="capture-collapsed-card">
                <span>Texto original conservado</span>
                <strong>{selectedProgram?.shortName ?? "Pauta recibida"}</strong>
                <p>{selectedEmission?.producerName || "Productor por confirmar"}</p>
                <button className="quiet-button" onClick={() => setCaptureCollapsed(false)}>Ver original</button>
              </div>
            ) : (
              <>
                <header>
                  <div><span>{reception ? "1. Destino" : "Pauta original"}</span><h2>{selectedProgram?.shortName ?? "Selecciona un programa"}</h2></div>
                  {selectedSlot && <time>{selectedSlot.startTime} a {selectedSlot.endTime}</time>}
                </header>

              <div className="capture-meta">
                <label><span>Productor</span><input list="known-producers" disabled={!canEdit} value={selectedEmission?.producerName ?? ""} onChange={(event) => setProducerName(event.target.value)} placeholder="Nombre del productor" /></label>
              </div>

                <label className="field capture-text">
                  <span>{reception ? "2. Mensaje recibido" : "Pega aquí la pauta de WhatsApp, email o documento"}</span>
                  <textarea disabled={!canEdit || !selectedEmission} rows={reception ? 20 : 16} value={selectedEmission?.rawText ?? ""} onChange={(event) => updateEmission({ rawText: event.target.value, status: "draft" })} placeholder="Pega el texto completo. No necesitas ordenarlo antes." />
                </label>

                <div className="capture-actions">
                  <p>El original queda guardado para comparar y auditar.</p>
                  <button className="primary" disabled={!canEdit || !getAccessToken || aiProcessing || !selectedEmission || selectedEmission.rawText.trim().length < 20} onClick={orderWithAi}>{aiProcessing ? "Ordenando pauta..." : reception ? "Formatear y ubicar" : "Ordenar pauta"}</button>
                </div>
              </>
            )}
          </section>

          <section className="ordered-pane">
            {aiResult ? (
              <PautaAiReview proposal={aiResult.proposal} model={aiResult.model} processingMode={aiResult.processingMode} applying={aiApplying} people={effectivePeople} producerName={selectedEmission?.producerName ?? ""} onProducerNameChange={setProducerName} onChange={(proposal) => setAiResult({ ...aiResult, proposal })} onClose={() => { setAiResult(null); setCaptureCollapsed(false); }} onApply={applyAiProposal} />
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

  function renderPostPauta() {
    const postPauta = selectedEmission?.postPauta ?? emptyPostPauta();
    const registeredSegments = selectedEmission?.segments.filter((segment) => segment.disposition || segment.actualStart || segment.actualEnd || segment.stories?.some((story) => story.disposition)).length ?? 0;
    const completedSegments = selectedEmission?.segments.filter((segment) => segment.disposition === "skipped" || ((segment.stories?.length ?? 0) > 0 ? segment.stories?.every(storyResultComplete) : Boolean(segment.postSummary?.trim()))).length ?? 0;
    const totalSegments = selectedEmission?.segments.length ?? 0;
    const allStories = selectedEmission?.segments.flatMap((segment) => segment.stories ?? []) ?? [];
    const completedStories = allStories.filter(storyResultComplete).length;
    const isSelectedProgramLive = Boolean(
      selectedSlot
      && now?.date === selectedDate
      && now.minutes >= minutes(selectedSlot.startTime)
      && now.minutes < (selectedSlot.endTime === "00:00" ? 1440 : minutes(selectedSlot.endTime)),
    );
    const canVerify = totalSegments > 0 && completedSegments === totalSegments;

    return (
      <section className="mode-page post-page">
        <header className="mode-heading">
          <div><span>Registro as-run e histórico</span><h1>Post-pauta</h1><p>Marca lo que salió con pocos toques; completa el contenido y verifica las citas al terminar.</p></div>
          <div className="mode-day-tabs reception-day-tabs">
            {days.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => chooseCaptureDate(day.date)}>{day.label}</button>)}
            <label className={`mode-calendar-picker ${selectedDateIsInVisibleWeek ? "" : "active"}`}>
              <span>Calendario</span>
              <input aria-label="Elegir fecha de post-pauta" type="date" value={selectedDate} onInput={(event) => event.currentTarget.value && chooseCaptureDate(event.currentTarget.value)} />
            </label>
          </div>
        </header>

        <div className="post-workspace">
          {renderProgramRoutes()}
          <section className="post-main">
            <header className="post-program-header">
              <div>
                <span>{selectedDay.label}{selectedEmissionIsDemo ? " · DATOS DE PRUEBA" : ""}</span>
                <h2>{selectedProgram?.shortName ?? "Selecciona un programa"}</h2>
                {selectedSlot && <p>Planificado de {selectedSlot.startTime} a {selectedSlot.endTime}</p>}
              </div>
              <div className="post-program-state">
                {isSelectedProgramLive && <b className="live-pill">Al aire · {now?.time}</b>}
                <strong data-review={postPauta.reviewStatus}>{postReviewLabel[postPauta.reviewStatus]}</strong>
              </div>
            </header>

            {selectedEmission && selectedProgram?.managed ? (
              <>
                <section className="post-overview" aria-label="Progreso de la post-pauta">
                  <div><strong>{registeredSegments}/{totalSegments}</strong><span>bloques registrados</span></div>
                  <div><strong>{allStories.length ? `${completedStories}/${allStories.length}` : `${completedSegments}/${totalSegments}`}</strong><span>{allStories.length ? "noticias cerradas" : "con resultado escrito"}</span></div>
                  <div><strong>{selectedEmission.segments.filter((segment) => segment.quoteVerified).length}</strong><span>citas verificadas</span></div>
                  <button disabled={!canEdit} onClick={addLiveSegment}>+ Bloque imprevisto</button>
                </section>

                <section className="post-source-card">
                  <header><div><span>Fuente para transcripción</span><strong>Audio o video de la emisión</strong></div><b data-transcript={postPauta.transcriptStatus}>{postPauta.transcriptStatus === "none" ? "No solicitada" : postPauta.transcriptStatus === "pending" ? "Pendiente" : postPauta.transcriptStatus === "processing" ? "Procesando" : postPauta.transcriptStatus === "ready" ? "Lista" : "Con error"}</b></header>
                  <div>
                    <label><span>Origen</span><select disabled={!canEdit} value={postPauta.sourceType} onChange={(event) => updatePostPauta({ sourceType: event.target.value as PostPauta["sourceType"], sourceUrl: event.target.value === "none" ? "" : postPauta.sourceUrl })}><option value="none">Sin fuente todavía</option><option value="youtube">YouTube de RPP</option><option value="internal">Grabación interna</option><option value="audio">Archivo de audio</option></select></label>
                    <label className="post-source-url"><span>Enlace o identificador</span><input disabled={!canEdit || postPauta.sourceType === "none"} value={postPauta.sourceUrl} onChange={(event) => updatePostPauta({ sourceUrl: event.target.value })} placeholder={postPauta.sourceType === "youtube" ? "https://youtube.com/watch?v=..." : "URL o código del archivo"} /></label>
                  </div>
                  <p>{postPauta.sourceType === "youtube" ? "La descarga de subtítulos requerirá autorización del canal de RPP. Guardar el enlace no inicia aún una transcripción." : "La fuente queda vinculada a esta emisión para la siguiente fase de transcripción y búsqueda."}</p>
                </section>

                <section className="post-segment-list" aria-label="Registro real de bloques">
                  {selectedEmission.segments.map((segment, index) => {
                    const isRunning = Boolean(segment.actualStart && !segment.actualEnd && !segment.disposition);
                    const disposition = segment.disposition;
                    const stateLabel = isRunning ? "Al aire" : disposition ? dispositionLabel[disposition] : "Pendiente";
                    const syncState = segmentSyncStates[segment.id] ?? "saved";
                    const conflict = segmentConflicts[segment.id];
                    return (
                      <article className={`post-segment ${isRunning ? "running" : ""}`} data-disposition={disposition ?? "pending"} key={segment.id}>
                        <header>
                          <span className="post-segment-number">{String(index + 1).padStart(2, "0")}</span>
                          <div><span>{segment.startTime}–{segment.endTime} · {segmentTypeLabel[segment.type]}</span><h3>{segment.title}</h3>{segment.guest && <p>{segment.guest}{segment.guestRole ? ` · ${segment.guestRole}` : ""}</p>}</div>
                          <b>{stateLabel}</b>
                        </header>
                        <div className="post-sync-line" role="status" data-sync={syncState}><strong>{syncState === "pending" ? "Pendiente de guardar" : syncState === "saving" ? "Guardando" : syncState === "error" ? "Error de guardado" : syncState === "conflict" ? "Conflicto de edición" : "Guardado"}</strong><span>Este bloque se guarda por separado.</span><button type="button" onClick={() => void openSegmentHistory(segment)}>Historial</button></div>
                        {conflict && <div className="segment-conflict post-conflict" role="alert"><strong>{conflict.editorName} actualizó este bloque.</strong><p>El registro que tienes abierto no fue reemplazado.</p><div><button onClick={() => acceptRemoteSegment(segment.id)}>Usar versión compartida</button><button className="primary" disabled={!conflict.remoteSegment} onClick={() => overwriteRemoteSegment(segment.id)}>Conservar mis cambios</button></div></div>}
                        <div className="post-live-actions" aria-label={`Acciones rápidas para ${segment.title}`}>
                          <button disabled={!canEdit} onClick={() => markSegmentStart(segment)}>Entró ahora</button>
                          <button disabled={!canEdit || !segment.actualStart} onClick={() => markSegmentEnd(segment)}>Terminó ahora</button>
                          <button disabled={!canEdit} onClick={() => markSegmentEnd(segment, "partial")}>Salió parcial</button>
                          <button disabled={!canEdit} onClick={() => markSegmentSkipped(segment)}>No salió</button>
                          <button disabled={!canEdit} onClick={() => markSegmentAsPlanned(segment)}>Emitido según pauta</button>
                        </div>
                        <details className="post-segment-details" open={Boolean(segment.postSummary || segment.keyQuote)}>
                          <summary>{segment.postSummary?.trim() ? "Editar resultado del bloque" : "Completar qué se dijo"}<span>{segment.actualStart || "--:--"} a {segment.actualEnd || "--:--"}</span></summary>
                          <div>
                            {(segment.stories?.length ?? 0) > 0 && (
                              <section className="post-story-run">
                                <header><div><strong>{segment.stories?.length} noticias en este bloque</strong><span>Marca el resultado y corrige el orden mientras salen al aire.</span></div><b>{segment.stories?.filter((story) => story.disposition).length}/{segment.stories?.length}</b></header>
                                <ol>{segment.stories?.map((story, storyIndex) => <li key={`${story.reference}-${story.title}`} data-disposition={story.disposition ?? "pending"}>
                                  <div className="post-story-heading"><span>{story.reference || storyIndex + 1}</span><div><strong>{story.title}</strong><small>{story.format || "Noticia"}{story.actualStart ? ` desde ${story.actualStart}` : ""}</small></div><b>{story.disposition ? dispositionLabel[story.disposition] : "Pendiente"}</b></div>
                                  <div className="post-story-actions"><button disabled={!canEdit || storyIndex === 0} data-segment-id={segment.id} data-story-index={storyIndex} data-direction={-1} onClick={handleMovePostStory}>Subir</button><button disabled={!canEdit || storyIndex === (segment.stories?.length ?? 0) - 1} data-segment-id={segment.id} data-story-index={storyIndex} data-direction={1} onClick={handleMovePostStory}>Bajar</button><button disabled={!canEdit} data-segment-id={segment.id} data-story-index={storyIndex} data-disposition="aired" onClick={handleMarkPostStory}>Emitida</button><button disabled={!canEdit} data-segment-id={segment.id} data-story-index={storyIndex} data-disposition="partial" onClick={handleMarkPostStory}>Parcial</button><button disabled={!canEdit} data-segment-id={segment.id} data-story-index={storyIndex} data-disposition="skipped" onClick={handleMarkPostStory}>No salió</button></div>
                                  <label><span>Qué se dijo o qué ocurrió</span><textarea disabled={!canEdit || story.disposition === "skipped"} rows={2} value={story.postSummary ?? ""} data-segment-id={segment.id} data-story-index={storyIndex} onChange={handlePostStorySummaryChange} onBlur={handlePostStorySummaryBlur} placeholder="Resumen breve para el histórico" /></label>
                                </li>)}</ol>
                              </section>
                            )}
                            <div className="post-actual-times">
                              <label><span>Inicio real</span><input type="time" disabled={!canEdit || disposition === "skipped"} value={segment.actualStart ?? ""} onChange={(event) => updatePostSegment(segment.id, { actualStart: event.target.value || undefined })} onBlur={() => void persistPostSegment(segment.id)} /></label>
                              <label><span>Fin real</span><input type="time" disabled={!canEdit || disposition === "skipped"} value={segment.actualEnd ?? ""} onChange={(event) => updatePostSegment(segment.id, { actualEnd: event.target.value || undefined })} onBlur={() => void persistPostSegment(segment.id)} /></label>
                              <label><span>Resultado</span><select disabled={!canEdit} value={disposition ?? ""} onChange={(event) => void persistPostSegment(segment.id, { disposition: (event.target.value || undefined) as Segment["disposition"] })}><option value="">Pendiente</option><option value="aired">Emitido</option><option value="partial">Parcial</option><option value="skipped">No salió</option><option value="added_live">Añadido en vivo</option></select></label>
                            </div>
                            <label className="post-wide-field"><span>Qué se dijo / qué ocurrió</span><textarea disabled={!canEdit} rows={3} value={segment.postSummary ?? ""} onChange={(event) => updatePostSegment(segment.id, { postSummary: event.target.value })} onBlur={() => void persistPostSegment(segment.id)} placeholder={disposition === "skipped" ? "Motivo por el que no salió, si corresponde" : "Resumen breve, factual y útil para encontrar este bloque después"} /></label>
                            <label className="post-wide-field"><span>Cita o idea destacada</span><textarea disabled={!canEdit} rows={2} value={segment.keyQuote ?? ""} onChange={(event) => updatePostSegment(segment.id, { keyQuote: event.target.value, quoteVerified: false })} onBlur={() => void persistPostSegment(segment.id)} placeholder="No uses comillas hasta comprobar el texto con el audio" /></label>
                            <label className="quote-check"><input type="checkbox" disabled={!canEdit || !segment.keyQuote?.trim()} checked={segment.quoteVerified ?? false} onChange={(event) => void persistPostSegment(segment.id, { quoteVerified: event.target.checked })} /><span>Es una cita textual y la verifiqué con el audio</span></label>
                          </div>
                        </details>
                      </article>
                    );
                  })}
                  {!selectedEmission.segments.length && <div className="empty-state compact"><strong>No hay bloques que registrar</strong><p>Primero crea u ordena la pauta del programa. También puedes añadir un bloque imprevisto.</p></div>}
                </section>

                <section className="post-general-notes">
                  <label><span>Observaciones generales de la emisión</span><textarea disabled={!canEdit} rows={3} value={postPauta.notes} onChange={(event) => updatePostPauta({ notes: event.target.value })} placeholder="Cambios de conducción, incidencias técnicas o contexto que afectó al programa" /></label>
                </section>

                <footer className="post-footer">
                  <p>{canVerify ? "Todos los bloques tienen resultado. La post-pauta puede verificarse." : `Faltan ${Math.max(0, totalSegments - completedSegments)} bloques por resumir o marcar como no emitidos.`}</p>
                  <div>
                    <button disabled={!canEdit || saving || !dirty} onClick={saveDraft}>{saving ? "Guardando..." : "Guardar avance"}</button>
                    <button disabled={!canEdit || saving || totalSegments === 0} onClick={() => void savePostReview("review")}>Enviar a revisión</button>
                    <button className="primary" disabled={!canEdit || saving || !canVerify} onClick={() => void savePostReview("verified")}>Verificar y cerrar</button>
                  </div>
                </footer>
              </>
            ) : (
              <div className="empty-state"><strong>Elige un programa administrado</strong><p>La post-pauta sólo se registra en los programas manejados desde la herramienta.</p></div>
            )}
          </section>
        </div>
      </section>
    );
  }

  function renderProducerPortal() {
    const producerProgram = programs.find((program) => program.id === (producerProgramId ?? "encendidos"));
    const producerDays = days.filter((day) => scheduleSlots.some((slot) => slot.programId === producerProgram?.id && slot.dayOfWeek === day.dayOfWeek));
    const guestSegments = selectedEmission?.segments.filter((segment) => segment.guest.trim()) ?? [];
    const producerPautaIsBlank = !selectedEmission?.segments.length && !selectedEmission?.rawText.trim();
    const rawTextHasGuestLabel = /(?:^|\n)\s*INVITAD[OA]\s*:/imu.test(selectedEmission?.rawText ?? "");
    const normalizedPeopleQuery = normalizePersonName(producerPeopleQuery);
    const matchingPeople = effectivePeople.filter((person) => {
      if (!normalizedPeopleQuery) return true;
      return normalizePersonName([
        person.displayName,
        person.primaryRole,
        person.organization,
        ...person.appearances.flatMap((appearance) => [appearance.topic, appearance.focus, appearance.summary]),
      ].join(" ")).includes(normalizedPeopleQuery);
    });

    return (
      <main className="producer-portal">
        <header className="producer-topbar">
          <div className="producer-leading">
            {!producerProgramId && <button className="producer-dashboard-back" onClick={() => setProducerExperience(false)}><span aria-hidden="true">←</span> Dashboard general</button>}
            <div className="producer-brand"><Image src="/rpp-logo.svg" alt="RPP" width={42} height={42} priority /><span><strong>{producerProgram?.shortName ?? "Mi programa"}</strong><small>Espacio de producción</small></span></div>
          </div>
          <nav aria-label="Secciones de producción">
            <button className={producerSection === "today" ? "active" : ""} onClick={() => setProducerSection("today")}>Pauta de hoy</button>
            <button className={producerSection === "people" ? "active" : ""} onClick={() => setProducerSection("people")}>Invitados</button>
            <button className={producerSection === "post" ? "active" : ""} onClick={() => setProducerSection("post")}>Post-pauta</button>
          </nav>
          <div className="producer-account">
            {producerProgramId && onSignOut && <button onClick={onSignOut}>Cerrar sesión</button>}
            <b>{accountLabel}</b>
          </div>
        </header>

        <section className={`producer-shared-board ${producerNoticesUpdated ? "has-updates" : ""}`} aria-label="Información compartida para todos los programas">
          <header>
            <div><span>Coordinación compartida</span><strong>{producerNoticesUpdated ? "Hay novedades para revisar" : "Información de la semana"}</strong></div>
            {producerNoticesUpdated && <button onClick={markProducerNoticesSeen}>Marcar como visto</button>}
          </header>
          <div className="producer-alert-grid">
            <div className="producer-bulletins">
              <div className="producer-alert-title"><span>Indicaciones de la semana</span>{producerNoticesUpdated && <b>Nuevo</b>}</div>
              <div>{workspace.bulletins.map((bulletin) => <article key={bulletin.id}><strong>{bulletin.title}</strong><p>{bulletin.body}</p></article>)}</div>
            </div>
            <div className="producer-dates">
              <div className="producer-alert-title"><span>Fechas importantes</span><b>{workspace.importantDates.length}</b></div>
              <div>{workspace.importantDates.slice(0, 3).map((item) => <button key={item.id} onClick={() => { markProducerNoticesSeen(); notify(`${item.title}: ${item.details}`); }}><time>{new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(`${item.date}T12:00:00`)).replace(".", "")}</time><strong>{item.title}</strong><small>{item.details}</small></button>)}</div>
            </div>
          </div>
        </section>

        <section className="producer-content">
          <header className="producer-page-heading">
            <div><span>{selectedSlot?.startTime ?? "10:00"} - {selectedSlot?.endTime ?? "12:30"}</span><h1>{producerSection === "today" ? longSpanishDate(selectedDate) : producerSection === "people" ? "Base de invitados" : "Post-pauta"}</h1><p>{producerSection === "today" ? "Prepara, revisa y deja lista la pauta del programa desde una sola pantalla." : producerSection === "people" ? "Encuentra especialistas por nombre, cargo o temas que ya trataron." : "Registra lo que realmente salió usando la misma escaleta."}</p></div>
            {producerSection === "today" && <button className="producer-new-pauta" onClick={openProducerNewPauta}><span>+</span> Crear nueva pauta</button>}
          </header>

          {producerSection === "today" && (
            <div className="producer-date-strip" aria-label="Cambiar fecha de la pauta">
              <button className="producer-date-arrow" aria-label="Emisión anterior" onClick={() => chooseProducerDate(nearestProducerDate(selectedDate, -1))}>Anterior</button>
              <div className="producer-day-tabs" aria-label="Días del programa">{producerDays.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => chooseProducerDate(day.date)}><span>{day.label.split(" ")[0]}</span><strong>{day.label.split(" ")[1]}</strong></button>)}</div>
              <label className="producer-date-picker"><span>Ir a cualquier fecha</span><input type="date" value={selectedDate} onChange={(event) => chooseProducerDate(event.target.value)} /></label>
              <button className="producer-date-arrow" aria-label="Emisión siguiente" onClick={() => chooseProducerDate(nearestProducerDate(selectedDate, 1))}>Siguiente</button>
            </div>
          )}

          {producerSection === "today" && (
            <>
              <section className="producer-today-bar">
                <div><span>Estado de la pauta</span><strong>{statusLabel[selectedEmission?.status ?? "empty"]}</strong></div>
                <div><span>Bloques</span><strong>{selectedEmission?.segments.length ?? 0}</strong></div>
                <div><span>Invitados</span><strong>{guestSegments.length}</strong></div>
                <div className="producer-today-actions"><button onClick={() => setShowPeopleDirectory(true)}>Buscar invitado</button><button className="primary" disabled={!dirty || saving || !canEdit} onClick={saveDraft}>{saving ? "Guardando…" : dirty ? "Guardar cambios" : "Todo guardado"}</button></div>
              </section>

              {producerPautaIsBlank && !producerComposerMode && (
                <section className="producer-start-options">
                  <div><strong>Pega tu prepauta o hazla aquí</strong><p>Empieza como te resulte más natural. En ambos casos terminarás con una escaleta editable.</p></div>
                  <button onClick={() => chooseProducerComposer("paste")}><b>Pegar una prepauta</b><span>Trae el texto desde WhatsApp, email o un documento.</span></button>
                  <button onClick={() => chooseProducerComposer("write")}><b>Hacerla aquí</b><span>Escribe libremente o arma los bloques uno por uno.</span></button>
                </section>
              )}

              <div className="producer-today-grid">
                <section className="producer-rundown-panel">
                  <header><div><span>Escaleta editable</span><h2>{producerProgram?.shortName}</h2></div><button disabled={!canEdit} onClick={addSegment}>+ Añadir bloque</button></header>
                  {renderSavedRundown()}
                </section>

                <aside className="producer-side-panel">
                  <section className={`producer-compose-card ${producerComposerMode ? "open" : ""}`}>
                    <header><div><strong>{producerComposerMode ? producerComposerMode === "paste" ? "Pegar una prepauta" : "Crear la prepauta aquí" : "Añadir texto a la pauta"}</strong><small>Texto libre primero, escaleta editable después.</small></div>{producerComposerMode && <button onClick={() => setProducerComposerMode(null)}>Cerrar</button>}</header>
                    {!producerComposerMode ? (
                      <div className="producer-compose-choices"><button onClick={() => chooseProducerComposer("paste")}><strong>Pegar texto</strong><span>WhatsApp o email</span></button><button onClick={() => chooseProducerComposer("write")}><strong>Escribir aquí</strong><span>Desde cero</span></button></div>
                    ) : <div className="producer-compose-editor">
                      <div className="producer-compose-tabs"><button className={producerComposerMode === "paste" ? "active" : ""} onClick={() => chooseProducerComposer("paste")}>Pegar prepauta</button><button className={producerComposerMode === "write" ? "active" : ""} onClick={() => chooseProducerComposer("write")}>Hacerla aquí</button></div>
                      <label><span>Productor</span><input list="known-producers" disabled={!canEdit} value={selectedEmission?.producerName ?? ""} onChange={(event) => setProducerName(event.target.value)} placeholder="Nombre del productor" /></label>
                      <div className={`producer-guest-rule ${rawTextHasGuestLabel ? "valid" : ""}`}><strong>Identifica a cada persona</strong><p>Escribe <b>INVITADO:</b> o <b>INVITADA:</b> antes del nombre completo. Así podremos buscarla en la base o crear su ficha sin confundirla.</p>{selectedEmission?.rawText.trim() && <span>{rawTextHasGuestLabel ? "Formato de invitado detectado" : "Falta definir INVITADO: o INVITADA:"}</span>}</div>
                      <textarea disabled={!canEdit || !selectedEmission} rows={producerComposerMode === "write" ? 14 : 11} value={selectedEmission?.rawText ?? ""} onChange={(event) => updateEmission({ rawText: event.target.value, status: "draft" })} placeholder={producerComposerMode === "paste" ? "Pega aquí el texto completo recibido por WhatsApp o email." : "Escribe tu prepauta con horarios, TEMA, INVITADO / INVITADA y ENFOQUE."} />
                      <div className="producer-compose-tools">
                        {producerComposerMode === "write" && !selectedEmission?.rawText.trim() && <button onClick={insertProducerTemplate}>Usar una guía de texto</button>}
                        {producerComposerMode === "write" && <button onClick={addSegment}>Añadir bloque manual</button>}
                      </div>
                      <p className="producer-fast-import">Si ya escribiste horarios o numeraste noticias, se ordenarán primero sin esperar al modelo. Luna interviene solo cuando el texto necesita interpretación.</p>
                      <button className="primary" disabled={!canEdit || !getAccessToken || aiProcessing || !selectedEmission || selectedEmission.rawText.trim().length < 20} onClick={orderWithAi}>{aiProcessing ? "Ordenando..." : "Convertir en escaleta"}</button>
                    </div>}
                  </section>

                  <section className="producer-guests-card">
                    <header><div><span>Invitados en pauta</span><strong>{guestSegments.length} confirmados</strong></div><button onClick={() => setProducerSection("people")}>Ver base</button></header>
                    <div>{guestSegments.map((segment) => <button key={segment.id} onClick={() => setShowPeopleDirectory(true)}><span>{segment.guest.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div><strong>{segment.guest}</strong><small>{segment.guestRole || segment.topic || "Cargo por completar"}</small></div></button>)}</div>
                    {!guestSegments.length && <p>Añade un invitado desde cualquier bloque de la escaleta.</p>}
                  </section>

                  <section className="producer-next-card"><span>Siguiente paso</span><strong>{selectedEmission?.status === "ready" ? "La pauta está lista para salir" : "Revisa horarios e invitados"}</strong><p>Cuando termine el programa, la misma escaleta estará disponible en Post-pauta.</p><button disabled={!canEdit || !selectedEmission?.segments.length} onClick={() => updateEmission({ status: "ready" })}>Marcar pauta como lista</button></section>
                </aside>
              </div>

            </>
          )}

          {producerSection === "people" && (
            <section className="producer-people-browser">
              <header><label><span>Buscar por persona, especialidad o tema tratado</span><input autoFocus type="search" value={producerPeopleQuery} onChange={(event) => setProducerPeopleQuery(event.target.value)} placeholder="Ej. psicología infantil, tecnología, economía" /></label><button onClick={() => setShowArchiveSearch(true)}>Buscar entrevistas y temas</button></header>
              <div>{matchingPeople.map((person) => {
                const latest = person.appearances[0];
                return <article key={person.id}><span className="person-initials">{person.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div><strong>{person.displayName}</strong><small>{person.primaryRole || "Especialidad por completar"}{person.organization ? ` · ${person.organization}` : ""}</small><p>{latest?.summary || latest?.topic || "Aún no tiene temas registrados."}</p></div><footer><span>{person.appearances.length} apariciones · contacto por completar</span><button onClick={() => setShowPeopleDirectory(true)}>Ver historial</button></footer></article>;
              })}</div>
              {!matchingPeople.length && <div className="empty-state compact"><strong>No encontramos especialistas</strong><p>Prueba con otro tema o registra una persona nueva desde la escaleta.</p></div>}
            </section>
          )}

          {producerSection === "post" && <div className="producer-post-embed">{renderPostPauta()}</div>}
        </section>

        {(aiProcessing || aiResult) && (
          <div className="modal-backdrop producer-luna-backdrop">
            <section className={`producer-luna-modal ${aiProcessing ? "processing" : "reviewing"}`} role="dialog" aria-modal="true" aria-label={aiProcessing ? "Ordenando la pauta" : "Revisar la escaleta generada"}>
              {aiProcessing ? (
                <div className="producer-luna-progress" role="status" aria-live="polite">
                  <span>Lectura automática</span>
                  <h2>Ordenando tu prepauta</h2>
                  <p>Primero reconoce horarios y bloques ya escritos. Luna interviene solo si el texto necesita interpretación.</p>
                  <div className="producer-luna-progress-lines" aria-hidden="true"><i /><i /><i /></div>
                  <small>La pauta original permanece intacta.</small>
                </div>
              ) : aiResult ? (
                <PautaAiReview proposal={aiResult.proposal} model={aiResult.model} processingMode={aiResult.processingMode} applying={aiApplying} people={effectivePeople} producerName={selectedEmission?.producerName ?? ""} onProducerNameChange={setProducerName} onChange={(proposal) => setAiResult({ ...aiResult, proposal })} onClose={() => setAiResult(null)} onApply={applyAiProposal} />
              ) : null}
            </section>
          </div>
        )}

        {showProducerNewPauta && (
          <div className="modal-backdrop producer-new-pauta-backdrop" role="presentation" onMouseDown={() => setShowProducerNewPauta(false)}>
            <section className="producer-new-pauta-modal" role="dialog" aria-modal="true" aria-labelledby="new-pauta-title" onMouseDown={(event) => event.stopPropagation()}>
              <header><div><span>Nueva emisión</span><h2 id="new-pauta-title">Crear nueva pauta</h2><p>Elige la fecha y cómo quieres empezar. Si ya existe una pauta, la abriremos sin reemplazarla.</p></div><button aria-label="Cerrar" onClick={() => setShowProducerNewPauta(false)}>Cerrar</button></header>
              <label className="producer-new-date"><span>Fecha del programa</span><input autoFocus type="date" value={producerNewPautaDate} onChange={(event) => setProducerNewPautaDate(event.target.value)} /><small>{longSpanishDate(producerNewPautaDate)}</small></label>
              <div className="producer-new-methods" role="radiogroup" aria-label="Cómo empezar la pauta">
                <button role="radio" aria-checked={producerNewPautaMode === "paste"} className={producerNewPautaMode === "paste" ? "active" : ""} onClick={() => setProducerNewPautaMode("paste")}><strong>Pegar una prepauta</strong><span>Ya la hiciste en WhatsApp, email u otra herramienta.</span></button>
                <button role="radio" aria-checked={producerNewPautaMode === "write"} className={producerNewPautaMode === "write" ? "active" : ""} onClick={() => setProducerNewPautaMode("write")}><strong>Hacerla aquí</strong><span>Escribe en texto libre o empieza con bloques editables.</span></button>
              </div>
              <div className="producer-new-guest-note"><strong>Para reconocer invitados</strong><p>Usa INVITADO: o INVITADA: seguido del nombre completo. La herramienta buscará coincidencias incluso si hay un pequeño error de escritura.</p></div>
              <footer><button onClick={() => setShowProducerNewPauta(false)}>Cancelar</button><button className="primary" onClick={beginProducerPauta}>Empezar pauta</button></footer>
            </section>
          </div>
        )}

        <datalist id="known-guests">{effectivePeople.map((person) => <option key={person.id} value={person.displayName}>{person.primaryRole}</option>)}</datalist>
        <datalist id="known-producers">{producerSuggestions.map((producer) => <option key={producer} value={producer} />)}</datalist>
        {showPeopleDirectory && <PeopleDirectory people={effectivePeople} onClose={() => setShowPeopleDirectory(false)} />}
        {showArchiveSearch && <ArchiveSearch emissions={effectiveEmissions} searchArchive={repository.searchArchive} onClose={() => setShowArchiveSearch(false)} />}
        <button className="floating-version" onClick={() => setShowVersionHistory(true)} aria-label={`Ver historial de versiones. Versión actual ${CURRENT_VERSION}`}><span>Versión</span><strong>v{CURRENT_VERSION}</strong></button>
        {showVersionHistory && <VersionHistoryModal onClose={() => setShowVersionHistory(false)} />}
        <div className={`toast ${toast ? "visible" : ""}`} role="status" aria-live="polite">{toast}</div>
      </main>
    );
  }

  function renderEditorialDesk() {
    const columns: Array<{ status: Emission["status"]; title: string; hint: string }> = [
      { status: "empty", title: "Falta pauta", hint: "Requiere acción" },
      { status: "draft", title: "En preparación", hint: "Edición en curso" },
      { status: "ready", title: "Lista para salir", hint: "Revisada" },
      { status: "post", title: "Post-pauta", hint: "Emisión registrada" },
    ];
    const itemsByStatus = Object.fromEntries(columns.map((column) => [
      column.status,
      managedDaySlots.filter((slot) => (effectiveEmissions.find((emission) => emission.programId === slot.programId && emission.date === selectedDate)?.status ?? "empty") === column.status),
    ])) as Record<Emission["status"], ScheduleSlot[]>;
    return (
      <section className="mode-page desk-page">
        <header className="mode-heading">
          <div><span>{selectedDay.label} · Kanban editorial</span><h1>Mesa editorial</h1><p>Cada programa avanza por estado: falta pauta, preparación, listo para salir y post-pauta.</p></div>
          <div className="mode-day-tabs">{days.map((day) => <button key={day.date} className={day.date === selectedDate ? "active" : ""} onClick={() => setSelectedDate(day.date)}>{day.label}</button>)}</div>
        </header>
        {workspace.bulletins[0] && <article className="desk-bulletin"><span>Indicación del día</span><strong>{workspace.bulletins[0].title}</strong><p>{workspace.bulletins[0].body}</p></article>}
        <nav className="desk-status-tabs" aria-label="Filtrar Mesa por estado">
          {columns.map((column) => (
            <button key={column.status} className={mobileDeskStatus === column.status ? "active" : ""} onClick={() => setMobileDeskStatus(column.status)} aria-pressed={mobileDeskStatus === column.status}>
              <span>{column.title}</span><b>{itemsByStatus[column.status].length}</b>
            </button>
          ))}
        </nav>
        <p className="desk-mobile-hint">Elige un estado. Puedes mover cada programa desde su selector.</p>
        <DragDropProvider onDragEnd={handleKanbanDrop}>
          <div className="desk-columns" aria-label="Kanban editorial por estado">
            {columns.map((column) => {
              const items = itemsByStatus[column.status];
              return (
                <KanbanColumn key={column.status} status={column.status} title={column.title} hint={column.hint} canEdit={canEdit} count={items.length} mobileActive={mobileDeskStatus === column.status}>
                  {items.map((slot) => {
                    const program = programs.find((item) => item.id === slot.programId);
                    const emission = effectiveEmissions.find((item) => item.programId === slot.programId && item.date === selectedDate);
                    if (!program) return null;
                    return (
                      <KanbanCard
                        key={slot.id}
                        slot={slot}
                        program={program}
                        emission={emission}
                        status={column.status}
                        canEdit={canEdit}
                        saving={kanbanSavingId === slot.id}
                        isDemo={Boolean(emission && isDemoId(emission.id))}
                        onMove={(slotId, status) => void moveEmissionStatus(slotId, status)}
                        onOpen={() => { chooseSlot(slot.id); setActiveView(column.status === "empty" ? "reception" : "program"); }}
                      />
                    );
                  })}
                  {!items.length && <p className="desk-empty">No hay programas en este estado.</p>}
                </KanbanColumn>
              );
            })}
          </div>
        </DragDropProvider>
      </section>
    );
  }

  if (!hydrated) {
    return <WorkspaceLoadingShell />;
  }

  if (loadError) {
    return <main className="access-shell"><section className="access-panel compact"><strong>No pudimos cargar la agenda</strong><p>{loadError}</p><button className="primary" onClick={() => window.location.reload()}>Reintentar</button></section></main>;
  }

  if (producerExperience) return renderProducerPortal();

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

      {DEMO_DATA_AVAILABLE && (
        <aside className={`demo-data-bar ${demoDataEnabled ? "active" : ""}`} aria-label="Control de datos de prueba">
          <div>
            <b>{demoDataEnabled ? "Semana demo activa" : "Semana demo oculta"}</b>
            <span>{demoDataEnabled ? "Pautas ficticias visibles · las pautas reales tienen prioridad" : "Solo estás viendo la información real guardada por el equipo"}</span>
          </div>
          <div className="demo-data-actions">
            {demoDataEnabled && demoOverrides.length > 0 && <button onClick={resetDemoData}>Restablecer demo</button>}
            <button className="demo-toggle" onClick={toggleDemoData}>{demoDataEnabled ? "Ocultar datos de prueba" : "Mostrar datos de prueba"}</button>
          </div>
        </aside>
      )}

      {activeView === "agenda" && (
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><Image src="/rpp-logo.svg" alt="RPP" width={48} height={48} priority /><div><strong>Pauta</strong><small>Informativos</small></div></div>
        <label className="sidebar-filter"><span>Programa</span><select value={programFilter} onChange={(event) => setProgramFilter(event.target.value as "all" | "managed")}><option value="all">Todos los programas</option><option value="managed">Solo administrados</option></select></label>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className="active">Agenda semanal <b>35</b></button>
          <button onClick={() => notify("La vista de indicaciones se habilitará después del piloto.")}>Indicaciones <b>{workspace.bulletins.length}</b></button>
          <button onClick={() => setShowPeopleDirectory(true)}>Personas <b>{effectivePeople.length}</b></button>
          <button onClick={() => setShowArchiveSearch(true)}>Archivo</button>
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
          <div className="topbar-actions"><button className="producer-shortcut" onClick={openProducerExperience}>Vista productor</button><button className="search" onClick={() => setShowPeopleDirectory(true)}>Buscar invitado, tema o programa</button><span className="avatar">{accountLabel}</span></div>
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
                    const emission = effectiveEmissions.find((item) => item.programId === program.id && item.date === selectedDate);
                    const status = emission?.status ?? "empty";
                    const isLive = now?.date === selectedDate && now.minutes >= minutes(slot.startTime) && now.minutes < (slot.endTime === "00:00" ? 1440 : minutes(slot.endTime));
                    return (
                      <div className="schedule-row" key={slot.id}>
                        <time className="schedule-time">{slot.startTime}</time>
                        <button className={`schedule-card status-${status} ${selectedSlot?.id === slot.id ? "selected" : ""} ${!program.managed ? "schedule-only" : ""} ${isLive ? "live" : ""} ${emission && isDemoId(emission.id) ? "demo-card" : ""}`} onClick={() => setSelectedSlotId(slot.id)}>
                          <span className="schedule-main"><strong>{program.name}</strong><small>{program.hosts} | {slot.startTime} - {slot.endTime}</small></span>
                          <span className="slot-badges">{isLive && <b>Al aire ahora</b>}{emission && isDemoId(emission.id) && <em className="demo-label">Demo</em>}<em className={program.managed ? "managed-label" : "schedule-only-label"}>{program.managed ? "En herramienta" : "Solo horario"}</em>{program.managed && <i data-status={status}>{statusLabel[status]}</i>}</span>
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
                    <header className="editor-header"><div><span>{selectedDay.label} | {selectedSlot.startTime} - {selectedSlot.endTime}{selectedEmissionIsDemo ? " · DATOS DE PRUEBA" : ""}</span><h2>{selectedProgram.shortName}</h2></div><div className="editor-header-actions">{selectedProgram.id === "encendidos" && <button onClick={openProducerExperience}>Ver como producción</button>}<select disabled={!canEdit} value={selectedEmission.status} onChange={(event) => updateEmission({ status: event.target.value as Emission["status"] })}><option value="empty">Sin pauta</option><option value="draft">En edición</option><option value="ready">Lista</option><option value="post">Post-pauta</option></select></div></header>
                    <div className="editor-scroll">
                      <label className="field"><span>Pauta original</span><textarea disabled={!canEdit} rows={8} value={selectedEmission.rawText} onChange={(event) => updateEmission({ rawText: event.target.value, status: "draft" })} placeholder="Pega aquí la pauta recibida por WhatsApp o correo" /></label>
                      <div className="phase-two">
                        <div><strong>Ordenar automáticamente</strong><span>Reconoce primero la estructura existente y usa Luna solo cuando hace falta. El original se conserva.</span></div>
                        <button className="ai-action" disabled={!canEdit || !getAccessToken || aiProcessing || selectedEmission.rawText.trim().length < 20} onClick={orderWithAi}>{aiProcessing ? "Ordenando..." : "Ordenar pauta"}</button>
                      </div>
                      {aiResult && (
                        <PautaAiReview proposal={aiResult.proposal} model={aiResult.model} processingMode={aiResult.processingMode} applying={aiApplying} people={effectivePeople} producerName={selectedEmission.producerName} onProducerNameChange={setProducerName} onChange={(proposal) => setAiResult({ ...aiResult, proposal })} onClose={() => setAiResult(null)} onApply={applyAiProposal} />
                      )}
                      <div className="segments-heading"><div><strong>Escaleta</strong><span>{selectedEmission.segments.length} segmentos</span></div><button disabled={!canEdit} onClick={addSegment}>Añadir segmento</button></div>
                      <div className="segment-list">
                        {selectedEmission.segments.map((segment) => (
                          <article className="segment" key={segment.id}>
                            <div className="segment-times"><input disabled={!canEdit} aria-label="Hora de inicio" value={segment.startTime} onChange={(event) => updateSegmentDraft(segment.id, { startTime: event.target.value })} /><span>a</span><input disabled={!canEdit} aria-label="Hora de fin" value={segment.endTime} onChange={(event) => updateSegmentDraft(segment.id, { endTime: event.target.value })} /></div>
                            <label><span>Tipo</span><select disabled={!canEdit} value={segment.type} onChange={(event) => updateSegmentDraft(segment.id, { type: event.target.value as Segment["type"] }, 0)}>{Object.entries(segmentTypeLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                            <label className="segment-title"><span>Título</span><input disabled={!canEdit} value={segment.title} onChange={(event) => updateSegmentDraft(segment.id, { title: event.target.value })} /></label>
                            <label className="segment-guest"><span>Invitado</span><input list="known-guests" disabled={!canEdit} value={segment.guest} onChange={(event) => updateSegmentGuest(segment, event.target.value)} placeholder="Empieza a escribir un nombre" /></label>
                            <label className="segment-notes"><span>Notas</span><textarea disabled={!canEdit} rows={2} value={segment.notes} onChange={(event) => updateSegmentDraft(segment.id, { notes: event.target.value })} /></label>
                            <details className="segment-details">
                              <summary>Detalles extraídos</summary>
                              <div>
                                <label><span>Cargo</span><input disabled={!canEdit} value={segment.guestRole ?? ""} onChange={(event) => updateSegmentDraft(segment.id, { guestRole: event.target.value })} /></label>
                                <label><span>Tema</span><textarea disabled={!canEdit} rows={2} value={segment.topic ?? ""} onChange={(event) => updateSegmentDraft(segment.id, { topic: event.target.value })} /></label>
                                <label><span>Enfoque</span><textarea disabled={!canEdit} rows={3} value={segment.focus ?? ""} onChange={(event) => updateSegmentDraft(segment.id, { focus: event.target.value })} /></label>
                                <label><span>Pregunta al público</span><textarea disabled={!canEdit} rows={2} value={segment.audienceQuestion ?? ""} onChange={(event) => updateSegmentDraft(segment.id, { audienceQuestion: event.target.value })} /></label>
                                <label><span>Indicaciones de producción</span><textarea disabled={!canEdit} rows={2} value={(segment.productionCues ?? []).join("\n")} onChange={(event) => updateSegmentDraft(segment.id, { productionCues: event.target.value.split("\n").map((cue) => cue.trim()).filter(Boolean) })} /></label>
                              </div>
                            </details>
                            <button className="remove" disabled={!canEdit || (segment.stories?.length ?? 0) > 0} title={(segment.stories?.length ?? 0) > 0 ? "Mueve las noticias antes de quitar este bloque" : undefined} onClick={() => void removeSegment(segment)}>Quitar</button>
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
      {activeView === "post" && renderPostPauta()}

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
        {effectivePeople.map((person) => <option key={person.id} value={person.displayName}>{person.primaryRole}</option>)}
      </datalist>
      <datalist id="known-producers">
        {producerSuggestions.map((producer) => <option key={producer} value={producer} />)}
      </datalist>

      {showPeopleDirectory && <PeopleDirectory people={effectivePeople} onClose={() => setShowPeopleDirectory(false)} />}
      {showArchiveSearch && <ArchiveSearch emissions={effectiveEmissions} searchArchive={repository.searchArchive} onOpenResult={openArchiveResult} onClose={() => setShowArchiveSearch(false)} />}

      {segmentHistory && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSegmentHistory(null)}>
          <section className="modal segment-history-modal" role="dialog" aria-modal="true" aria-labelledby="segment-history-title">
            <header><div><span>Historial editorial</span><h2 id="segment-history-title">{segmentHistory.title}</h2></div><button onClick={() => setSegmentHistory(null)}>Cerrar</button></header>
            <div className="segment-history-list">
              {segmentHistory.loading && <div className="empty-state compact"><strong>Cargando cambios</strong><p>Buscando las versiones anteriores de este bloque.</p></div>}
              {!segmentHistory.loading && segmentHistory.entries.map((entry) => (
                <article key={entry.id}>
                  <header><div><strong>{entry.actorName}</strong><time>{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</time></div><button disabled={!canEdit} onClick={() => restoreSegmentRevision(entry)}>Restaurar</button></header>
                  <h3>{entry.segment.title}</h3>
                  <p>{entry.segment.topic || entry.segment.focus || entry.segment.notes || "Esta versión no tenía contenido adicional."}</p>
                  <footer><span>{entry.segment.startTime || "--:--"} a {entry.segment.endTime || "--:--"}</span><span>Versión {entry.segment.version ?? 1}</span></footer>
                </article>
              ))}
              {!segmentHistory.loading && !segmentHistory.entries.length && <div className="empty-state compact"><strong>Aún no hay versiones anteriores</strong><p>El historial comenzará con el próximo guardado compartido.</p></div>}
            </div>
          </section>
        </div>
      )}

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
