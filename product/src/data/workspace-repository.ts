import type { Emission, FixedBlock, Program, ScheduleSlot, Segment, WorkspaceState } from "@/domain/schemas";
import type { ArchiveSearchFilters, ArchiveSearchPage } from "@/domain/archive-search";

export type StorageMode = "local" | "supabase";

export type SegmentSaveResult =
  | { status: "saved"; segment: Segment; editorName: string }
  | { status: "conflict"; remoteSegment?: Segment; editorName: string };

export type SegmentDeleteResult =
  | { status: "deleted" }
  | { status: "conflict"; remoteSegment?: Segment; editorName: string };

export type SegmentRevision = { id: string; createdAt: string; action: string; actorName: string; segment: Segment };

export type EditorialUser = {
  id: string;
  email: string;
  fullName: string;
  role: "superadmin" | "general_producer" | "producer" | "viewer";
  active: boolean;
  programIds: string[];
};

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
  saveProgram?(program: Program): Promise<Program>;
  saveScheduleSlot?(slot: ScheduleSlot): Promise<ScheduleSlot>;
  deleteScheduleSlot?(slotId: string, effectiveTo?: string): Promise<void>;
  saveFixedBlock?(block: FixedBlock): Promise<FixedBlock>;
  deleteFixedBlock?(blockId: string, stopFrom?: string): Promise<void>;
  loadEditorialUsers?(): Promise<EditorialUser[]>;
  saveEditorialUser?(user: EditorialUser): Promise<EditorialUser>;
  subscribe?(onChange: () => void): () => void;
  confirmImport(importId: string): Promise<void>;
}
