"use client";

import { useMemo, useState } from "react";
import { slotAppliesOnDate } from "@/domain/editorial-calendar";
import type { Emission, ImportantDate, Program, ScheduleSlot } from "@/domain/schemas";

type AnnualCalendarProps = {
  emissions: Emission[];
  importantDates: ImportantDate[];
  programs: Program[];
  scheduleSlots: ScheduleSlot[];
  initialDate: string;
  canEdit: boolean;
  onClose: () => void;
  onCreateImportantDate: (date: string) => void;
  onEditImportantDate: (item: ImportantDate) => void;
  onOpenProgram: (date: string, slotId: string) => void;
};

function isoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00`).getDay();
}

export function AnnualCalendar({ emissions, importantDates, programs, scheduleSlots, initialDate, canEdit, onClose, onCreateImportantDate, onEditImportantDate, onOpenProgram }: AnnualCalendarProps) {
  const initial = new Date(`${initialDate}T12:00:00`);
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear] = useState(initial.getFullYear());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const dates = useMemo(() => {
    const first = new Date(year, month, 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const value = isoDate(date);
      return {
        value,
        day: date.getDate(),
        outside: date.getMonth() !== month,
        emissions: emissions.filter((emission) => emission.date === value).length,
        important: importantDates.filter((item) => item.date === value),
      };
    });
  }, [emissions, importantDates, month, year]);
  const selectedImportantDates = useMemo(() => importantDates.filter((item) => item.date === selectedDate), [importantDates, selectedDate]);
  const selectedSlots = useMemo(() => scheduleSlots
    .filter((slot) => slot.dayOfWeek === dayOfWeek(selectedDate) && slotAppliesOnDate(slot, selectedDate))
    .sort((left, right) => left.startTime.localeCompare(right.startTime)), [scheduleSlots, selectedDate]);

  function moveMonth(amount: number) {
    const next = new Date(year, month + amount, 1, 12);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  }

  function chooseDate(date: string) {
    setSelectedDate(date);
    const next = new Date(`${date}T12:00:00`);
    if (next.getMonth() !== month || next.getFullYear() !== year) {
      setMonth(next.getMonth());
      setYear(next.getFullYear());
    }
  }

  function chooseOrCreateDate(date: string, eventCount: number) {
    if (date === selectedDate && eventCount === 0 && canEdit) {
      onCreateImportantDate(date);
      return;
    }
    chooseDate(date);
  }

  const selectedDateLabel = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${selectedDate}T12:00:00`));

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal annual-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="annual-calendar-title">
        <header><div><span>Planificación anual</span><h2 id="annual-calendar-title">Calendario editorial</h2></div><button onClick={onClose}>Cerrar</button></header>
        <div className="annual-calendar-layout">
          <div className="annual-calendar-main">
            <div className="annual-calendar-toolbar"><button onClick={() => moveMonth(-1)}>Anterior</button><strong>{new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month, 1))}</strong><button onClick={() => moveMonth(1)}>Siguiente</button></div>
            <div className="annual-weekdays">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="annual-grid">
              {dates.map((date) => <article key={date.value} className={`${date.outside ? "outside" : ""} ${date.value === selectedDate ? "selected" : ""} ${date.important.some((item) => item.category === "holiday") ? "has-holiday" : ""}`}>
                <button className="annual-day-button" onClick={() => chooseOrCreateDate(date.value, date.important.length)} aria-label={date.value === selectedDate && date.important.length === 0 && canEdit ? `Añadir evento el ${date.value}` : `Abrir ${date.value}`}><time>{date.day}</time>{date.emissions > 0 && <small>{date.emissions} pauta{date.emissions === 1 ? "" : "s"}</small>}</button>
                <div className="annual-day-events">{date.important.slice(0, 2).map((item) => <button className={item.category === "holiday" ? "holiday" : ""} key={item.id} onClick={() => { chooseDate(date.value); onEditImportantDate(item); }}>{item.title}</button>)}{date.important.length > 2 && <button onClick={() => chooseDate(date.value)}>+{date.important.length - 2} más</button>}{date.value === selectedDate && date.important.length === 0 && canEdit && <button className="add-event" onClick={() => onCreateImportantDate(date.value)}>+ Añadir evento</button>}</div>
              </article>)}
            </div>
          </div>
          <aside className="annual-day-panel" key={selectedDate} aria-label={`Planificación de ${selectedDateLabel}`}>
            <header><div><span>Día seleccionado</span><h3>{selectedDateLabel}</h3></div><button className="primary" disabled={!canEdit} onClick={() => onCreateImportantDate(selectedDate)}>Añadir evento</button></header>
            <section className="annual-day-section"><div className="annual-day-section-heading"><strong>Eventos del día</strong><span>{selectedImportantDates.length}</span></div><div className="annual-event-list">{selectedImportantDates.map((item) => <button key={item.id} onClick={() => onEditImportantDate(item)}><span><b>{item.category === "holiday" ? "Feriado" : "Editorial"}</b><strong>{item.title}</strong><small>{item.details || "Sin contexto añadido"}</small></span><em>Editar evento</em></button>)}{!selectedImportantDates.length && <div className="annual-event-empty"><strong>Este día está libre</strong><p>Vuelve a tocar el día seleccionado o crea el primer evento desde aquí.</p><button disabled={!canEdit} onClick={() => onCreateImportantDate(selectedDate)}>Crear evento</button></div>}</div></section>
            <section className="annual-day-section"><div className="annual-day-section-heading"><strong>Programación del día</strong><span>{selectedSlots.length}</span></div><div className="annual-program-list">{selectedSlots.map((slot) => { const program = programs.find((item) => item.id === slot.programId); const emission = emissions.find((item) => item.programId === slot.programId && item.date === selectedDate); if (!program) return null; return <article key={slot.id}><time>{slot.startTime}</time><span><strong>{program.shortName}</strong><small>{emission?.segments.length ? `${emission.segments.length} bloques` : "Sin pauta"}</small></span>{program.managed && <button onClick={() => onOpenProgram(selectedDate, slot.id)}>Abrir programa</button>}</article>; })}</div></section>
          </aside>
        </div>
        <footer><span>Selecciona un día para revisarlo. Si está vacío, vuelve a tocarlo para crear un evento.</span><button onClick={() => chooseDate(isoDate(new Date()))}>Ir a hoy</button></footer>
      </section>
    </div>
  );
}
