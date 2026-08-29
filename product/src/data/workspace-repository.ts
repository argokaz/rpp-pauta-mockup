import type { Emission, WorkspaceState } from "@/domain/schemas";

export type StorageMode = "local" | "supabase";

export interface WorkspaceRepository {
  mode: StorageMode;
  load(): Promise<WorkspaceState>;
  save(state: WorkspaceState): Promise<WorkspaceState>;
  saveEmissionStatus(emission: Emission): Promise<void>;
  confirmImport(importId: string): Promise<void>;
}
