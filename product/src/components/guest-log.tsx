"use client";

import { useMemo, useState } from "react";
import { mondayForDate } from "@/domain/editorial-calendar";
import { bookingMatchesQuery, guestOverlaps, type GuestBooking } from "@/domain/editorial-desk";

type GuestLogProps = {
  bookings: GuestBooking[];
  referenceDate: string;
  onOpenBooking: (booking: GuestBooking) => void;
  onOpenPerson: (booking: GuestBooking) => void;
  onOpenDirectory: () => void;
  onOpenArchive: () => void;
};

type GuestRange = "upcoming" | "week" | "month" | "all";

const outcomeLabel: Record<GuestBooking["outcome"], string> = {
  planned: "En pauta",
  aired: "Salió al aire",
  skipped: "No salió",
};

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return new Intl.DateTimeFormat("en-CA").format(shifted);
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`)).replaceAll(".", "");
}

export function GuestLog({ bookings, referenceDate, onOpenBooking, onOpenPerson, onOpenDirectory, onOpenArchive }: GuestLogProps) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<GuestRange>("week");

  const visible = useMemo(() => {
    const weekStart = mondayForDate(referenceDate);
    const from = range === "upcoming" ? referenceDate : range === "week" ? weekStart : range === "month" ? shiftDate(referenceDate, -30) : "";
    const to = range === "week" ? shiftDate(weekStart, 6) : range === "month" ? referenceDate : "9999-12-31";
    return bookings
      .filter((booking) => booking.date >= from && booking.date <= to)
      .filter((booking) => bookingMatchesQuery(booking, query));
  }, [bookings, query, range, referenceDate]);
  const overlaps = useMemo(() => guestOverlaps(visible).filter((overlap) => overlap.date >= referenceDate), [referenceDate, visible]);
  const uniquePeople = new Set(visible.map((booking) => booking.personKey)).size;

  return (
    <section className="guest-log" aria-label="Registro de invitados">
      <header className="guest-log-toolbar">
        <label><span>Buscar persona, programa, tema o lo que dijo</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Erika Álvarez, Conexión, elecciones" /></label>
        <div className="guest-log-range" role="group" aria-label="Periodo">
          {([["week", "Esta semana"], ["upcoming", "Próximos"], ["month", "Últimos 30 días"], ["all", "Todo"]] as const).map(([value, label]) => (
            <button key={value} className={range === value ? "active" : ""} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>
          ))}
        </div>
        <div className="guest-log-links"><button onClick={onOpenDirectory}>Fichas y contactos</button><button onClick={onOpenArchive}>Buscar en archivo</button></div>
      </header>

      {overlaps.length > 0 && (
        <div className="guest-log-alerts" role="status">
          {overlaps.map((overlap) => (
            <p key={`${overlap.date}-${overlap.personKey}`}><b>Invitado repetido</b><span><strong>{overlap.name}</strong> está en {overlap.bookings.map((booking) => `${booking.programName} (${booking.startTime})`).join(" y ")} el {shortDate(overlap.date)}.</span></p>
          ))}
        </div>
      )}

      <p className="guest-log-summary">{visible.length} {visible.length === 1 ? "invitación" : "invitaciones"} · {uniquePeople} {uniquePeople === 1 ? "persona" : "personas"}</p>

      <div className="guest-log-table" role="table" aria-label="Invitaciones">
        <div className="guest-log-row guest-log-head" role="row">
          <span role="columnheader">Fecha</span><span role="columnheader">Invitado</span><span role="columnheader">Programa y bloque</span><span role="columnheader">Resultado</span>
        </div>
        {visible.map((booking) => (
          <div className="guest-log-row" role="row" key={booking.key}>
            <span role="cell"><time>{shortDate(booking.date)}</time><small>{booking.startTime}</small></span>
            <span role="cell"><button className="guest-log-person" onClick={() => onOpenPerson(booking)}>{booking.name}</button><small>{booking.roleDescription || "Cargo por completar"}</small></span>
            <span role="cell"><button className="guest-log-program" onClick={() => onOpenBooking(booking)}>{booking.programName}</button><small>{booking.segmentTitle}{booking.topic ? ` · ${booking.topic}` : ""}</small></span>
            <span role="cell"><b data-outcome={booking.outcome}>{outcomeLabel[booking.outcome]}</b>{booking.postSummary && <small>{booking.postSummary}</small>}</span>
          </div>
        ))}
        {!visible.length && <div className="empty-state compact"><strong>No hay invitaciones en este periodo</strong><p>Cambia el periodo o la búsqueda. Las invitaciones aparecen cuando un bloque tiene un INVITADO o ESPECIALISTA.</p></div>}
      </div>
    </section>
  );
}
