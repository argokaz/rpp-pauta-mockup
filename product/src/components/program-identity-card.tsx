import type { CSSProperties } from "react";
import type { Program } from "@/domain/schemas";
import { normalizePersonName } from "@/domain/people-history";

type ProgramIdentityCardProps = {
  program: Program;
  detectedHosts?: string[];
};

function fixedHostNames(program: Program): string[] {
  return program.hosts
    .split(/,|\by\b|&/i)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function ProgramIdentityCard({ program, detectedHosts = [] }: ProgramIdentityCardProps) {
  const fixedNames = fixedHostNames(program).map(normalizePersonName);
  const possibleReplacements = detectedHosts.filter((name) => !fixedNames.includes(normalizePersonName(name)));

  return (
    <section className="program-identity-card" style={{ "--program-accent": program.accentColor } as CSSProperties} aria-label={`Información de ${program.shortName}`}>
      <div className="program-identity-accent" aria-hidden="true" />
      <div className="program-identity-main">
        <span>Información del programa</span>
        <strong>{program.shortName}</strong>
        <p><b>Conducción habitual</b>{program.hosts || "Por confirmar"}</p>
      </div>
      {possibleReplacements.length ? <div className="program-host-exception"><span>Posible reemplazo detectado</span><strong>{possibleReplacements.join(", ")}</strong><small>Confirma el cambio antes de aceptar la pauta.</small></div> : <small className="program-identity-help">En los bloques solo registra a quien reemplace la conducción habitual.</small>}
    </section>
  );
}
