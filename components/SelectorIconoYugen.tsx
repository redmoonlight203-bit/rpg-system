'use client';
import {useState} from 'react';
import {ICONOS_YUGEN} from '../lib/iconos-yugen';
import IconoYugen from './IconoYugen';
import './iconos-yugen.css';
export default function SelectorIconoYugen({value,onChange,automatico='yugen',disabled=false}:{value:string;onChange:(value:string)=>void;automatico?:string;disabled?:boolean}){
 const [busqueda,setBusqueda]=useState('');
 const visibles=ICONOS_YUGEN.filter(i=>`${i.nombre} ${i.grupo}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()));
 return <div className="yi-picker"><label className="yi-search">Buscar símbolo<input disabled={disabled} value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Razas, equipo, poderes…"/></label><div className="yi-options" role="group" aria-label="Elegir icono de Yugen"><button type="button" disabled={disabled} aria-pressed={!value} onClick={()=>onChange('')}><IconoYugen id={automatico}/><span>Automático</span></button>{visibles.map(i=><button type="button" disabled={disabled} key={i.id} aria-pressed={value===i.id} onClick={()=>onChange(i.id)} title={`${i.nombre} · ${i.grupo}`}><IconoYugen id={i.id}/><span>{i.nombre}</span></button>)}</div>{!visibles.length&&<p>No hay símbolos con ese nombre.</p>}</div>;
}
