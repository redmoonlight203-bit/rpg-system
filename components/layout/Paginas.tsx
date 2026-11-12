import type {HTMLAttributes,ReactNode} from 'react';
type Props=HTMLAttributes<HTMLDivElement>&{children:ReactNode};
function Pagina({tipo,className='',children,...props}:Props&{tipo:string}){return <div {...props} className={`yugen-page yugen-page--${tipo} ${className}`} data-layout={tipo}>{children}</div>;}
export function PaginaLogin(p:Props){return <Pagina {...p} tipo="entrada"/>;}
export function PaginaPanel(p:Props){return <Pagina {...p} tipo="panel"/>;}
export function PaginaCombate(p:Props){return <Pagina {...p} tipo="combate"/>;}
export function PaginaFicha(p:Props){return <Pagina {...p} tipo="ficha"/>;}
export function PaginaCatalogo(p:Props){return <Pagina {...p} tipo="catalogo"/>;}
export function PaginaListaDetalle(p:Props){return <Pagina {...p} tipo="lista"/>;}
export function PaginaEditor(p:Props){return <Pagina {...p} tipo="editor"/>;}
export function PaginaLectura(p:Props){return <Pagina {...p} tipo="lectura"/>;}
