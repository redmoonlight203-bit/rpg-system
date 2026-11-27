'use client';
// «Tu grimorio» dentro del Yunque: elegir un estado guardado lo COPIA en la habilidad (estado_def), que es lo
// que el motor ya ejecuta. Si el grimorio está vacío no muestra nada.
import Link from 'next/link';
import {Fichas} from '../yunque/Controles';
import {useGrimorioEstados} from '../../lib/useGrimorioEstados';
import {copiaParaHabilidad} from '../../lib/estados-biblioteca';
import {iconoEstado,type DefinicionEstado} from '../../lib/estados';

export default function FichasGrimorio({actual,onElegir}:{actual?:DefinicionEstado;onElegir:(d:DefinicionEstado)=>void}){
 const {estados}=useGrimorioEstados(false);
 if(!estados.length)return null;
 const elegido=actual&&estados.find(e=>e.id===actual.id)?.id;
 return <>
  <Fichas etiqueta="Tu grimorio" opciones={estados.map(e=>({valor:e.id,nombre:e.def.nombre,icono:iconoEstado(e.def)}))} valor={elegido} onChange={id=>{const e=estados.find(x=>x.id===id);if(e)onElegir(copiaParaHabilidad(e.def));}} tono="arcano" columnas={3}/>
  <p className="yq-nota">Se copia en la habilidad: puedes ajustarlo aquí sin tocar el original. <Link href="/dm/estados" className="underline">Abrir el grimorio</Link></p>
 </>;
}
