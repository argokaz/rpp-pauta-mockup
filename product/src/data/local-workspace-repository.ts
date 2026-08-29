import { loadWorkspace, saveWorkspace } from "@/data/local-repository";
import type { WorkspaceRepository } from "@/data/workspace-repository";

export const localWorkspaceRepository: WorkspaceRepository = {
  mode: "local",
  async load() {
    return loadWorkspace();
  },
  async save(state) {
    saveWorkspace(state);
    return state;
  },
};
