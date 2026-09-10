"use client";

import { useState, type ComponentProps } from "react";
import { WorkspaceApp } from "./workspace-app";
import { createPracticeRepository } from "@/data/practice-workspace";

type Props = ComponentProps<typeof WorkspaceApp>;

export function WorkspaceSession(props: Props) {
  const [practice, setPractice] = useState<ReturnType<typeof createPracticeRepository> | null>(null);
  const [active, setActive] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");

  async function start(reset = false) {
    try {
      const structure = props.initialWorkspace ?? await props.repository.load();
      const next = createPracticeRepository(structure, window.localStorage, `${props.appRole}:${props.accountName ?? props.accountLabel}:${props.producerProgramIds?.join(",") ?? "all"}`, new Date(), reset);
      setPractice(next);
      setRevision((value) => value + 1);
      setActive(true);
      setError("");
    } catch { setError("No se pudo abrir el demo. Comprueba que el navegador permita guardar las pruebas e inténtalo otra vez."); }
  }

  return <>
    {error && <div className="session-error" role="alert">{error}<button onClick={() => setError("")}>Cerrar</button></div>}
    <div hidden={active}><WorkspaceApp {...props} onToggleDemo={() => void start()} /></div>
    {practice && active && <WorkspaceApp {...props} key={revision} repository={practice.repository} initialWorkspace={practice.workspace} getAccessToken={undefined} demoMode onToggleDemo={() => setActive(false)} onResetDemo={() => void start(true)} />}
  </>;
}
