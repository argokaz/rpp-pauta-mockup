import type { Emission, Segment, WorkspaceState } from "@/domain/schemas";
import type { ArchiveSearchFilters, ArchiveSearchPage } from "@/domain/archive-search";

export type StorageMode = "local" | "supabase";

export type SegmentSaveResult =
  | { status: "saved"; segment: Segment; editorName: string }
  | { status: "conflict"; remoteSegment?: Segment; editorName: string };

export type SegmentDeleteResult =
  | { status: "deleted" }
  | { status: "conflict"; remoteSegment?: Segment; editorName: string };

export type SegmentRevision = { id: string; createdAt: string; action: string; actorName: string; segment: Segment };

export interface WorkspaceRepository {
  mode: StorageMode;
  load(): Promise<WorkspaceState>;
  save(state: WorkspaceState): Promise<WorkspaceState>;
  saveProgramEmission?(emission: Emission): Promise<WorkspaceState>;
  replaceProgramEmission?(emission: Emission): Promise<WorkspaceState>;
  saveEmissionStatus(emission: Emission): Promise<void>;
  saveSegment?(emission: Emission, segment: Segment, sortOrder: number): Promise<SegmentSaveResult>;
  deleteSegment?(emission: Emission, segment: Segment): Promise<SegmentDeleteResult>;
  saveSegmentOrder?(emission: Emission, segments: Segment[]): Promise<Segment[]>;
  loadSegmentRevisions?(segmentId: string): Promise<SegmentRevision[]>;
  searchArchive?(filters: ArchiveSearchFilters): Promise<ArchiveSearchPage>;
  subscribe?(onChange: () => void): () => void;
  confirmImport(importId: string): Promise<void>;
}
