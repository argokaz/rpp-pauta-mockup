import type { Emission, FixedBlock, Person, Program, ScheduleSlot, Segment, WorkspaceState } from "@/domain/schemas";
import type { ArchiveSearchFilters, ArchiveSearchPage } from "@/domain/archive-search";

export type StorageMode = "local" | "supabase";

export type SegmentSaveResult =
  | { status: "saved"; segment: Segment; editorName: string }
  | { status: "conflict"; remoteSegment?: Segment; editorName: string };

export type SegmentDeleteResult =
  | { status: "deleted" }
  | { status: "conflict"; remoteSegment?: Segment; editorName: string };

export type SegmentRevision = { id: string; createdAt: string; action: string; actorName: string; segment: Segment };

export type PersonSnapshot = Pick<Person, "displayName" | "normalizedName" | "aliases" | "primaryRole" | "organization" | "phone" | "tags" | "relationshipType" | "notes">;

export type PersonRevision = {
  id: string;
  personId: string;
  createdAt: string;
  action: "insert" | "update" | "delete";
  actorName: string;
  changedFields: Array<keyof PersonSnapshot>;
  before: PersonSnapshot | null;
  after: PersonSnapshot | null;
};

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
  savePerson?(person: Person): Promise<Person>;
  loadPersonRevisions?(personId: string): Promise<PersonRevision[]>;
  restorePersonField?(person: Person, revisionId: string, field: Exclude<keyof PersonSnapshot, "normalizedName">): Promise<Person>;
  loadEditorialUsers?(): Promise<EditorialUser[]>;
  saveEditorialUser?(user: EditorialUser): Promise<EditorialUser>;
  subscribe?(onChange: () => void): () => void;
  confirmImport(importId: string): Promise<void>;
}
