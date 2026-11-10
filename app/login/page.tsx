"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LogoYugen from "../../components/LogoYugen";
import {Button, Panel, Field} from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { UserPlus, LogIn, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
          router.replace("/dm/forja");
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

  return <main className="min-h-dvh bg-canvas kr-ambient flex items-center justify-center p-4 py-8">
    <Panel className="w-full max-w-md space-y-6">
      <header className="text-center space-y-3">
        <LogoYugen size={208} preload className="mx-auto"/>
        <h1 className="font-serif text-3xl font-bold text-gold-bright">{esRegistro ? "Tu historia comienza aquí" : "Bienvenido al Nexo"}</h1>
        <p className="text-sm text-text-muted">{esRegistro ? "Solicita tu entrada al mundo de Yugen." : "Entra al dominio de Kuroi y continúa tu historia."}</p>
        <div className="kr-divider !mt-6"/>
      </header>
      {errorMsg && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/50 p-3 text-sm text-danger-text">{errorMsg}</p>}
      <form onSubmit={handleAuth} className="space-y-5">
        {esRegistro && <p className="flex gap-2 text-sm text-text-muted"><Lock size={18} className="shrink-0 text-gold"/>Tu cuenta quedará pendiente hasta que Kuroi apruebe tu acceso.</p>}
        <Field id="correo" label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="reencarnado@yugen.com"/>
        <Field id="clave" label="Contraseña" type="password" autoComplete={esRegistro?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)}/>
        <Button type="submit" className="w-full" loading={cargando} loadingText="Procesando…">{esRegistro?<><UserPlus size={18}/>Solicitar registro</>:<><LogIn size={18}/>Iniciar sesión</>}</Button>
      </form>
      <div className="border-t border-line pt-4 text-center"><Button type="button" variant="ghost" onClick={()=>setEsRegistro(!esRegistro)}>{esRegistro?'Ya tengo cuenta. Iniciar sesión':'Crear una cuenta de reencarnado'}</Button></div>
    </Panel>
  </main>;
}
