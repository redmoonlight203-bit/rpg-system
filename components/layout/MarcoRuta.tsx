'use client';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {PaginaPanel,PaginaCombate,PaginaFicha,PaginaCatalogo,PaginaListaDetalle,PaginaEditor,PaginaLectura} from './Paginas';
export default function MarcoRuta({children}:{children:ReactNode}){
 const ruta=usePathname().split('/').at(-1)||'';
 const Pagina=['combate','tablero','arena','arbol','mapas'].includes(ruta)?PaginaCombate:['personaje'].includes(ruta)?PaginaFicha:['forja','reglas','creacion'].includes(ruta)?PaginaEditor:['habilidades','equipamiento','inventario','mercado','tienda','tienda-almas','alma','logros','codex'].includes(ruta)?PaginaCatalogo:ruta==='lore'?PaginaLectura:['personajes','party','recompensas','experiencia','deudas','tiradas'].includes(ruta)?PaginaListaDetalle:PaginaPanel;
 return <Pagina>{children}</Pagina>;
}
