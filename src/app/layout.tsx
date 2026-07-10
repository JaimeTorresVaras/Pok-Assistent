import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Fuente pixel para títulos y etiquetas (estética retro de juego). */
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Champions EV AI",
  description:
    "Asistente de EVs para Pokémon Champions (VGC dobles): elige tu equipo y recibe spreads, ítems y movimientos optimizados contra el meta, con benchmarks verificados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} h-full antialiased`}
    >
      {/* En escritorio la app ocupa la ventana y solo el chat scrollea. */}
      <body className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">{children}</body>
    </html>
  );
}
