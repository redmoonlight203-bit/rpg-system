import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}