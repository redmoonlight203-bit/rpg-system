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
    } catch (err: any) {
      setErrorMsg(err.message || "Error de conexión con el Abismo");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-neutral-200 flex items-center justify-center p-4 relative overflow-hidden font-serif">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-rose-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-neutral-950/90 border border-red-900/40 rounded-xl p-8 max-w-md w-full glow-blood relative z-10 space-y-6">
        
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-neutral-900 border border-red-900/60 rounded-lg text-red-500 glow-blood-sm mb-1">
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
              <Shield className="w-8 h-8 text-red-600" />
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-black text-neutral-100 tracking-widest uppercase font-mono">
              Yugen Realm
            </h1>
            <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1">
              {esRegistro ? "[ REGISTRO DE REENCARNADO ]" : "[ RITUAL DE ENTRADA ]"}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-950/90 border border-red-700 text-red-200 text-xs p-3 rounded-md text-center font-mono leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {esRegistro && (
            <div className="bg-neutral-900/80 border border-neutral-800 p-3 rounded-lg text-xs text-neutral-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-500 shrink-0" />
              <span>Toda alma nueva entra en estado <strong>Pendiente</strong> hasta ser juzgada por Kuroi.</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-neutral-400 uppercase">Correo / Alma</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3.5 text-neutral-600" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reencarnado@yugen.com"
                className="w-full bg-black/80 border border-neutral-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-800 transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-neutral-400 uppercase">Clave de Encriptación</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-neutral-600" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/80 border border-neutral-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-red-800 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-red-900 hover:bg-red-800 text-neutral-100 font-bold py-3 rounded-lg text-xs uppercase tracking-widest shadow-lg transition-all border border-red-700/50 flex items-center justify-center gap-2"
          >
            {cargando ? (
              <span className="font-mono text-xs text-neutral-300">Procesando...</span>
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

        <div className="text-center pt-3 border-t border-neutral-900">
          <button
            type="button"
            onClick={() => setEsRegistro(!esRegistro)}
            className="text-xs text-neutral-500 hover:text-red-400 font-mono transition-colors"
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