"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PanelRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirige automáticamente al nuevo Lobby Principal (El Tablero)
    router.replace("/dm/tablero");
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">
      Entrando al Tablero de Kuroi...
    </div>
  );
}