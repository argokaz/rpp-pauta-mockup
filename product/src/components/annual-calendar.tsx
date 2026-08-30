"use client";

import { useMemo, useState } from "react";
import type { Emission, ImportantDate } from "@/domain/schemas";

type AnnualCalendarProps = {
  emissions: Emission[];
  importantDates: ImportantDate[];
  initialDate: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
};

function isoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

export function AnnualCalendar({ emissions, importantDates, initialDate, onClose, onSelectDate }: AnnualCalendarProps) {
  const initial = new Date(`${initialDate}T12:00:00`);
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear] = useState(initial.getFullYear());
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

  function moveMonth(amount: number) {
    const next = new Date(year, month + amount, 1, 12);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal annual-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="annual-calendar-title">
        <header><div><span>Planificación anual</span><h2 id="annual-calendar-title">Calendario editorial</h2></div><button onClick={onClose}>Cerrar</button></header>
        <div className="annual-calendar-toolbar">
          <button onClick={() => moveMonth(-1)}>Anterior</button>
          <strong>{new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month, 1))}</strong>
          <button onClick={() => moveMonth(1)}>Siguiente</button>
        </div>
        <div className="annual-weekdays">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="annual-grid">
          {dates.map((date) => <button key={date.value} className={`${date.outside ? "outside" : ""} ${date.value === initialDate ? "selected" : ""} ${date.important.some((item) => item.category === "holiday") ? "has-holiday" : ""}`} onClick={() => onSelectDate(date.value)}>
            <time>{date.day}</time>
            {date.important.slice(0, 2).map((item) => <strong className={item.category === "holiday" ? "holiday" : ""} key={item.id}>{item.title}</strong>)}
            {date.emissions > 0 && <small>{date.emissions} pauta{date.emissions === 1 ? "" : "s"}</small>}
          </button>)}
        </div>
        <footer><span>Incluye los 16 feriados nacionales de 2026 y las fechas editoriales del equipo.</span><button onClick={() => { const today = isoDate(new Date()); const next = new Date(`${today}T12:00:00`); setMonth(next.getMonth()); setYear(next.getFullYear()); }}>Ir a hoy</button></footer>
      </section>
    </div>
  );
}
