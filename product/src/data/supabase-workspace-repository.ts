import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceStateSchema, type Emission, type WorkspaceState } from "@/domain/schemas";
import type { WorkspaceRepository } from "@/data/workspace-repository";

const WEEK_START = "2026-08-24";

const scopeToDatabase: Record<string, "all" | "informative"> = {
  "Todos los programas": "all",
  "Programas informativos": "informative",
};

const scopeFromDatabase: Record<string, string> = {
  all: "Todos los programas",
  informative: "Programas informativos",
  program: "Todos los programas",
};

function shortTime(value: string | null): string {
  return value?.slice(0, 5) ?? "";
}

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export function createSupabaseWorkspaceRepository(
  supabase: SupabaseClient,
  userId: string,
): WorkspaceRepository {
  async function load(): Promise<WorkspaceState> {
    const [bulletinsResult, datesResult, emissionsResult] = await Promise.all([
      supabase.from("bulletins").select("id,title,body,scope").eq("active", true).order("created_at"),
      supabase.from("important_dates").select("id,event_date,title,details,important_date_plans(program_id,notes)").order("event_date"),
      supabase.from("emissions").select("id,program_id,emission_date,status,raw_text,updated_at,segments(id,sort_order,planned_start,planned_end,segment_type,sequence_name,slug,topic,focus,guest_text,guest_role,audience_question,production_cues,notes,extraction_confidence,source_excerpt)").order("emission_date"),
    ]);

    assertNoError(bulletinsResult.error, "No se pudieron cargar las indicaciones");
    assertNoError(datesResult.error, "No se pudieron cargar las fechas");
    assertNoError(emissionsResult.error, "No se pudieron cargar las pautas");

    return workspaceStateSchema.parse({
      bulletins: (bulletinsResult.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        scope: scopeFromDatabase[row.scope] ?? "Todos los programas",
      })),
      importantDates: (datesResult.data ?? []).map((row) => ({
        id: row.id,
        date: row.event_date,
        title: row.title,
        details: row.details,
        plans: Object.fromEntries((row.important_date_plans ?? []).map((plan) => [plan.program_id, plan.notes])),
      })),
      emissions: (emissionsResult.data ?? []).map((row) => ({
        id: row.id,
        programId: row.program_id,
        date: row.emission_date,
        status: (["empty", "draft", "ready", "post"].includes(row.status) ? row.status : "post") as Emission["status"],
        rawText: row.raw_text,
        updatedAt: row.updated_at,
        segments: [...(row.segments ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((segment) => ({
            id: segment.id,
            startTime: shortTime(segment.planned_start),
            endTime: shortTime(segment.planned_end),
            type: segment.segment_type,
            title: segment.slug,
            guest: segment.guest_text ?? "",
            notes: segment.notes,
            sequence: segment.sequence_name ?? "",
            topic: segment.topic ?? "",
            focus: segment.focus ?? "",
            guestRole: segment.guest_role ?? "",
            audienceQuestion: segment.audience_question ?? "",
            productionCues: Array.isArray(segment.production_cues)
              ? segment.production_cues.filter((cue): cue is string => typeof cue === "string")
              : [],
            confidence: typeof segment.extraction_confidence === "number" ? segment.extraction_confidence : undefined,
            sourceExcerpt: segment.source_excerpt ?? "",
          })),
      })),
    });
  }

  async function save(state: WorkspaceState): Promise<WorkspaceState> {
    workspaceStateSchema.parse(state);

    for (const bulletin of state.bulletins) {
      const { error } = await supabase.from("bulletins").upsert({
        id: bulletin.id,
        week_start: WEEK_START,
        title: bulletin.title,
        body: bulletin.body,
        scope: scopeToDatabase[bulletin.scope] ?? "all",
        scope_program_id: null,
        active: true,
        created_by: userId,
      });
      assertNoError(error, "No se pudo guardar una indicación");
    }

    for (const importantDate of state.importantDates) {
      const { error: dateError } = await supabase.from("important_dates").upsert({
        id: importantDate.id,
        event_date: importantDate.date,
        title: importantDate.title,
        details: importantDate.details,
        created_by: userId,
      });
      assertNoError(dateError, "No se pudo guardar una fecha importante");

      const { error: deletePlansError } = await supabase
        .from("important_date_plans")
        .delete()
        .eq("important_date_id", importantDate.id);
      assertNoError(deletePlansError, "No se pudieron actualizar los planes del día");

      const plans = Object.entries(importantDate.plans)
        .filter(([, notes]) => notes.trim())
        .map(([programId, notes]) => ({
          important_date_id: importantDate.id,
          program_id: programId,
          notes,
          planned: true,
        }));
      if (plans.length) {
        const { error: plansError } = await supabase.from("important_date_plans").insert(plans);
        assertNoError(plansError, "No se pudieron guardar los planes del día");
      }
    }

    for (const emission of state.emissions) {
      const { data: savedEmission, error: emissionError } = await supabase
        .from("emissions")
        .upsert({
          program_id: emission.programId,
          emission_date: emission.date,
          status: emission.status,
          raw_text: emission.rawText,
          producer_id: userId,
        }, { onConflict: "program_id,emission_date" })
        .select("id")
        .single();
      assertNoError(emissionError, "No se pudo guardar la pauta");
      if (!savedEmission) throw new Error("Supabase no devolvió la pauta guardada.");

      const { error: deleteSegmentsError } = await supabase
        .from("segments")
        .delete()
        .eq("emission_id", savedEmission.id);
      assertNoError(deleteSegmentsError, "No se pudieron actualizar los segmentos");

      if (emission.segments.length) {
        const { error: segmentsError } = await supabase.from("segments").insert(
          emission.segments.map((segment, index) => ({
            emission_id: savedEmission.id,
            sort_order: index,
            planned_start: segment.startTime || null,
            planned_end: segment.endTime || null,
            segment_type: segment.type,
            sequence_name: segment.sequence || null,
            slug: segment.title || "Segmento",
            topic: segment.topic || null,
            focus: segment.focus || null,
            guest_text: segment.guest || null,
            guest_role: segment.guestRole || null,
            audience_question: segment.audienceQuestion || null,
            production_cues: segment.productionCues ?? [],
            notes: segment.notes,
            extraction_confidence: segment.confidence ?? null,
            source_excerpt: segment.sourceExcerpt || null,
          })),
        );
        assertNoError(segmentsError, "No se pudieron guardar los segmentos");
      }
    }

    return load();
  }

  async function confirmImport(importId: string): Promise<void> {
    const { error } = await supabase
      .from("raw_imports")
      .update({ processing_status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", importId);
    assertNoError(error, "No se pudo confirmar la importación");
  }

  return { mode: "supabase", load, save, confirmImport };
}
