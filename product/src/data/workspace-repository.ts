import type { WorkspaceState } from "@/domain/schemas";

export type StorageMode = "local" | "supabase";

export interface WorkspaceRepository {
  mode: StorageMode;
  load(): Promise<WorkspaceState>;
  save(state: WorkspaceState): Promise<WorkspaceState>;
}
