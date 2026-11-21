import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./mobile.css";
import "./yugen-design.css";
import "./yugen-juego.css";
import "./yugen-botin.css";

const sansKr = localFont({
  src: "../public/fonts/NotoSansKR-latin.ttf",
  weight: "100 900",
  variable: "--font-sans-kr",
  display: "swap",
});

const serifKr = localFont({
  src: "../public/fonts/NotoSerifKR-latin.ttf",
  weight: "200 900",
  variable: "--font-serif-kr",
  display: "swap",
});

const cinzel = localFont({src: "../public/fonts/Cinzel-latin.woff2", weight: "400 900", variable: "--font-cinzel", display: "swap"});

const kanji = localFont({src: "../public/fonts/kanji-yugen.woff2", variable: "--font-kanji-src", display: "swap"});

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#14121f" };

export const metadata: Metadata = {
  title: "YUGEN | El dominio de Kuroi",
  icons: { icon: "/brand/yugen-kuroi.png", apple: "/brand/yugen-kuroi.png" },
  description: "Plataforma de Control para Kuroi y Reencarnados",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`dark ${sansKr.variable} ${serifKr.variable} ${kanji.variable} ${cinzel.variable}`}>
      <body className="bg-canvas text-text antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}