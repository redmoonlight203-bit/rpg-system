'use client';
// «Tus elementos» en el Yunque: elegir uno guarda su base en `elemento` y una copia en `elemento_def`.
import Link from 'next/link';
import {Fichas} from '../yunque/Controles';
import {useGrimorioElementos} from '../../lib/useGrimorioElementos';
import {copiaElemento} from '../../lib/estados-biblioteca';
import type {DefinicionElemento} from '../../lib/elementos';

export default function FichasGrimorioElementos({actual,onElegir}:{actual?:DefinicionElemento;onElegir:(d:DefinicionElemento)=>void}){
 const {elementos}=useGrimorioElementos(false);
 if(!elementos.length)return actual?<p className="yq-nota">Variante: <b>{actual.nombre}</b> (de {actual.base.replace('_',' ')}).</p>:null;
 return <>
  <Fichas etiqueta="Tus elementos" opciones={elementos.map(e=>({valor:e.id,nombre:e.def.nombre,icono:e.def.icono}))} valor={actual?.id} onChange={id=>{const e=elementos.find(x=>x.id===id);if(e)onElegir(copiaElemento(e.def,e.color));}} tono="arcano" columnas={3}/>
  <p className="yq-nota">{actual?`${actual.nombre}: se comporta como ${actual.base.replace('_',' ')} ante inmunidades y Mojado. `:'Una variante se copia en la habilidad. '}<Link href="/dm/elementos" className="underline">Abrir el grimorio</Link></p>
 </>;
}
