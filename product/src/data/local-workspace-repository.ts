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
  async confirmImport() {},
};
