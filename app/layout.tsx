import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./mobile.css";

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

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#090a08" };

export const metadata: Metadata = {
  title: "Yugen Realm | Nexus System",
  description: "Plataforma de Control para Kuroi y Reencarnados",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`dark ${sansKr.variable} ${serifKr.variable}`}>
      <body className="bg-black text-neutral-200 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}