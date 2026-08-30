import { describe, expect, it } from "vitest";
import { segmentParticipants, withParticipantCompatibility } from "./editorial-participants";
import type { Segment } from "./schemas";

const base: Segment = { id: "segment-1", startTime: "10:00", endTime: "10:15", type: "interview", title: "Entrevista", guest: "Erika Alvarez", guestRole: "Psicóloga", notes: "" };

describe("participantes editoriales", () => {
  it("convierte el invitado histórico sin perder compatibilidad", () => {
    expect(segmentParticipants(base)).toMatchObject([{ name: "Erika Alvarez", role: "guest", roleDescription: "Psicóloga" }]);
  });

  it("admite varias personas y conserva al primer invitado como campo legado", () => {
    const segment = withParticipantCompatibility({
      ...base,
      participants: [
        { id: "p1", name: "Erika Alvarez", role: "guest", roleDescription: "Psicóloga", organization: "", sourceExcerpt: "INVITADA: Erika Alvarez" },
        { id: "p2", name: "Arturo Goga", role: "specialist", roleDescription: "Tecnología", organization: "RPP", sourceExcerpt: "ESPECIALISTA: Arturo Goga" },
      ],
    });
    expect(segment.participants).toHaveLength(2);
    expect(segment.guest).toBe("Erika Alvarez");
    expect(segment.guestRole).toBe("Psicóloga");
  });
});
