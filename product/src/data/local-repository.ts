import { initialWorkspaceState } from "@/data/seed";
import { workspaceStateSchema, type WorkspaceState } from "@/domain/schemas";

const STORAGE_KEY = "rpp-pauta-workspace-v1";

export function loadWorkspace(): WorkspaceState {
  if (typeof window === "undefined") return initialWorkspaceState;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return initialWorkspaceState;

  try {
    return workspaceStateSchema.parse(JSON.parse(stored));
  } catch {
    return initialWorkspaceState;
  }
}

export function saveWorkspace(state: WorkspaceState): void {
  workspaceStateSchema.parse(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
