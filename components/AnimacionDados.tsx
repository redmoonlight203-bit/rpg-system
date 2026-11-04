"use client";
import Dado3D from './Dado3D';
import '../app/ficha/jugador.css';
export type TiradaVisual={caras:number;valor:number};
export default function AnimacionDados({nombre,dados,detalle,onClose}:{nombre:string;dados:TiradaVisual[];detalle?:string;onClose:()=>void}){
 return <section className="initiative-toast battle-dice-toast" role="status" aria-live="polite" aria-label={`Tirada de ${nombre}`}><header><div><span>TIRADA DE DADOS</span><strong>{nombre}</strong></div><button type="button" aria-label="Cerrar resultado de dados" onClick={onClose}>×</button></header><div className="battle-dice-grid">{dados.map((d,i)=><Dado3D key={i} caras={d.caras} valor={d.valor} indice={Math.min(i,10)} animar/>)}</div>{detalle&&<p>{detalle}</p>}</section>;
}
