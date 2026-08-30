import { describe, expect, it } from "vitest";
import { whatsappLink } from "./contact-links";

describe("whatsappLink", () => {
  it("añade el código de Perú a un celular local", () => {
    expect(whatsappLink("999 888 777")).toBe("https://wa.me/51999888777");
  });

  it("conserva un número internacional y elimina símbolos", () => {
    expect(whatsappLink("+51 999-888-777")).toBe("https://wa.me/51999888777");
    expect(whatsappLink("0054 11 5555 4444")).toBe("https://wa.me/541155554444");
  });

  it("rechaza teléfonos incompletos", () => {
    expect(whatsappLink("212-4100")).toBeNull();
  });
});
