'use client';
import {useCallback,useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {Button} from './ui';
type Solicitud={solicitud:string;correo:string};

export function RecuperacionesGM(){
  const [filas,setFilas]=useState<Solicitud[]>([]),[ocupada,setOcupada]=useState(false),[aviso,setAviso]=useState('');
  const cargar=useCallback(async()=>{
    const {data,error}=await supabase.rpc('recuperaciones_pendientes');
    if(error){setAviso('No se pudieron consultar las solicitudes.');return;}
    setFilas(data||[]);
  },[]);
  useEffect(()=>{
    const inicial=window.setTimeout(cargar,0);
    window.addEventListener('focus',cargar);
    return ()=>{window.clearTimeout(inicial);window.removeEventListener('focus',cargar);};
  },[cargar]);
  async function aprobar(f:Solicitud){
    setOcupada(true);
    try{
      const reserva=await supabase.rpc('reservar_recuperacion',{p_solicitud:f.solicitud});
      if(reserva.error)throw reserva.error;
      if(!reserva.data){setAviso('La solicitud caducó o ya se está procesando.');await cargar();return;}
      const {error}=await supabase.auth.resetPasswordForEmail(reserva.data,{redirectTo:window.location.origin+'/login/nueva-clave'});
      if(error)throw error;
      const cierre=await supabase.rpc('confirmar_envio_recuperacion',{p_solicitud:f.solicitud});
      if(cierre.error){setAviso('Correo enviado. Queda pendiente registrar el envío.');return;}
      setAviso('Enlace enviado al correo registrado.');await cargar();
    }catch{setAviso('El servicio de correo no confirmó el envío. Puedes reintentar en dos minutos.');}
    finally{setOcupada(false);}
  }
  return <section className="space-y-2"><h2>Recuperación de cuentas</h2><Button onClick={cargar} variant="ghost" disabled={ocupada}>Actualizar solicitudes</Button>
    {!filas.length&&<p>No hay solicitudes pendientes.</p>}{filas.map(f=><div key={f.solicitud}>{f.correo} <Button disabled={ocupada} onClick={()=>aprobar(f)}>Restablecer contraseña</Button></div>)}
    <p role="status">{aviso}</p></section>;
}
