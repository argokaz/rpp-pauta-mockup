import type { Emission, Segment, WorkspaceState } from "@/domain/schemas";

export type StorageMode = "local" | "supabase";

export interface WorkspaceRepository {
  mode: StorageMode;
  load(): Promise<WorkspaceState>;
  save(state: WorkspaceState): Promise<WorkspaceState>;
  saveProgramEmission?(emission: Emission): Promise<WorkspaceState>;
  saveEmissionStatus(emission: Emission): Promise<void>;
  savePostSegment?(emission: Emission, segment: Segment, sortOrder: number): Promise<void>;
  subscribe?(onChange: () => void): () => void;
  confirmImport(importId: string): Promise<void>;
}
