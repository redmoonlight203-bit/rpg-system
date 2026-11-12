import type {HTMLAttributes} from 'react';

export function Kintsugi({className='',...props}:HTMLAttributes<HTMLDivElement>){return <div {...props} className={`kintsugi ${className}`} aria-hidden="true"/>;}
export function Hanko({estado='aprobado'}:{estado?:'aprobado'|'victoria'|'finalizado'}){return <span className="hanko-wrap"><span className="hanko" aria-hidden="true">{estado==='victoria'?'勝':'承'}</span><span>{estado==='victoria'?'Victoria':estado==='finalizado'?'Finalizado':'Aprobado'}</span></span>;}
export function Enso({activo=false,label='Turno activo'}:{activo?:boolean;label?:string}){return <span className="enso-wrap" role="img" aria-label={label}><svg viewBox="0 0 64 64" aria-hidden="true"><circle className={`enso ${activo?'enso--dibujar':''}`} r="26" cx="32" cy="32"/></svg></span>;}
