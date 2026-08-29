import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pauta RPP",
  description: "Planificación editorial de los programas informativos de RPP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
