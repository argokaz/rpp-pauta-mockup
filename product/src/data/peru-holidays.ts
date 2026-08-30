import type { ImportantDate } from "@/domain/schemas";

const OFFICIAL_SOURCE = "https://www.gob.pe/feriados";

const holidays: Array<[string, string]> = [
  ["2026-01-01", "Año Nuevo"],
  ["2026-04-02", "Jueves Santo"],
  ["2026-04-03", "Viernes Santo"],
  ["2026-05-01", "Día del Trabajo"],
  ["2026-06-07", "Batalla de Arica y Día de la Bandera"],
  ["2026-06-29", "Día de San Pedro y San Pablo"],
  ["2026-07-23", "Día de la Fuerza Aérea del Perú"],
  ["2026-07-28", "Fiestas Patrias"],
  ["2026-07-29", "Fiestas Patrias"],
  ["2026-08-06", "Batalla de Junín"],
  ["2026-08-30", "Santa Rosa de Lima"],
  ["2026-10-08", "Combate de Angamos"],
  ["2026-11-01", "Día de Todos los Santos"],
  ["2026-12-08", "Inmaculada Concepción"],
  ["2026-12-09", "Batalla de Ayacucho"],
  ["2026-12-25", "Navidad"],
];

export const peruNationalHolidays2026: ImportantDate[] = holidays.map(([date, title], index) => ({
  id: `holiday-2026-${String(index + 1).padStart(2, "0")}`,
  date,
  title,
  details: "Feriado nacional del calendario oficial peruano. Define con anticipación el enfoque y la cobertura de cada programa.",
  plans: {},
  category: "holiday",
  sourceUrl: OFFICIAL_SOURCE,
}));
