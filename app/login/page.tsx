"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import { Shield, KeyRound, Mail, UserPlus, LogIn, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [usarImagenLogo, setUsarImagenLogo] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setErrorMsg("");

    try {
      if (esRegistro) {
        // Bloqueo preventivo en la UI si intentan registrar el correo de Kuroi manualmente
        const esKuroi = email.trim().toLowerCase() === "randolphcta@gmail.com";
        const rolFinal = esKuroi ? "KUROI" : "REENCARNADO";

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              rol: rolFinal,
              estado: esKuroi ? "aprobado" : "pendiente",
            },
          },
        });

        if (error) throw error;

        if (esKuroi) {
          alert("Cuenta de Kuroi creada y aprobada con éxito. Ya puedes iniciar sesión.");
        } else {
          alert("Tu alma ha sido registrada. Está en estado PENDIENTE hasta que Kuroi apruebe tu acceso.");
        }
        setEsRegistro(false);
      } else {
        // Inicio de sesión
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const userId = data.user.id;

        // Consultar el perfil y estado de la cuenta
        const { data: perfil, error: perfilError } = await supabase
          .from("perfiles")
          .select("rol, estado")
          .eq("id", userId)
          .single();

        if (perfilError) throw perfilError;

        // Validar aprobación si es Reencarnado
        if (perfil.rol === "REENCARNADO" && perfil.estado !== "aprobado") {
          await supabase.auth.signOut();
          setErrorMsg("Tu alma está en el limbo. Kuroi aún no ha aprobado tu entrada al mundo.");
          setCargando(false);
          return;
        }

        // Redirección según rol
        if (perfil.rol === "KUROI") {
          router.push("/dm/panel");
        } else {
          router.push("/ficha");
        }
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Error de conexión con el Abismo"
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-neutral-200 flex items-center justify-center p-4 relative overflow-hidden font-serif kr-ambient">

      <div className="kr-panel bg-neutral-950/90 p-8 md:p-10 max-w-md w-full glow-blood relative z-10 space-y-7">

        <div className="text-center space-y-4">
          <div className="inline-flex p-3.5 bg-red-950/50 border border-amber-500/50 text-red-500 glow-blood-sm">
            {usarImagenLogo ? (
              <Image
                src="/icons/logo.png"
                alt="Logo"
                width={36}
                height={36}
                onError={() => setUsarImagenLogo(false)}
                className="object-contain"
              />
            ) : (
              <Shield className="w-8 h-8 text-red-500" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-neutral-100 tracking-[0.25em] uppercase font-mono">
              Yugen Realm
            </h1>
            <p className="text-amber-500 text-[11px] font-mono tracking-[0.3em]">
              {esRegistro ? "[ REGISTRO DE REENCARNADO ]" : "[ RITUAL DE ENTRADA ]"}
            </p>
          </div>
          <div className="kr-divider" />
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-700 text-red-200 text-xs p-3 text-center font-mono leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">

          {esRegistro && (
            <div className="bg-neutral-900/80 border border-amber-500/20 p-3 text-xs text-neutral-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Toda alma nueva entra en estado <strong className="text-amber-300">Pendiente</strong> hasta ser juzgada por Kuroi.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-amber-600 uppercase tracking-[0.2em]">Correo / Alma</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3.5 text-neutral-600" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reencarnado@yugen.com"
                className="w-full bg-black/80 border border-neutral-800 pl-9 pr-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:outline-none focus:border-amber-500/70 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-amber-600 uppercase tracking-[0.2em]">Clave de Encriptación</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-neutral-600" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/80 border border-neutral-800 pl-9 pr-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:outline-none focus:border-amber-500/70 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-neutral-50 font-bold py-3 text-xs uppercase tracking-[0.25em] transition-colors border border-amber-500/50 hover:border-amber-400 flex items-center justify-center gap-2"
          >
            {cargando ? (
              <span className="font-mono text-xs text-neutral-200">Procesando...</span>
            ) : esRegistro ? (
              <>
                <UserPlus className="w-4 h-4" /> Solicitar Reencarnación
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Entrar al Abismo
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-neutral-900">
          <button
            type="button"
            onClick={() => setEsRegistro(!esRegistro)}
            className="text-xs text-neutral-500 hover:text-amber-400 font-mono transition-colors"
          >
            {esRegistro
              ? "[ ¿Ya solicitaste entrada? Iniciar enlace ]"
              : "[ ¿Primera vez? Solicitar registro de Reencarnado ]"}
          </button>
        </div>

      </div>
    </main>
  );
}