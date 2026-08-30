import { loadWorkspace, saveWorkspace } from "@/data/local-repository";
import type { WorkspaceRepository } from "@/data/workspace-repository";
import { syncLocalPeople } from "@/domain/people-history";
import { searchArchiveLocally } from "@/domain/archive-search";

export const localWorkspaceRepository: WorkspaceRepository = {
  mode: "local",
  async load() {
    return syncLocalPeople(loadWorkspace());
  },
  async save(state) {
    const synced = syncLocalPeople(state);
    saveWorkspace(synced);
    return synced;
  },
  async saveProgramEmission(emission) {
    const workspace = loadWorkspace();
    const exists = workspace.emissions.some((item) => item.id === emission.id);
    const next = syncLocalPeople({
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((item) => item.id === emission.id ? emission : item)
        : [...workspace.emissions, emission],
    });
    saveWorkspace(next);
    return next;
  },
  async replaceProgramEmission(emission) {
    const workspace = loadWorkspace();
    const exists = workspace.emissions.some((item) => item.id === emission.id);
    const next = syncLocalPeople({
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((item) => item.id === emission.id ? emission : item)
        : [...workspace.emissions, emission],
    });
    saveWorkspace(next);
    return next;
  },
  async saveEmissionStatus(emission) {
    const workspace = loadWorkspace();
    const exists = workspace.emissions.some((item) => item.id === emission.id);
    saveWorkspace({
      ...workspace,
      emissions: exists
        ? workspace.emissions.map((item) => item.id === emission.id ? emission : item)
        : [...workspace.emissions, emission],
    });
  },
  async saveSegment(emission, segment, sortOrder) {
    const workspace = loadWorkspace();
    const existing = workspace.emissions.find((item) => item.programId === emission.programId && item.date === emission.date);
    const savedSegment = { ...segment, version: (segment.version ?? 0) + 1, lastEditedAt: new Date().toISOString() };
    const nextEmission = existing
      ? {
        ...existing,
        segments: existing.segments.some((item) => item.id === segment.id)
          ? existing.segments.map((item) => item.id === segment.id ? savedSegment : item)
          : [...existing.segments.slice(0, sortOrder), savedSegment, ...existing.segments.slice(sortOrder)],
        updatedAt: new Date().toISOString(),
      }
      : { ...emission, segments: emission.segments.map((item, index) => index === sortOrder ? savedSegment : item) };
    saveWorkspace({
      ...workspace,
      emissions: existing
        ? workspace.emissions.map((item) => item.id === existing.id ? nextEmission : item)
        : [...workspace.emissions, nextEmission],
    });
    return { status: "saved", segment: savedSegment, editorName: "Este navegador" };
  },
  async deleteSegment(emission, segment) {
    const workspace = loadWorkspace();
    saveWorkspace({
      ...workspace,
      emissions: workspace.emissions.map((item) => item.programId === emission.programId && item.date === emission.date
        ? { ...item, segments: item.segments.filter((candidate) => candidate.id !== segment.id), updatedAt: new Date().toISOString() }
        : item),
    });
    return { status: "deleted" };
  },
  async saveSegmentOrder(emission, segments) {
    const workspace = loadWorkspace();
    const nextSegments = segments.map((segment) => ({ ...segment, version: (segment.version ?? 0) + 1, lastEditedAt: new Date().toISOString() }));
    saveWorkspace({
      ...workspace,
      emissions: workspace.emissions.map((item) => item.programId === emission.programId && item.date === emission.date ? { ...item, segments: nextSegments } : item),
    });
    return nextSegments;
  },
  async loadSegmentRevisions() {
    return [];
  },
  async searchArchive(filters) {
    return searchArchiveLocally(loadWorkspace().emissions, filters);
  },
  async saveProgram(program) {
    const workspace = loadWorkspace();
    const exists = workspace.programs.some((item) => item.id === program.id);
    saveWorkspace({ ...workspace, programs: exists ? workspace.programs.map((item) => item.id === program.id ? program : item) : [...workspace.programs, program] });
    return program;
  },
  async saveScheduleSlot(slot) {
    const workspace = loadWorkspace();
    const sourceId = slot.id.startsWith("version-") ? slot.id.slice("version-".length) : "";
    const saved = slot.id.startsWith("new-") || sourceId ? { ...slot, id: crypto.randomUUID() } : slot;
    const retired = sourceId ? workspace.scheduleSlots.map((item) => item.id === sourceId
      ? { ...item, active: false, effectiveTo: new Date(new Date(`${slot.effectiveFrom}T12:00:00`).getTime() - 86_400_000).toISOString().slice(0, 10) }
      : item) : workspace.scheduleSlots;
    const exists = retired.some((item) => item.id === saved.id);
    saveWorkspace({ ...workspace, scheduleSlots: exists ? retired.map((item) => item.id === saved.id ? saved : item) : [...retired, saved] });
    return saved;
  },
  async deleteScheduleSlot(slotId, effectiveTo) {
    const workspace = loadWorkspace();
    saveWorkspace({ ...workspace, scheduleSlots: workspace.scheduleSlots.map((slot) => slot.id === slotId ? { ...slot, active: false, effectiveTo: effectiveTo ?? new Date().toISOString().slice(0, 10) } : slot) });
  },
  async loadEditorialUsers() {
    return [{ id: "local-admin", email: "demo@local", fullName: "Administración local", role: "superadmin", active: true, programIds: [] }];
  },
  async saveEditorialUser(user) {
    return user;
  },
  async confirmImport() {},
};
