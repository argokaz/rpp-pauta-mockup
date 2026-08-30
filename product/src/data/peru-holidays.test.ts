import { describe, expect, it } from "vitest";
import { peruNationalHolidays2026 } from "./peru-holidays";

describe("feriados nacionales de Perú 2026", () => {
  it("incluye los 16 feriados oficiales sin fechas duplicadas", () => {
    expect(peruNationalHolidays2026).toHaveLength(16);
    expect(new Set(peruNationalHolidays2026.map((item) => item.date)).size).toBe(16);
    expect(peruNationalHolidays2026.every((item) => item.category === "holiday" && item.sourceUrl === "https://www.gob.pe/feriados")).toBe(true);
  });

  it("incluye Semana Santa, Fiestas Patrias y Navidad en sus fechas de 2026", () => {
    expect(peruNationalHolidays2026.map(({ date, title }) => `${date}:${title}`)).toEqual(expect.arrayContaining([
      "2026-04-02:Jueves Santo",
      "2026-04-03:Viernes Santo",
      "2026-07-28:Fiestas Patrias",
      "2026-07-29:Fiestas Patrias",
      "2026-12-25:Navidad",
    ]));
  });
});
