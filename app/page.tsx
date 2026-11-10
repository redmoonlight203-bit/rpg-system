"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoYugen from "../components/LogoYugen";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

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
        router.replace("/dm/forja");
      } else {
        router.push("/ficha");
      }
    };

    verificarSesion();
  }, [router]);

  // Pantalla de carga mientras lee el localStorage
  if (verificando) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4">
        <LogoYugen size={144} preload/>
        <p className="text-text-muted text-sm">
          Conectando con el Nexo…
        </p>
      </div>
    );
  }

  return null;
}