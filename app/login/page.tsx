"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LogoYugen from "../../components/LogoYugen";
import {PaginaLogin} from "../../components/layout/Paginas";
import {Kintsugi} from "../../components/ui/Signature";
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

  return <PaginaLogin><main className="yugen-entry">
    <section className="yugen-entry-story" aria-label="El mundo de Yugen">
      <div className="yugen-entry-wordmark">Yugen <span>El dominio de Kuroi</span></div>
      <div className="yugen-entry-title"><p>Un alma. Infinitas historias.</p><h2>Todo mundo<br/>comienza con<br/><em>una historia.</em></h2><Kintsugi/><p>Da forma a lo imposible.<br/>El siguiente capítulo te pertenece.</p></div>
      <svg className="yugen-landscape" viewBox="0 0 800 500" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1"><path d="M0 430 90 290 140 350 245 100 320 260 385 180 465 330 555 80 620 240 680 180 800 400"/><path d="m0 470 100-130 45 60 105-245 65 180 72-80 80 150 90-270 64 165 60-65 119 200M90 290l18 92m137-282-2 235m312-255-12 280M140 350l-25 80m205-170 25 140m275-160 40 170"/><path d="M0 490q190-120 360-55t440-40M0 460q180-45 340 15t460-40"/><path d="M690 0v80m0 80v80M110 0v100m0 80v65"/></g><circle cx="690" cy="120" r="28" fill="currentColor"/><circle cx="110" cy="140" r="9" fill="currentColor"/></svg>
      <span className="yugen-entry-kanji" aria-hidden="true">幽玄</span><span className="yugen-entry-foot">Crea · Explora · Trasciende</span>
    </section><section className="yugen-entry-form">
    <div className="yugen-entry-brand"><LogoYugen size={160} preload/></div>
    <span className="yugen-entry-number">01 / El Nexo</span>
    <Panel className="yugen-auth-panel w-full max-w-md space-y-6">
      <header className="space-y-3">
        <span className="yugen-auth-kicker">Tu lugar en Yugen</span>
        <h1 className="font-serif text-3xl font-bold text-gold-bright">{esRegistro ? "Tu historia comienza aquí" : "Bienvenido al Nexo"}</h1>
        <p className="text-sm text-text-muted">{esRegistro ? "Solicita tu entrada al mundo de Yugen." : "Entra al dominio de Kuroi y continúa tu historia."}</p>
        <Kintsugi className="!mt-6"/>
      </header>
      {errorMsg && <p role="alert" className="rounded-xs border border-red-400/30 bg-red-950/50 p-3 text-sm text-danger-text">{errorMsg}</p>}
      <form onSubmit={handleAuth} className="space-y-5">
        {esRegistro && <p className="flex gap-2 text-sm text-text-muted"><Lock size={18} className="shrink-0 text-gold"/>Tu cuenta quedará pendiente hasta que Kuroi apruebe tu acceso.</p>}
        <Field id="correo" label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="reencarnado@yugen.com"/>
        <Field id="clave" label="Contraseña" type="password" autoComplete={esRegistro?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)}/>
        <Button type="submit" className="w-full" loading={cargando} loadingText="Procesando…">{esRegistro?<><UserPlus size={18}/>Solicitar registro</>:<><LogIn size={18}/>Iniciar sesión</>}</Button>
      </form>
      <div className="border-t border-line pt-4 text-center"><Button type="button" variant="ghost" onClick={()=>setEsRegistro(!esRegistro)}>{esRegistro?'Ya tengo cuenta. Iniciar sesión':'Crear una cuenta de reencarnado'}</Button></div>
    </Panel>
    <p className="yugen-auth-note">Un mundo compartido, una historia que continúa.</p></section>
  </main></PaginaLogin>;
}
