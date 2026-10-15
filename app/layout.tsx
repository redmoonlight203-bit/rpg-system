import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const sansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans-kr",
  display: "swap",
});

const serifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif-kr",
  display: "swap",
});

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