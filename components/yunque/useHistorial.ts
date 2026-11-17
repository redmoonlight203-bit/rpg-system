'use client';
// Historial del Yunque: deshacer y rehacer sobre el Borrador (máximo 50 pasos). Cada llamada a `confirmar` (o `hacer`)
// es un paso; las ediciones seguidas del mismo campo (teclear, la rueda de un dado) se agrupan en uno solo.
// Un cambio del borrador que no viene de aquí (abrir otra creación) vacía el historial; si solo cambia el `id`
// (el borrador se acaba de guardar), se conserva, y deshacer nunca le quita ese `id`.
import {useCallback,useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {aplicar,type Operacion} from '../../lib/yunque-operaciones';
import type {Borrador} from '../../lib/yunque-borrador';

export const MAX_PASOS=50;
const AGRUPAR_MS=1200;
/** Clave de agrupación: un único `fijar` sobre la misma ruta se funde con el paso anterior si llega enseguida. */
export const claveDe=(ops:readonly Operacion[]):string|null=>ops.length===1&&ops[0].op==='fijar'?JSON.stringify(ops[0].ruta):null;
const sinId=(b:Borrador)=>JSON.stringify({...b,id:undefined});
const conId=(b:Borrador,id:string|undefined)=>b.id===id?b:{...b,id};

export type Historial={
 hacer(o:Operacion):void;
 /** Registra como un paso el cambio `antes → despues` (ya calculado) y lo aplica. */
 confirmar(antes:Borrador,despues:Borrador,clave?:string|null):void;
 /** Devuelven el borrador restaurado (o `null` si no había nada). */
 deshacer():Borrador|null;
 rehacer():Borrador|null;
 puedeDeshacer:boolean;puedeRehacer:boolean;
};

export function useHistorial(b:Borrador,setB:Dispatch<SetStateAction<Borrador>>):Historial{
 const pasado=useRef<Borrador[]>([]),futuro=useRef<Borrador[]>([]);
 const ultimo=useRef(b);
 const marca=useRef<{clave:string;t:number}|null>(null);
 const [cuenta,setCuenta]=useState({atras:0,adelante:0});
 const contar=useCallback(()=>setCuenta(c=>c.atras===pasado.current.length&&c.adelante===futuro.current.length?c:{atras:pasado.current.length,adelante:futuro.current.length}),[]);
 useEffect(()=>{
  if(b===ultimo.current)return;
  const mismo=sinId(b)===sinId(ultimo.current);
  ultimo.current=b;
  if(mismo)return;
  pasado.current=[];futuro.current=[];marca.current=null;contar();
 },[b,contar]);
 const confirmar=useCallback((antes:Borrador,despues:Borrador,clave:string|null=null)=>{
  if(despues===antes)return;
  const ahora=Date.now(),m=marca.current;
  const agrupa=!!clave&&m?.clave===clave&&ahora-m.t<AGRUPAR_MS&&pasado.current.length>0;
  if(!agrupa)pasado.current=[...pasado.current,antes].slice(-MAX_PASOS);
  futuro.current=[];
  marca.current=clave?{clave,t:ahora}:null;
  ultimo.current=despues;setB(despues);contar();
 },[setB,contar]);
 const hacer=useCallback((o:Operacion)=>{const antes=ultimo.current;confirmar(antes,aplicar(antes,o),claveDe([o]));},[confirmar]);
 const mover=useCallback((desde:{current:Borrador[]},hacia:{current:Borrador[]})=>{
  const previo=desde.current.at(-1);if(!previo)return null;
  const actual=ultimo.current,r=conId(previo,actual.id);
  desde.current=desde.current.slice(0,-1);hacia.current=[...hacia.current,actual].slice(-MAX_PASOS);
  marca.current=null;ultimo.current=r;setB(r);contar();
  return r;
 },[setB,contar]);
 const deshacer=useCallback(()=>mover(pasado,futuro),[mover]);
 const rehacer=useCallback(()=>mover(futuro,pasado),[mover]);
 return {hacer,confirmar,deshacer,rehacer,puedeDeshacer:cuenta.atras>0,puedeRehacer:cuenta.adelante>0};
}
