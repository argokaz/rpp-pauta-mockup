import { loadWorkspace, saveWorkspace } from "@/data/local-repository";
import type { WorkspaceRepository } from "@/data/workspace-repository";
import { syncLocalPeople } from "@/domain/people-history";

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
  async savePostSegment(emission, segment, sortOrder) {
    const workspace = loadWorkspace();
    const existing = workspace.emissions.find((item) => item.programId === emission.programId && item.date === emission.date);
    const nextEmission = existing
      ? { ...existing, segments: existing.segments.map((item, index) => index === sortOrder ? segment : item), updatedAt: new Date().toISOString() }
      : { ...emission, segments: emission.segments.map((item, index) => index === sortOrder ? segment : item) };
    saveWorkspace({
      ...workspace,
      emissions: existing
        ? workspace.emissions.map((item) => item.id === existing.id ? nextEmission : item)
        : [...workspace.emissions, nextEmission],
    });
  },
  async confirmImport() {},
};
