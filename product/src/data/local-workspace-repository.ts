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
  async confirmImport() {},
};
