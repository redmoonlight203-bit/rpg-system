'use client';
import {useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {PanelLeftOpen,PanelLeftClose,LogOut} from 'lucide-react';
import LogoYugen from '../LogoYugen';
export type EnlaceRiel={href:string;nombre:string;kanji:string};
export const indices:Record<string,string>={forja:'鍛',combate:'戦',reglas:'規',experiencia:'経',arbol:'樹',estilos:'典',recompensas:'賞',party:'絆',personajes:'人',personaje:'人',mercado:'市',tienda:'市','tienda-almas':'魂',deudas:'借',arena:'闘',logros:'功',alma:'魂',tiradas:'賽',habilidades:'術',equipamiento:'装',inventario:'倉',panel:'主',tablero:'盤',mapas:'図',lore:'巻',codex:'典',creacion:'創'};
export function indiceRuta(href:string){return indices[href.split('/').at(-1)||'']||'主';}
export default function Riel({enlaces,gm=false,onSalir}:{enlaces:EnlaceRiel[];gm?:boolean;onSalir:()=>void}){
 const [expandido,setExpandido]=useState(false),ruta=usePathname();
 return <aside className={`yugen-rail ${expandido?'is-expanded':''}`} aria-label={gm?'Espacio de Kuroi':'Espacio del reencarnado'}>
 <Link href={gm?'/dm/forja':'/ficha'} className="yugen-rail-brand" aria-label="Inicio de Yugen"><LogoYugen size={expandido?104:48}/>{expandido&&<span>Yugen</span>}</Link>
 <button type="button" className="yugen-rail-toggle" aria-expanded={expandido} aria-controls="yugen-rail-links" aria-label={expandido?'Contraer navegación':'Ampliar navegación'} onClick={()=>setExpandido(!expandido)}>{expandido?<PanelLeftClose size={18}/>:<PanelLeftOpen size={18}/>}</button>
 <nav id="yugen-rail-links" aria-label="Secciones de Yugen">{enlaces.map(({href,nombre,kanji})=>{const activo=ruta===href||(href.endsWith('/personajes')&&['personaje','habilidades','equipamiento','inventario'].some(p=>ruta.endsWith('/'+p)));return <Link key={href} href={href} className={activo?'is-active':''} aria-label={nombre} title={nombre} aria-current={activo?'page':undefined}><span className="yugen-rail-index" aria-hidden="true">{kanji}</span><span className="yugen-rail-label">{nombre}</span></Link>;})}</nav>
 <footer><span className="yugen-rail-role" title={gm?'Kuroi · Director de juego':'Reencarnado'}><span aria-hidden="true">{gm?'黒':'転生'}</span><small>{gm?'Kuroi':'Reencarnado'}</small></span><button type="button" onClick={onSalir} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18}/>{expandido&&<span>Cerrar sesión</span>}</button></footer>
 </aside>;
}
