"use client";

import { useState } from "react";
import type { Emission, Program, ScheduleSlot } from "@/domain/schemas";

export function EditorialHome({ dateLabel, date, nowMinutes, slots, programs, emissions, canEdit, noticeCount, onOpen, onReceive, onNotice, onAgenda, onDesk, onHelp }: {
  dateLabel: string; date: string; nowMinutes: number | null; slots: ScheduleSlot[]; programs: Program[]; emissions: Emission[]; canEdit: boolean; noticeCount: number;
  onOpen: (slot: ScheduleSlot, post: boolean) => void; onReceive: () => void; onNotice: () => void; onAgenda: () => void; onDesk: () => void; onHelp: () => void;
}) {
  const [onlyPending, setOnlyPending] = useState(false);
  const items = slots.filter((slot) => programs.find((program) => program.id === slot.programId)?.managed).map((slot) => {
    const program = programs.find((item) => item.id === slot.programId)!;
    const emission = emissions.find((item) => item.programId === slot.programId && item.date === date);
    const start = Number(slot.startTime.slice(0, 2)) * 60 + Number(slot.startTime.slice(3, 5));
    const end = slot.endTime === "00:00" ? 1440 : Number(slot.endTime.slice(0, 2)) * 60 + Number(slot.endTime.slice(3, 5));
    const live = nowMinutes !== null && nowMinutes >= start && nowMinutes < end;
    const post = emission?.status === "post" || (nowMinutes !== null && nowMinutes >= end && Boolean(emission?.segments.length));
    const pending = emission?.postPauta?.reviewStatus !== "verified" && (post || !emission || emission.status !== "ready");
    const state = live ? "Al aire" : emission?.postPauta?.reviewStatus === "verified" ? "Cerrada" : post ? "Revisar emisión" : emission?.status === "ready" ? "Lista" : emission?.segments.length ? "En preparación" : "Falta pauta";
    return { slot, program, emission, live, post, pending, state };
  }).sort((a, b) => Number(b.live) - Number(a.live) || a.slot.startTime.localeCompare(b.slot.startTime));
  const pendingCount = items.filter((item) => item.pending).length;
  return <section className="editorial-home">
    <header><div><span>Coordinación editorial · {dateLabel}</span><h1>El trabajo de hoy</h1><p>Revisa qué falta y entra directamente al programa que necesita atención.</p></div><button onClick={onHelp}>Guía rápida</button></header>
    <div className="home-actions"><button className="primary" onClick={() => setOnlyPending(true)}><strong>{pendingCount} pendientes</strong><span>Ver qué necesita atención</span></button><button disabled={!canEdit} onClick={onReceive}><strong>Pegar pauta recibida</strong><span>Asignarla a un programa</span></button><button disabled={!canEdit} onClick={onNotice}><strong>Dar una indicación</strong><span>{noticeCount} publicadas esta semana</span></button></div>
    <section className="home-programs"><header><h2>{onlyPending ? "Pendientes de hoy" : "Programas de hoy"}</h2><div><button aria-pressed={onlyPending} onClick={() => setOnlyPending(!onlyPending)}>{onlyPending ? "Ver todos" : "Solo pendientes"}</button><button onClick={onDesk}>Ver por estado</button></div></header>
      {items.filter((item) => !onlyPending || item.pending).map(({ slot, program, emission, live, post, state }) => <article key={slot.id} className={live ? "is-live" : ""}><time>{slot.startTime}<small>{slot.endTime}</small></time><div><h3>{program.shortName}</h3><p>{emission?.producerName || "Sin responsable registrado"}{emission?.segments.length ? ` · ${emission.segments.length} bloques` : ""}</p></div><span className="home-state" data-status={live ? "live" : post ? "post" : emission?.status ?? "empty"}>{state}</span><button onClick={() => onOpen(slot, post)}>{post ? "Revisar post-pauta" : emission?.segments.length ? "Abrir pauta" : "Preparar pauta"}</button></article>)}
      {(!items.length || (onlyPending && !pendingCount)) && <p className="home-empty">{items.length ? "No hay pendientes en los programas de hoy." : "No hay programas administrados para hoy. Consulta otra fecha en Agenda."}</p>}
    </section>
    <footer><p>Para planificar otras fechas o revisar toda la señal:</p><button onClick={onAgenda}>Abrir agenda semanal</button></footer>
  </section>;
}
