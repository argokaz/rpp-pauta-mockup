"use client";

import { useEffect, useRef } from "react";
import type { Emission, Program } from "@/domain/schemas";

export function DemoGuide({ emissions, programs, today, onOpen, onClose, onNotice }: {
  emissions: Emission[]; programs: Program[]; today: string;
  onOpen: (emission: Emission, post: boolean) => void; onClose: () => void; onNotice?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const filled = emissions.filter((item) => item.segments.length > 0).sort((a, b) => Number(b.date === today) - Number(a.date === today) || b.date.localeCompare(a.date));
  const empty = emissions.filter((item) => !item.segments.length).sort((a, b) => Number(a.date < today) - Number(b.date < today) || a.date.localeCompare(b.date));
  const post = filled.find((item) => item.status === "post") ?? filled[0];
  const label = (emission: Emission) => `${programs.find((item) => item.id === emission.programId)?.shortName ?? "Programa"} · ${new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${emission.date}T12:00:00`))}`;
  return <dialog ref={dialog} className="demo-guide" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }} aria-labelledby="demo-guide-title">
    <header><div><span>Práctica de la semana actual</span><h2 id="demo-guide-title">Tu demo está lista</h2></div><button autoFocus onClick={onClose} aria-label="Cerrar guía demo">Cerrar</button></header>
    <p>La fecha y los estados de los ejemplos se preparan según el momento de activación en Lima. Todo lo que guardes aquí es una prueba local; tus pautas reales permanecen en Trabajo real.</p>
    <div className="demo-guide-content">
      <section><h3>Ya hay información para explorar</h3><p>{filled.length} pautas con bloques, invitados y temas. Las emisiones pasadas incluyen resultados y resúmenes con algunos pendientes para completar.</p><ul>{filled.slice(0, 4).map((emission) => <li key={emission.id}>{label(emission)}</li>)}</ul>{filled[0] && <button onClick={() => onOpen(filled[0], false)}>Explorar una pauta llena</button>}</section>
      <section><h3>Esto puedes probar tú</h3><ul><li>Pegar una prepauta, revisar la propuesta y guardar los bloques.</li><li>Cambiar títulos, horarios y participantes.</li><li>Marcar entrada y salida; completar un resumen y cerrar la post-pauta.</li>{onNotice && <li>Crear indicaciones y eventos; comprobar cómo los recibe Producción.</li>}</ul>{empty[0] ? <><p><strong>Para empezar desde cero:</strong> {label(empty[0])}</p><button className="primary" onClick={() => onOpen(empty[0], false)}>Crear una pauta de prueba</button></> : <p>Puedes añadir un bloque o preparar otra fecha desde tu programa.</p>}{post && <button onClick={() => onOpen(post, true)}>Practicar la post-pauta</button>}{onNotice && <button onClick={onNotice}>Crear una indicación de prueba</button>}</section>
    </div>
    <footer><p>Las pruebas se conservan en este navegador. Puedes volver a esta guía o reiniciar el demo. El demo usa lectura local del texto; las integraciones de IA, video y accesos reales se usan desde Trabajo real.</p><button className="primary" onClick={onClose}>Empezar a explorar</button></footer>
  </dialog>;
}
