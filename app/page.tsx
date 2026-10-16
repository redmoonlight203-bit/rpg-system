"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [verificando] = useState(true);

  useEffect(() => {
    const verificarSesion = async () => {
      // Obtener la sesión activa del navegador
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // No hay sesión guardada -> al Login
        router.push("/login");
        return;
      }

      // Si hay sesión, verificamos el rol
      const userId = session.user.id;
      
      const { data: perfil, error } = await supabase
        .from("perfiles")
        .select("rol, estado")
        .eq("id", userId)
        .single();

      if (error || !perfil) {
        // Si hay error al leer el perfil, obligamos a cerrar sesión y volver al login
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      // Si es reencarnado pero no está aprobado (por si se logueó y luego le quitaste el permiso)
      if (perfil.rol === "REENCARNADO" && perfil.estado !== "aprobado") {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      // Redirección inteligente
      if (perfil.rol === "KUROI") {
        router.push("/dm/panel");
      } else {
        router.push("/ficha");
      }
    };

    verificarSesion();
  }, [router]);

  // Pantalla de carga mientras lee el localStorage
  if (verificando) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-red-700 border-t-red-500 rounded-full animate-spin glow-blood" />
        <p className="text-red-600 font-mono text-xs tracking-widest uppercase animate-pulse">
          Sincronizando con el Nexo...
        </p>
      </div>
    );
  }

  return null;
}