import type { ImportantDate, ScheduleSlot } from "./schemas";

export function isoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(date);
}

export function todayInLima(): string {
  return isoDate(new Date());
}

export function mondayForDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + offset);
  return isoDate(date);
}

export function weekDaysFor(value: string) {
  const monday = new Date(`${mondayForDate(value)}T12:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateValue = isoDate(date);
    const weekday = new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(date).replaceAll(".", "");
    return { label: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`, date: dateValue, dayOfWeek: date.getDay() };
  });
}

export function weekTitle(value: string): string {
  const days = weekDaysFor(value);
  const first = new Date(`${days[0].date}T12:00:00`);
  const last = new Date(`${days[6].date}T12:00:00`);
  const firstLabel = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: first.getMonth() === last.getMonth() ? undefined : "short" }).format(first).replaceAll(".", "");
  const lastLabel = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric" }).format(last);
  return `Semana del ${firstLabel} al ${lastLabel}`;
}

export function slotAppliesOnDate(slot: ScheduleSlot, date: string): boolean {
  if (date < slot.effectiveFrom) return false;
  if (slot.effectiveTo && date > slot.effectiveTo) return false;
  return slot.active || Boolean(slot.effectiveTo);
}

export function importantDateVisibleToProgram(item: ImportantDate, programId?: string): boolean {
  if (!programId) return true;
  const assignedPrograms = Object.entries(item.plans).filter(([, notes]) => notes.trim()).map(([id]) => id);
  return assignedPrograms.length === 0 || assignedPrograms.includes(programId);
}
