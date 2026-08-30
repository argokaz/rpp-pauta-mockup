import { initialWorkspaceState } from "@/data/seed";
import { workspaceStateSchema, type WorkspaceState } from "@/domain/schemas";

const STORAGE_KEY = "rpp-pauta-workspace-v1";

export function loadWorkspace(): WorkspaceState {
  if (typeof window === "undefined") return initialWorkspaceState;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return initialWorkspaceState;

  try {
    const parsed = workspaceStateSchema.parse(JSON.parse(stored));
    return {
      ...parsed,
      programs: parsed.programs.length ? parsed.programs : initialWorkspaceState.programs,
      scheduleSlots: parsed.scheduleSlots.length ? parsed.scheduleSlots : initialWorkspaceState.scheduleSlots,
      fixedBlocks: parsed.fixedBlocks.length ? parsed.fixedBlocks : initialWorkspaceState.fixedBlocks,
    };
  } catch {
    return initialWorkspaceState;
  }
}

export function saveWorkspace(state: WorkspaceState): void {
  workspaceStateSchema.parse(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
