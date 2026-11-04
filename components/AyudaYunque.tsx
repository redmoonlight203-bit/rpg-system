"use client";
import type {ReactNode} from 'react';
import './editor-yunque.css';
export function PasoYunque({numero,titulo,ayuda,children}:{numero:string;titulo:string;ayuda?:string;children:ReactNode}){
 return <section className="yunque-paso"><header><span className="yunque-numero">{numero}</span><div><h3>{titulo}</h3>{ayuda&&<p>{ayuda}</p>}</div></header><div className="yunque-paso-cuerpo">{children}</div></section>;
}
export function ResumenYunque({titulo='Así funcionará',resumen,detalles=[]}:{titulo?:string;resumen:string;detalles?:string[]}){
 return <aside className="yunque-resumen" aria-label={titulo}><p className="yunque-eyebrow">{titulo}</p><p>{resumen}</p>{detalles.length>0&&<ul>{detalles.map((d,i)=><li key={i}>{d}</li>)}</ul>}</aside>;
}
