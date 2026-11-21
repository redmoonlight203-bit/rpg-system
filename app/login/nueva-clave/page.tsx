'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { Button, Field, Panel } from '../../../components/ui';

export default function NuevaClave(){
  const [lista,setLista]=useState(false), [clave,setClave]=useState(''),[confirmar,setConfirmar]=useState('');
  const [mensaje,setMensaje]=useState('Validando el enlace…'),[ocupado,setOcupado]=useState(false);
  useEffect(()=>{
    let activa=true;
    void supabase.auth.getUser().then(({data,error})=>{
      if(activa){setLista(!!data.user&&!error);setMensaje(data.user&&!error?'':'El enlace caducó o es inválido. Solicita otro desde el inicio de sesión.');}
    });
    return ()=>{activa=false;};
  },[]);
  async function guardar(e:FormEvent){
    e.preventDefault();
    if(clave!==confirmar){setMensaje('Las contraseñas deben coincidir.');return;}
    setOcupado(true);
    try{
      const {error}=await supabase.auth.updateUser({password:clave});
      if(error)throw error;
      await supabase.auth.signOut({scope:'local'});
      setClave('');setConfirmar('');setLista(false);setMensaje('Contraseña actualizada. Ya puedes iniciar sesión.');
    }catch{setMensaje('No se pudo cambiar la contraseña. Comprueba el enlace y utiliza una clave nueva.');}
    finally{setOcupado(false);}
  }
  return <main className="mx-auto max-w-md p-6"><Panel><h1>Nueva contraseña</h1>
    <p role="status">{mensaje}</p>{lista&&<form onSubmit={guardar} className="space-y-4">
      <Field id="nueva" label="Nueva contraseña" type="password" minLength={8} required autoComplete="new-password" value={clave} onChange={e=>setClave(e.target.value)}/>
      <Field id="confirmar" label="Repite la contraseña" type="password" required autoComplete="new-password" value={confirmar} onChange={e=>setConfirmar(e.target.value)}/>
      <Button type="submit" disabled={ocupado}>Guardar contraseña</Button></form>}
    <Link href="/login">Volver al inicio de sesión</Link></Panel></main>;
}
