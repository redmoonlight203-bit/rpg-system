"use client";
import {useTiempoReal} from "../lib/useTiempoReal";
import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import {supabase} from "../lib/supabase";
import "./tienda.css";
export type Moneda={id:string;nombre:string;simbolo:string};
type Cuenta={id:string;email:string};
export function Billetera({gm=false,cuentas=[]}:{gm?:boolean;cuentas?:Cuenta[]}){
 const [monedas,setMonedas]=useState<Moneda[]>([]),[saldos,setSaldos]=useState<{moneda_id:string;cantidad:number}[]>([]),[historial,setHistorial]=useState<{id:string;cantidad:number;moneda_id:string;motivo:string;created_at:string}[]>([]);
 const [usuario,setUsuario]=useState(""),[moneda,setMoneda]=useState(""),[cantidad,setCantidad]=useState(""),[motivo,setMotivo]=useState(""),[nombre,setNombre]=useState(""),[simbolo,setSimbolo]=useState("");
 const [error,setError]=useState(""),[aviso,setAviso]=useState(""),[ocupado,setOcupado]=useState(false);const bloqueo=useRef(false);const solicitud=useRef<{firma:string;id:string}|null>(null);
 const cargar=useCallback(async()=>{try{
  let id=usuario;if(!gm){const u=await supabase.auth.getUser();id=u.data.user?.id||"";}
  const m=await supabase.from("monedas").select("id,nombre,simbolo").order("created_at");if(m.error)throw m.error;setMonedas(m.data||[]);
  if(!id){setSaldos([]);setHistorial([]);return;}
  const [s,h]=await Promise.all([supabase.from("saldos_usuario").select("moneda_id,cantidad").eq("user_id",id),supabase.from("movimientos_moneda").select("id,cantidad,moneda_id,motivo,created_at").eq("user_id",id).order("created_at",{ascending:false}).limit(15)]);
  if(s.error||h.error)throw s.error||h.error;setSaldos(s.data||[]);setHistorial(h.data||[]);
 }catch(e){setError((e as {message:string}).message);}},[gm,usuario]);
 useTiempoReal(cargar);
 useEffect(()=>{void cargar();},[cargar]);
 async function ejecutar(e:FormEvent,accion:"crear"|"ajustar"){
  e.preventDefault();if(bloqueo.current)return;
  if(accion==="ajustar"&&(!Number.isSafeInteger(Number(cantidad))||Number(cantidad)===0)){setError("La cantidad debe ser un entero distinto de cero.");return;}
  bloqueo.current=true;setOcupado(true);setError("");setAviso("");
  try{const firma=JSON.stringify([usuario,moneda,cantidad,motivo]);if(!solicitud.current||solicitud.current.firma!==firma)solicitud.current={firma,id:crypto.randomUUID()};
   const r=await supabase.rpc("monedas_gestionar",{p_accion:accion,p_usuario:usuario||null,p_moneda:moneda||null,p_cantidad:accion==="ajustar"?Number(cantidad):null,p_motivo:motivo||null,p_nombre:nombre||null,p_simbolo:simbolo||null,p_solicitud:solicitud.current.id});if(r.error)throw r.error;
   setAviso(accion==="crear"?"Tipo de moneda creado.":"Saldo actualizado.");solicitud.current=null;if(accion==="crear"){setNombre("");setSimbolo("");}else{setCantidad("");setMotivo("");}await cargar();
  }catch(e){setError((e as {message:string}).message);}finally{bloqueo.current=false;setOcupado(false);}
 }
 return <section className="tienda billetera"><h2>{gm?"Monedas de los jugadores":"Mis monedas"}</h2><p className="tienda-note">El saldo pertenece a la cuenta y se conserva entre personajes.</p>{error&&<p role="alert" className="tienda-error">{error}</p>}{aviso&&<p role="status" className="tienda-aviso">{aviso}</p>}
 {gm&&<label>Cuenta de jugador<select value={usuario} onChange={e=>{setUsuario(e.target.value);setError("");}}><option value="">Selecciona una cuenta</option>{cuentas.map(c=><option key={c.id} value={c.id}>{c.email}</option>)}</select></label>}
 {(!gm||usuario)&&<div className="billetera-saldos">{monedas.map(m=><div key={m.id}><small>{m.nombre}</small><strong>{Number(saldos.find(s=>s.moneda_id===m.id)?.cantidad||0).toLocaleString("es-DO")} <span>{m.simbolo}</span></strong></div>)}</div>}
 {gm&&<><form onSubmit={e=>void ejecutar(e,"ajustar")} className="billetera-form"><h3>Añadir o descontar saldo</h3><label>Moneda<select required value={moneda} onChange={e=>setMoneda(e.target.value)}><option value="">Selecciona moneda</option>{monedas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label><label>Cantidad (negativa para descontar)<input required type="number" step="1" min="-1000000000000" max="1000000000000" value={cantidad} onChange={e=>setCantidad(e.target.value)}/></label><label>Motivo<input required maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Recompensa, corrección, gasto…"/></label><button disabled={ocupado||!usuario}>Aplicar movimiento</button></form>
 <details><summary>Crear otro tipo de moneda o puntos</summary><form className="billetera-form" onSubmit={e=>void ejecutar(e,"crear")}><label>Nombre<input required maxLength={60} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Cristales"/></label><label>Símbolo<input required maxLength={12} value={simbolo} onChange={e=>setSimbolo(e.target.value)} placeholder="Ej. CR"/></label><button disabled={ocupado}>Crear moneda</button></form></details></>}
 {!!historial.length&&<details><summary>Últimos movimientos</summary><div className="billetera-historial">{historial.map(h=><p key={h.id}><strong>{h.cantidad>0?"+":""}{h.cantidad} {monedas.find(m=>m.id===h.moneda_id)?.simbolo}</strong> · {h.motivo}<small>{new Date(h.created_at).toLocaleString("es-DO")}</small></p>)}</div></details>}
 </section>;
}
